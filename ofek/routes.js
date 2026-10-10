"use strict";

/**
 * OFEK AI 4.0 HTTP API — mounted at /api/ofek. Internal research tooling:
 * every route requires `Authorization: Bearer $OFEK_ADMIN_TOKEN`; when the
 * token is not configured the whole API is disabled.
 */

const express = require("express");
const crypto = require("crypto");

const { OFEK_VERSION } = require("./prompt");
const { validateCard, HORIZONS } = require("./forecast-card");
const { createLedger, LedgerError } = require("./ledger");
const { pointMetrics, walkForward, baselines, compareModels } = require("./metrics");
const { evaluateSignals } = require("./signals");
const { simulateRetirement } = require("./retirement");
const { compareTracks } = require("./pension");
const { checkVideo } = require("./video-check");
const research = require("./research");

function tokenMatches(given, expected) {
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

function createOfekRouter({ ledger = createLedger(), token = process.env.OFEK_ADMIN_TOKEN, runResearch = research.runResearch } = {}) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!token) return res.status(503).json({ ok: false, error: "OFEK_ADMIN_TOKEN לא מוגדר — ה־API של אופק כבוי" });
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ") || !tokenMatches(auth.slice(7), token)) {
      return res.status(401).json({ ok: false, error: "לא מורשה" });
    }
    next();
  });

  const wrap = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      const status = err instanceof LedgerError || err.status ? err.status || 400 : 500;
      if (status >= 500) console.error("ofek:", err);
      res.status(status).json({ ok: false, error: status >= 500 && !err.status ? "שגיאה פנימית" : err.message });
    }
  };

  // Tell the caller plainly whether the record actually persisted.
  const storageNote = () =>
    ledger.persistent
      ? null
      : "אזהרה: אין מסד נתונים מחובר (DATABASE_URL) — הרשומה נשמרה בזיכרון בלבד ותימחק באתחול. אין לראות בה תיעוד קבוע.";

  router.get("/status", wrap(async (_req, res) => {
    res.json({
      ok: true,
      version: OFEK_VERSION,
      research: { enabled: research.researchEnabled, model: research.OFEK_MODEL },
      ledger: { kind: ledger.kind, persistent: ledger.persistent, integrity: await ledger.verify() },
      horizons: Object.keys(HORIZONS),
    });
  }));

  /* ---- research ---- */
  router.post("/research", wrap(async (req, res) => {
    const { question, horizons, context } = req.body || {};
    if (!question || typeof question !== "string") return res.status(400).json({ ok: false, error: "question חובה" });
    const bad = (horizons || []).filter((h) => !HORIZONS[h]);
    if (bad.length) return res.status(400).json({ ok: false, error: `אופקים לא מוכרים: ${bad.join(", ")}` });
    res.json({ ok: true, ...(await runResearch({ question, horizons, context })) });
  }));

  /* ---- forecast cards & track record ---- */
  router.post("/forecast-card/validate", (req, res) => {
    const r = validateCard(req.body);
    res.status(r.ok ? 200 : 400).json(r);
  });

  router.post("/forecasts", wrap(async (req, res) => {
    const v = validateCard(req.body);
    if (!v.ok) return res.status(400).json(v);
    const entry = await ledger.recordForecast(v.card);
    res.status(201).json({ ok: true, entry, warnings: v.warnings, persistent: ledger.persistent, storageWarning: storageNote() });
  }));

  router.post("/forecasts/:id/revise", wrap(async (req, res) => {
    const { reason, card } = req.body || {};
    const v = validateCard(card);
    if (!v.ok) return res.status(400).json(v);
    const entry = await ledger.reviseForecast(req.params.id, v.card, reason);
    res.status(201).json({ ok: true, entry, warnings: v.warnings, persistent: ledger.persistent, storageWarning: storageNote() });
  }));

  router.post("/forecasts/:id/outcome", wrap(async (req, res) => {
    const entry = await ledger.recordOutcome(req.params.id, req.body);
    res.status(201).json({ ok: true, entry, persistent: ledger.persistent, storageWarning: storageNote() });
  }));

  router.get("/forecasts", wrap(async (req, res) => {
    res.json({ ok: true, persistent: ledger.persistent, forecasts: await ledger.list({ asset: req.query.asset }) });
  }));

  router.get("/forecasts/:id/history", wrap(async (req, res) => {
    const h = await ledger.history(req.params.id);
    if (!h) return res.status(404).json({ ok: false, error: "תחזית לא נמצאה" });
    res.json({ ok: true, history: h });
  }));

  router.get("/ledger/verify", wrap(async (_req, res) => {
    res.json({ ok: true, ...(await ledger.verify()) });
  }));

  /* ---- evaluation ---- */
  // Live track record from the ledger, grouped by model version and horizon.
  router.get("/evaluate", wrap(async (_req, res) => {
    const groups = {};
    for (const f of await ledger.list()) {
      if (!f.outcome || typeof f.card.pointForecast !== "number") continue;
      const key = `${f.card.modelVersion}|${f.card.horizon}`;
      (groups[key] ||= []).push({
        forecast: f.card.pointForecast,
        actual: f.outcome.realizedReturn,
        low: f.card.interval && f.card.interval.low,
        high: f.card.interval && f.card.interval.high,
        coverage: f.card.interval && f.card.interval.coverage,
      });
    }
    const results = Object.entries(groups).map(([key, pairs]) => {
      const [modelVersion, horizon] = key.split("|");
      return { modelVersion, horizon, liveMetrics: pointMetrics(pairs), naiveZeroBaseline: pointMetrics(pairs.map((p) => ({ forecast: 0, actual: p.actual }))) };
    });
    res.json({ ok: true, scope: "תקופת פעילות אמיתית (תחזיות שנרשמו מראש ותוצאות שהתממשו)", results });
  }));

  // Historical (backtest) evaluation of the reference baselines on a supplied series.
  router.post("/evaluate/walk-forward", wrap(async (req, res) => {
    const { series, minTrain = 24 } = req.body || {};
    if (!Array.isArray(series) || !series.every(Number.isFinite)) return res.status(400).json({ ok: false, error: "series: מערך תשואות" });
    const wf = walkForward(series, baselines, { minTrain });
    res.json({ ok: true, scope: "בדיקה היסטורית (backtest) — לא תקופת פעילות אמיתית", steps: wf.steps, summary: wf.summary });
  }));

  router.post("/evaluate/compare", wrap(async (req, res) => {
    const { candidate, reference, alpha } = req.body || {};
    if (!Array.isArray(candidate) || !Array.isArray(reference)) return res.status(400).json({ ok: false, error: "candidate ו־reference: מערכי {forecast, actual}" });
    res.json({ ok: true, ...compareModels(candidate, reference, { alpha }) });
  }));

  /* ---- analytics ---- */
  router.post("/signals", (req, res) => res.json({ ok: true, ...evaluateSignals(req.body && req.body.indicators) }));

  router.post("/retirement/simulate", (req, res) => {
    const r = simulateRetirement(req.body || {});
    res.status(r.ok ? 200 : 400).json(r);
  });

  router.post("/pension/compare", (req, res) => {
    const { tracks, from, to, allowMixedRisk } = req.body || {};
    const r = compareTracks(tracks, { from, to, allowMixedRisk });
    res.status(r.ok ? 200 : 400).json(r);
  });

  router.post("/video/check", (req, res) => res.json({ ok: true, ...checkVideo(req.body || {}) }));

  return router;
}

module.exports = { createOfekRouter };
