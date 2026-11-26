"use strict";

/**
 * Glue between the data connectors and ofek/track-model.js: build a full
 * analysis of ONE track (by its Capital Market Authority fund id) from
 * official monthly returns and market factors.
 */

const path = require("path");
const fs = require("fs");
const tm = require("./track-model");
const { fetchFundHistory } = require("./connectors/gemelnet");
const market = require("./connectors/market");

let baselineCache;
/** Stored research baseline (category and large-fund sensitivities). */
function loadBaseline() {
  if (baselineCache === undefined) {
    try {
      baselineCache = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "track-model-baseline.json"), "utf8"));
    } catch {
      baselineCache = null;
    }
  }
  return baselineCache;
}

/** Short listing of the baseline for the agent / API. */
function baselineSummary({ product } = {}) {
  const b = loadBaseline();
  if (!b) return { ok: false, error: "קובץ הבסיס של מודל המסלולים חסר" };
  const keep = (x) => !product || String(x.product).includes(product);
  const slim = (x) => ({ betas: x.betas, alpha: x.alpha, r2: x.r2, mae: x.accuracy ? x.accuracy.mae : null, p90AbsError: x.accuracy ? x.accuracy.p90AbsError : null, naiveMeanMae: x.accuracy ? x.accuracy.naiveMeanMae : null });
  return {
    ok: true,
    version: b.version, computedAt: b.computedAt, dataThrough: b.dataThrough, factors: b.factors, method: b.method, sources: b.sources, limitations: b.limitations,
    categories: b.categories.filter(keep).map((c) => ({ category: c.category, ...slim(c) })),
    funds: b.funds.filter(keep).map((f) => ({ fundId: f.fundId, name: f.name, product: f.product, assetsBn: f.assetsBn, ...slim(f) })),
  };
}

/**
 * Resolve the model a caller refers to: explicit { betas }, a baseline fund
 * id, or a baseline category.
 */
function resolveModel({ model, betas, alpha, fundId, category } = {}) {
  if (model && model.betas) return { model, origin: "supplied" };
  if (betas) return { model: { betas, alpha: alpha || 0 }, origin: "supplied" };
  const hit = tm.findBaselineModel(loadBaseline(), { fundId, category });
  if (!hit) throw new tm.TrackModelError("לא נמצא מודל: העבירו betas, או fundId / category הקיימים בבסיס (GET /track-model/baseline)");
  const b = loadBaseline();
  return { model: hit, origin: `baseline ${b.version} (${b.computedAt}, נתונים עד ${b.dataThrough})`, label: hit.name || hit.category };
}

/** Main categories from the baseline, for the scenario playbook. */
const MAIN_CATEGORIES = ["גמל/השתלמות · כללי", "גמל/השתלמות · מניות", "גמל/השתלמות · עד 50", "גמל/השתלמות · 60 ומעלה", "גמל/השתלמות · אשראי ואג\"ח", "ביטוח · כללי", "ביטוח · מניות", "ביטוח · עוקב S&P 500", "פנסיה מקיפה · עד 50", "פנסיה מקיפה · 60 ומעלה"];
function mainModels() {
  const b = loadBaseline();
  if (!b) return [];
  return MAIN_CATEGORIES.map((c) => b.categories.find((x) => x.category === c)).filter(Boolean).map((c) => ({ label: c.category, model: c }));
}

/**
 * Full analysis of one track.
 *   dataset: gemel | pension | insurance; fundId: CMA fund id
 *   window:  months used for the coefficients (default 60)
 *   factorRows: optional [{ period, factors }] supplied by the caller;
 *               otherwise fetched (needs OFEK_INDEX_SOURCE=globes)
 *   asOf:    optional YYYY-MM-DD for a month-to-date early estimate
 */
async function analyzeFund({ dataset, fundId, window = 60, factorRows = null, mtdFactors = null, asOf = null, splitMonths = 3, fetchImpl, env = process.env, today = new Date() } = {}) {
  if (!(Number.isInteger(window) && window >= 24 && window <= 180)) throw new tm.TrackModelError("window: בין 24 ל־180 חודשים");
  const fx = fetchImpl ? { fetchImpl } : {};
  const history = await fetchFundHistory({ dataset, fundId, ...fx });
  if (history.rows.length < 30) throw new tm.TrackModelError(`למסלול ${fundId} יש רק ${history.rows.length} חודשי נתונים — מעט מדי למודל`);
  const last = history.rows[history.rows.length - 1].period;

  let factors = factorRows;
  let monthToDate = mtdFactors ? { asOf, factors: mtdFactors, supplied: true } : null;
  let sources = ["רשות שוק ההון — data.gov.il (תשואות חודשיות רשמיות)"];
  if (!factors) {
    const want = history.rows.slice(-Math.min(history.rows.length, window + 72));
    const fetched = await market.fetchFactorHistory({ from: want[0].period, to: last, asOf, env, today, ...fx });
    factors = fetched.rows;
    if (fetched.monthToDate) monthToDate = fetched.monthToDate;
    sources = sources.concat(fetched.sources);
  } else sources.push("גורמי שוק — סופקו על ידי המשתמש");

  const byPeriod = new Map(factors.map((f) => [String(f.period), f.factors]));
  const rows = history.rows.filter((r) => byPeriod.has(r.period)).map((r) => ({ period: r.period, ret: r.ret, factors: byPeriod.get(r.period) }));
  if (rows.length < 30) throw new tm.TrackModelError(`רק ${rows.length} חודשים עם תשואה וגורמי שוק יחד — מעט מדי למודל`);

  const fit = tm.fitFactorModel(rows.slice(-window));
  let accuracy = null;
  if (rows.length >= Math.min(window, 36) + 12) {
    const wf = tm.walkForwardFit(rows, { minTrain: Math.min(window, rows.length - 12), window });
    accuracy = { n: wf.n, from: wf.from, to: wf.to, mae: wf.mae, p90AbsError: wf.p90AbsError, bias: wf.bias, naiveMeanMae: wf.naiveMeanMae, skillVsNaive: wf.skillVsNaive, recent: wf.recent.slice(-12) };
  }
  const model = { alpha: fit.alpha, betas: fit.betas, accuracy };

  let earlyEstimate = null;
  if (monthToDate && monthToDate.factors) {
    earlyEstimate = { ...tm.nowcast(model, monthToDate.factors), asOf: monthToDate.asOf || null, since: monthToDate.since || null, marketMoves: monthToDate.factors, lastObservation: monthToDate.lastObservation || null };
  }

  let depositTiming = null;
  if (history.rows.length >= 36) depositTiming = tm.depositTimingStats(history.rows.map((r) => r.ret), { splitMonths });

  return {
    ok: true,
    fund: { fundId: history.fundId, dataset, name: history.fundName, company: history.company, historyFrom: history.rows[0].period, lastOfficialMonth: last, lastOfficialReturn: history.rows[history.rows.length - 1].ret, totalAssetsMillions: history.rows[history.rows.length - 1].totalAssets },
    model: { ...fit, accuracy },
    scenarios: tm.scenarioTable(model),
    earlyEstimate,
    depositTiming,
    sources,
    notice: "המודל מסביר ומעריך את תשואת המסלול לפי תנועות השוק. אינו חוזה את כיוון השוק ואינו המלצה אישית. תשואות ברמת המסלול; חשבון הלקוח מושפע גם מדמי ניהול ומועדי הפקדה.",
  };
}

module.exports = { loadBaseline, baselineSummary, resolveModel, analyzeFund, mainModels };
