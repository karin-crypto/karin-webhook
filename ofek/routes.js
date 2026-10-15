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
const { pointMetrics, walkForward, baselines, compareModels, incrementalValueTest } = require("./metrics");
const { evaluateSignals } = require("./signals");
const { readSentiment } = require("./sentiment");
const { simulateRetirement } = require("./retirement");
const { compareTracks } = require("./pension");
const { checkVideo } = require("./video-check");
const { runQualityGate } = require("./quality-gate");
const { createIndicatorRegistry } = require("./indicators");
const { createReportAnalyzer } = require("./reports");
const { recordsToTracks, parseCsv, fetchCkan } = require("./connectors/gemelnet");
const { buildDcf, buildComps } = require("./valuation");
const research = require("./research");

function tokenMatches(given, expected) {
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

function createOfekRouter({ ledger = createLedger(), token = process.env.OFEK_ADMIN_TOKEN, runResearch = research.runResearch, reportClient, fetchImpl } = {}) {
  const router = express.Router();
  const registry = createIndicatorRegistry(ledger);
  const reports = createReportAnalyzer(ledger, reportClient === undefined ? {} : { client: reportClient });

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
      research: { enabled: research.researchEnabled, model: research.OFEK_MODEL, dataSources: research.dataSources, dataSourceErrors: research.dataSourceErrors },
      reports: { enabled: reports.enabled },
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

  // Module 9.6 §3: does a sentiment indicator add out-of-sample value?
  router.post("/evaluate/sentiment", wrap(async (req, res) => {
    const { returns, indicator, regimes, lag, minTrain, testsConducted, blockSize } = req.body || {};
    const nums = (a) => Array.isArray(a) && a.every(Number.isFinite);
    if (!nums(returns) || !nums(indicator)) return res.status(400).json({ ok: false, error: "returns ו־indicator: מערכי מספרים" });
    try {
      res.json({ ok: true, ...incrementalValueTest(returns, indicator, { regimes, lag, minTrain, testsConducted, blockSize }) });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  }));

  /* ---- analytics ---- */
  // Module 9.6: say / do / price sentiment reading; optionally logged (9.6.11).
  router.post("/sentiment/read", wrap(async (req, res) => {
    const { record, ...input } = req.body || {};
    const r = readSentiment(input);
    if (!r.ok) return res.status(400).json(r);

    // Annotate each indicator with its registry status (9.6.1). Only active
    // indicators may carry predictive weight; the reading itself still runs.
    const registered = await registry.list();
    if (registered.length) {
      const warnings = [];
      for (const row of r.indicators) {
        const reg = registered.find((x) => x.card.name === row.name && (!row.market || x.card.market === row.market));
        row.registryStatus = reg ? reg.status : "unregistered";
        row.predictiveWeightAllowed = !!reg && reg.status === "active";
        if (!reg) warnings.push(`${row.name}: לא רשום במרשם האינדיקטורים`);
        else if (reg.status === "suspended") warnings.push(`${row.name}: מושעה — אין להסתמך עליו`);
      }
      r.registryWarnings = warnings;
    }

    if (!record) return res.json(r);
    const entry = await ledger.recordSentimentReading(r, record);
    res.status(201).json({
      ...r,
      entry,
      persistent: ledger.persistent,
      storageWarning: storageNote(),
      // 9.6.11: without a connected log, hand back a record for manual filing.
      manualRecord: ledger.persistent ? null : entry,
    });
  }));

  router.get("/sentiment/readings", wrap(async (_req, res) => {
    res.json({ ok: true, persistent: ledger.persistent, readings: await ledger.listSentimentReadings() });
  }));

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

  /* ---- Module 9.6: indicator registry & lifecycle ---- */
  router.get("/indicators", wrap(async (_req, res) => {
    res.json({ ok: true, persistent: ledger.persistent, indicators: await registry.list() });
  }));

  router.post("/indicators", wrap(async (req, res) => {
    const { card, approval } = req.body || {};
    const entry = await registry.register(card, approval);
    res.status(201).json({ ok: true, entry, persistent: ledger.persistent, storageWarning: storageNote() });
  }));

  router.post("/indicators/:id/card", wrap(async (req, res) => {
    const { card, reason, approval } = req.body || {};
    const entry = await registry.updateCard(req.params.id, card, reason, approval);
    res.status(201).json({ ok: true, entry, persistent: ledger.persistent, storageWarning: storageNote() });
  }));

  router.get("/indicators/:id", wrap(async (req, res) => {
    const ind = await registry.get(req.params.id);
    if (!ind) return res.status(404).json({ ok: false, error: "אינדיקטור לא נמצא" });
    res.json({ ok: true, indicator: ind, experiments: await registry.experiments(req.params.id) });
  }));

  // Run the 9.6.6 test and log it as an experiment in one step.
  router.post("/indicators/:id/experiments", wrap(async (req, res) => {
    const { preRegistration, returns, indicator, regimes, lag, minTrain, testsConducted, blockSize } = req.body || {};
    const nums = (a) => Array.isArray(a) && a.every(Number.isFinite);
    if (!nums(returns) || !nums(indicator)) return res.status(400).json({ ok: false, error: "returns ו־indicator: מערכי מספרים" });
    if (!Number.isInteger(testsConducted) || testsConducted < 1) return res.status(400).json({ ok: false, error: "testsConducted: מספר הבדיקות שבוצעו בפועל (כולל זו)" });
    let result;
    try {
      result = incrementalValueTest(returns, indicator, { regimes, lag, minTrain, testsConducted, blockSize });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    const entry = await registry.recordExperiment(req.params.id, { preRegistration, testsConducted, result });
    res.status(201).json({ ok: true, result, entry, persistent: ledger.persistent, storageWarning: storageNote() });
  }));

  router.post("/indicators/:id/status", wrap(async (req, res) => {
    const entry = await registry.transition(req.params.id, req.body || {});
    res.status(201).json({ ok: true, entry, indicator: await registry.get(req.params.id), persistent: ledger.persistent, storageWarning: storageNote() });
  }));

  /* ---- licensed data sources (MCP connector) ---- */
  router.get("/sources", (_req, res) => {
    res.json({ ok: true, sources: research.dataSources, errors: research.dataSourceErrors, webSearch: true });
  });

  /* ---- Israeli pension data import (Gemel-Net / Pension-Net) ---- */
  router.post("/pension/import", wrap(async (req, res) => {
    const b = req.body || {};
    let records;
    let fetched = null;
    if (b.source === "records") records = b.records;
    else if (b.source === "csv") records = parseCsv(b.csv || "");
    else if (b.source === "ckan") {
      fetched = await fetchCkan({
        resourceId: b.resourceId || process.env.GEMELNET_RESOURCE_ID, filters: b.filters, q: b.q, maxRows: b.maxRows,
        ...(fetchImpl ? { fetchImpl } : {}),
      });
      records = fetched.records;
    } else return res.status(400).json({ ok: false, error: "source: records | csv | ckan" });
    if (!Array.isArray(records) || !records.length) return res.status(400).json({ ok: false, error: "לא התקבלו רשומות" });

    let out;
    try {
      out = recordsToTracks(records, { mapping: b.mapping, unit: b.unit, returnsBasis: b.returnsBasis, source: b.sourceLabel, asOf: b.asOf });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    let comparison = null;
    if (b.compare) {
      const ids = new Set((b.compare.fundIds || []).map(String));
      const chosen = ids.size ? out.tracks.filter((t) => ids.has(String(t.fundId))) : out.tracks;
      comparison = compareTracks(chosen, b.compare);
    }
    res.json({
      ok: true, records: records.length, truncated: fetched ? fetched.truncated : false,
      tracks: out.tracks, skipped: out.skipped, warnings: out.warnings, comparison,
      notice: "מיפוי העמודות ברירת המחדל לא אומת מול ייצוא חי — בדקו את הקופה הראשונה מול האתר לפני שימוש.",
    });
  }));

  /* ---- report analyzer ---- */
  router.post("/reports/analyze", wrap(async (req, res) => {
    const r = await reports.analyze(req.body || {});
    res.status(r.recorded ? 201 : 200).json({ ok: true, ...r, persistent: ledger.persistent, storageWarning: r.recorded ? storageNote() : null });
  }));

  router.post("/reports/:id/review", wrap(async (req, res) => {
    const entry = await reports.review(req.params.id, req.body || {});
    res.status(201).json({ ok: true, entry, persistent: ledger.persistent, storageWarning: storageNote() });
  }));

  router.get("/reports", wrap(async (req, res) => {
    res.json({ ok: true, persistent: ledger.persistent, reports: await reports.list(req.query.entity) });
  }));

  /* ---- model builder ---- */
  router.post("/models/dcf", (req, res) => {
    const r = buildDcf(req.body || {});
    res.status(r.ok ? 200 : 400).json(r);
  });

  router.post("/models/comps", (req, res) => {
    const r = buildComps(req.body || {});
    res.status(r.ok ? 200 : 400).json(r);
  });

  /* ---- OFEK QUALITY GATE (9.6.13) ---- */
  router.post("/quality-gate", wrap(async (req, res) => {
    const known = new Set((await ledger.list()).map((f) => f.id));
    const r = runQualityGate(req.body || {}, { knownForecastIds: known });
    res.status(r.ok ? 200 : 400).json(r);
  }));

  router.post("/video/check", (req, res) => res.json({ ok: true, ...checkVideo(req.body || {}) }));

  return router;
}

module.exports = { createOfekRouter };
