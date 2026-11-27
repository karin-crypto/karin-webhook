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
const explain = require("./track-explain");
const forecastEngine = require("./track-forecast");

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

let fundsCache;
/** Sensitivities for every active track (compact file, ~1,260 tracks). */
function loadFunds() {
  if (fundsCache === undefined) {
    try {
      fundsCache = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "track-model-funds.json"), "utf8"));
    } catch {
      fundsCache = null;
    }
  }
  return fundsCache;
}

const DATASET_HE = { gemel: "גמל / השתלמות", pension: "פנסיה", insurance: "פוליסות ביטוח" };

/** Compact fund entry -> the model shape track-model.js works with. */
function fundToModel(f, file) {
  if (!f.basis) return null;
  return {
    kind: "fund", fundId: f.id, dataset: f.ds, name: f.name, product: f.product, category: f.cat || null,
    alpha: f.a,
    betas: Object.fromEntries(file.factorOrder.map((n, i) => [n, f.b[i]])),
    r2: f.r2 == null ? null : f.r2,
    residualSd: f.s == null ? null : f.s,
    averageFee: f.fee == null ? null : f.fee, averageDepositFee: f.depFee == null ? null : f.depFee,
    equityPct: f.eqPct == null ? null : f.eqPct,
    basis: f.basis, basisNote: file.basisNote[f.basis],
    quality: f.q === "low" ? "low" : f.q === "low_own_fit" ? "category_substitute" : "ok",
    qualityNote: f.q === "low" ? "המודל של המסלול אינו יציב (התאמה חלשה או מקדמים לא סבירים, לרוב בגלל שינוי באופי המסלול) ואין סוג מסלול מתאים להישען עליו — יש להתייחס לתוצאות בזהירות רבה." : f.q === "low_own_fit" ? "המודל של המסלול עצמו אינו יציב, ולכן נעשה שימוש במקדמי סוג המסלול." : null,
    accuracy: f.p90 == null ? null : { mae: f.mae == null ? null : f.mae, p90AbsError: f.p90, naiveMeanMae: f.naive == null ? null : f.naive, n: f.accN || null, basis: f.p90Basis || "walk-forward, חלון מתגלגל של 60 חודשים" },
  };
}

/** Search tracks by name words, id, dataset. Largest first. */
function searchFunds({ q = "", dataset, limit = 20 } = {}) {
  const file = loadFunds();
  if (!file) return { ok: false, error: "קובץ המסלולים חסר" };
  const terms = String(q).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits = file.funds.filter((f) => {
    if (dataset && f.ds !== dataset) return false;
    if (!terms.length) return true;
    const hay = `${f.id} ${f.name} ${f.product} ${f.catLabel || ""}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
  return {
    ok: true, total: hits.length, dataThrough: file.dataThrough,
    funds: hits.slice(0, Math.max(1, Math.min(Number(limit) || 20, 100))).map((f) => ({
      fundId: f.id, dataset: f.ds, datasetLabel: DATASET_HE[f.ds], name: f.name, product: f.product, category: f.catLabel || null,
      assetsMillions: f.aum, equityPct: f.eqPct == null ? null : f.eqPct, fxPct: f.fxPct == null ? null : f.fxPct,
      averageFee: f.fee == null ? null : f.fee, averageDepositFee: f.depFee == null ? null : f.depFee,
      historyMonths: f.n, hasModel: !!f.basis, modelBasis: (f.basis ? file.basisNote[f.basis] : "אין מספיק נתונים למודל") + (f.q === "low" ? " · מודל לא יציב — לקרוא בזהירות" : f.q === "low_own_fit" ? " · המודל של המסלול אינו יציב, נעשה שימוש בסוג המסלול" : ""),
      modelQuality: f.q === "low" ? "low" : f.q === "low_own_fit" ? "category_substitute" : "ok", mae: f.mae == null ? null : f.mae,
    })),
  };
}

function findFundModel({ fundId, dataset } = {}) {
  const file = loadFunds();
  if (!file || fundId == null) return null;
  const hits = file.funds.filter((f) => String(f.id) === String(fundId) && (!dataset || f.ds === dataset));
  if (!hits.length) return null;
  if (hits.length > 1) throw new tm.TrackModelError(`מספר ${fundId} קיים ביותר ממאגר אחד (${hits.map((h) => h.ds).join(", ")}) — ציינו dataset`);
  const m = fundToModel(hits[0], file);
  if (!m) throw new tm.TrackModelError(`למסלול ${hits[0].name} אין מספיק נתונים למודל`);
  return { model: m, file };
}

/**
 * Resolve the model a caller refers to: explicit { betas }, a fund id
 * (any active track), or a baseline category.
 */
function resolveModel({ model, betas, alpha, fundId, dataset, category } = {}) {
  if (model && model.betas) return { model, origin: "supplied" };
  if (betas) return { model: { betas, alpha: alpha || 0 }, origin: "supplied" };
  const fund = findFundModel({ fundId, dataset });
  if (fund) return { model: fund.model, origin: `baseline ${fund.file.version} (${fund.file.computedAt}, נתונים עד ${fund.file.dataThrough})`, label: fund.model.name };
  const hit = tm.findBaselineModel(loadBaseline(), { fundId, category });
  if (!hit) throw new tm.TrackModelError("לא נמצא מודל: העבירו betas, או fundId / category קיימים (GET /track-model/funds?q=…, GET /track-model/baseline)");
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

// Rough size of an ordinary monthly move per factor (percent) — judgmental, used only to compare directions.
const TYPICAL_MOVE = { ta125: 4, spx: 4, usd: 2, gov: 1, corp: 1 };

/** How unusual a monthly figure is, against the category's own history. */
function unusualLevel(value, dist, range = null) {
  if (!dist) return { level: "unknown", he: "אין היסטוריה להשוואה" };
  if (value < 0 && range && range.high >= 0) return { level: "within_noise", he: "ירידה קלה, בתוך טווח הטעות של האומדן" };
  if (value <= dist.q05) return { level: "very_unusual", he: "ירידה חריגה מאוד (חודש כזה קורה בערך פעם ב-20 חודשים)" };
  if (value <= dist.q10) return { level: "unusual", he: "ירידה חריגה (בערך פעם ב-10 חודשים)" };
  if (value < 0 && value <= dist.q25) return { level: "weak", he: "חודש חלש (בערך אחד מכל ארבעה חודשים)" };
  if (value < 0) return { level: "slightly_negative", he: "ירידה קלה, בטווח הרגיל" };
  return { level: "normal", he: "בטווח הרגיל" };
}

/**
 * Daily watch: where every main track type stands this month, how unusual
 * that is, which market environment is unfolding and which playbook
 * scenarios it resembles. `factors` = month-to-date market moves (percent).
 */
function marketWatch({ factors, asOf, elapsedShare = 1, since = null, lastObservation = null } = {}) {
  const b = loadBaseline();
  if (!b) throw new tm.TrackModelError("קובץ הבסיס של מודל המסלולים חסר");
  const environment = explain.classifyEnvironment(factors);
  const factorHistory = loadFactorHistory();
  const rows = b.categories.map((c) => {
    const n = tm.nowcast(c, factors, { elapsedShare, history: factorHistory });
    const u = unusualLevel(n.estimate, c.monthlyDistribution, n.range);
    return { category: c.category, estimate: n.estimate, range: n.range, negativeMonthProbability: n.negativeMonth ? n.negativeMonth.probability : null, declineOver1Probability: n.negativeMonth ? n.negativeMonth.declineOver1Probability : null, level: u.level, levelText: u.he, shortHistory: !!c.shortHistory, contributions: n.contributions };
  }).sort((x, y) => x.estimate - y.estimate);
  const order = ["very_unusual", "unusual", "weak", "slightly_negative", "within_noise", "normal", "unknown"];
  const main = rows.filter((r) => MAIN_CATEGORIES.includes(r.category));
  const worst = main.reduce((w, r) => (order.indexOf(r.level) < order.indexOf(w) ? r.level : w), "normal");
  // closest named scenarios: direction of the moves (each scaled by a typical monthly move) vs the scenario's shocks
  const scaled = (v) => tm.FACTOR_NAMES.map((f) => (v[f] || 0) / TYPICAL_MOVE[f]);
  const fv = scaled(factors);
  const norm = (a) => Math.sqrt(a.reduce((t, x) => t + x * x, 0));
  const quiet = Math.max(...fv.map(Math.abs)) < 0.75;
  const matching = quiet ? [] : Object.entries(tm.SCENARIOS)
    .map(([key, sc]) => {
      const sv = scaled(sc.shocks);
      return { scenario: key, description: sc.he, similarity: Number((fv.reduce((t, x, i) => t + x * sv[i], 0) / (norm(fv) * norm(sv))).toFixed(2)), talkingPoints: explain.PLAYBOOK_TEXT[key].talking };
    })
    .filter((m) => m.similarity >= 0.6)
    .sort((x, y) => y.similarity - x.similarity)
    .slice(0, 2);
  const general = rows.find((r) => r.category === "גמל/השתלמות · כללי");
  // Two-level early warning on the general track: the chance of a monthly fall of more than 1%.
  // Past record on general tracks (33 such months out of 230, 2017–2026): at 30% or more the
  // warning caught 52% of them by day 15 and 79% by day 22, with 61% and 81% of warnings right;
  // at 50% or more it caught 58% by day 22 and 76% by day 27, with about 9 in 10 right.
  const p1 = general ? general.declineOver1Probability : null;
  const warnLevel = p1 == null ? "unknown" : p1 >= 0.5 ? "alert" : p1 >= 0.3 ? "watch" : "none";
  const earlyWarning = {
    level: warnLevel,
    probability: p1,
    text: warnLevel === "alert" ? `התרעה: סיכוי של ${Math.round(p1 * 100)}% שהמסלול הכללי יסיים את החודש בירידה של יותר מ-1%. בעבר 8 עד 9 מכל 10 התרעות כאלה התממשו.`
      : warnLevel === "watch" ? `למעקב: סיכוי של ${Math.round(p1 * 100)}% שהמסלול הכללי יסיים את החודש בירידה של יותר מ-1%. בעבר 6 עד 8 מכל 10 סימנים כאלה התממשו, תלוי כמה מהחודש כבר עבר.`
        : warnLevel === "none" ? "אין כרגע סימן לירידה חודשית של יותר מ-1% במסלול הכללי." : "אין נתונים למדד ההתרעה.",
    note: "מדד מחקרי לחודש הנוכחי בלבד. אינו חוזה את החודש הבא, ואינו בסיס לפנייה ללקוחות בלי בדיקה ואישור של קארין.",
  };
  return {
    ok: true,
    asOf, since, lastObservation, partialMonth: elapsedShare < 1,
    earlyWarning,
    marketMoves: factors,
    environment,
    alert: { level: worst, attention: ["very_unusual", "unusual"].includes(worst), text: !["very_unusual", "unusual"].includes(worst) ? "אין כרגע חריגה שמצדיקה פנייה יזומה למבוטחים." : "יש סוגי מסלולים עם ירידה חריגה החודש — כדאי להכין הסבר למבוטחים." },
    matchingScenarios: matching,
    categories: rows,
    generalTrackExplanation: general ? explain.explainMonth({ model: b.categories.find((c) => c.category === general.category), factors, partial: elapsedShare < 1, asOf, history: factorHistory, trackLabel: "המסלול הכללי", elapsedShare }) : null,
    note: "אומדנים מוקדמים לפי תנועות השוק — לא תשואות רשמיות. רמת החריגות נמדדת מול החודשים ההיסטוריים של אותו סוג מסלול. פנייה למבוטחים — רק באישור קארין.",
  };
}

/** Share of the calendar month that has passed on a YYYY-MM-DD date. */
function monthShare(asOf) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(asOf || ""))) return 1;
  const [y, m, d] = asOf.split("-").map(Number);
  return Math.min(1, d / new Date(Date.UTC(y, m, 0)).getUTCDate());
}

/** Daily watch with market data fetched automatically (needs the index source). */
async function fetchMarketWatch({ asOf, fetchImpl, env = process.env, today = new Date() } = {}) {
  const b = loadBaseline();
  if (!b) throw new tm.TrackModelError("קובץ הבסיס של מודל המסלולים חסר");
  const date = asOf || market.israelDate(today);
  // the month before the as-of month is the last complete one
  const [y, m] = date.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}12` : `${y}${String(m - 1).padStart(2, "0")}`;
  const fetched = await market.fetchFactorHistory({ from: prev, to: prev, asOf: date, env, today, ...(fetchImpl ? { fetchImpl } : {}) });
  const w = marketWatch({ factors: fetched.monthToDate.factors, asOf: date, elapsedShare: monthShare(date), since: fetched.monthToDate.since, lastObservation: fetched.monthToDate.lastObservation });
  return { ...w, sources: fetched.sources, modelDataThrough: b.dataThrough };
}

let factorHistoryCache;
function loadFactorHistory() {
  if (factorHistoryCache === undefined) {
    try {
      factorHistoryCache = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "factor-history.json"), "utf8"));
    } catch {
      factorHistoryCache = null;
    }
  }
  return factorHistoryCache;
}
function valuationSnapshot() {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "valuation-snapshot.json"), "utf8"));
    return Number.isFinite(v.cape) ? v : null;
  } catch {
    return null;
  }
}
function yieldSnapshot() {
  try {
    return { ...JSON.parse(fs.readFileSync(path.join(__dirname, "data", "yield-snapshot.json"), "utf8")), live: false };
  } catch {
    return null;
  }
}

/** Standard error of an early estimate, from the model's tested error band. */
function estimateErrorSd(model) {
  if (model.accuracy && Number.isFinite(model.accuracy.p90AbsError)) return model.accuracy.p90AbsError / 1.645;
  if (Number.isFinite(model.residualSd)) return model.residualSd;
  return 0.5;
}

const MONTH_NAMES = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

/** Year-end projection with a one-sentence Hebrew summary. */
function yearEndFor(historyRows, estimates, trackLabel = "המסלול", today = new Date()) {
  if (historyRows.length < 36) return null;
  // a track whose official figures stopped more than four months ago is not projected
  const lastPeriod = String(historyRows[historyRows.length - 1].period);
  const monthsBehind = (today.getUTCFullYear() - Number(lastPeriod.slice(0, 4))) * 12 + (today.getUTCMonth() + 1 - Number(lastPeriod.slice(4)));
  if (monthsBehind > 4) return null;
  const y = tm.yearEndProjection(historyRows, { estimates });
  const num = (v) => (v < 0 ? `מינוס ${Math.abs(v)}%` : `${v}%`);
  const month = (p) => MONTH_NAMES[Number(p.slice(4)) - 1];
  let text;
  if (y.complete) text = `${trackLabel} סיים את ${y.year} בתשואה רשמית של ${num(y.central)}.`;
  else {
    const parts = [];
    if (y.officialThrough) parts.push(`תשואה רשמית מתחילת ${y.year} עד סוף ${month(y.officialThrough)}: ${num(y.officialYearToDate)}`);
    if (y.estimatedMonths.length) parts.push(y.estimatedMonths.map((e) => `אומדן ל${month(e.period)}${e.partial ? " (עד כה)" : ""}: ${num(e.estimate)}`).join(", "));
    text = `${parts.join(". ")}. הערכה לסיום ${y.year}: בסביבות ${num(y.central)}, בטווח סביר של ${num(y.range.low)} עד ${num(y.range.high)}${y.averagedMonths ? ` (${y.averagedMonths === 1 ? "חודש אחד חושב" : y.averagedMonths + " חודשים חושבו"} לפי הממוצע הרב-שנתי של המסלול, כי ${y.averagedMonths === 1 ? "אין עליו" : "אין עליהם"} עדיין נתון)` : ""}. הערכה מחקרית, אינה תשואה מובטחת.`;
  }
  return { ...y, text };
}

/**
 * What followed past declines of the track: at 1% and 3% below the peak, and
 * at the track's current depth when it is at least 1% down.
 */
function declineSummary(returns, currentDepth = 0) {
  const depths = [1, 3];
  if (currentDepth >= 1 && currentDepth < 99 && !depths.includes(Number(currentDepth.toFixed(1)))) depths.push(Number(currentDepth.toFixed(1)));
  return depths.sort((x, y) => x - y).map((depth) => ({ ...tm.declineOutlook(returns, { depth }), isCurrentDepth: currentDepth >= 1 && depth === Number(currentDepth.toFixed(1)) }));
}

/**
 * How far a forecast can be trusted, in plain words. The grades follow the
 * backtest on 70 individual tracks (mean absolute error, points a year):
 * bond-like 0.3–0.8 at 3–5 years; mixed 2.1–3.8 at 3 years and 1.7–3.7 at
 * 5 years; equity about 6 at 3 years (few tracks). An unstable or borrowed
 * model lowers the grade.
 */
function forecastReliability(model, forecast, { shortType = false } = {}) {
  const eq = forecast.inputs.equitySensitivity;
  const reasons = [];
  let grade;
  if (model.quality === "low" || forecast.inputs.centreBounded) {
    grade = "very_low";
    reasons.push(model.quality === "low" ? "המודל של המסלול אינו יציב" : "מרכז התחזית הוגבל לטווח סביר");
  } else if (forecast.inputs.bondLike === true || (forecast.inputs.bondLike == null && eq < 0.15)) {
    grade = "high";
    reasons.push("מסלול אג\"ח או כספי: תשואת האג\"ח ההתחלתית חוזה היטב את התשואה ל-3 עד 5 שנים (טעות ממוצעת של 0.3 עד 0.8 נקודות אחוז לשנה בבדיקה על מסלולים בודדים)");
  } else if (eq >= 0.6) {
    grade = "low";
    reasons.push("מסלול עתיר מניות: אין מנבא אמין לתשואת מניות. הטעות הממוצעת בבדיקה הייתה כ-6 נקודות אחוז לשנה ל-3 שנים, על מעט מסלולים");
  } else {
    grade = "medium";
    reasons.push("מסלול מעורב: הטעות הממוצעת בבדיקה הייתה 2 עד 4 נקודות אחוז לשנה ל-3 שנים ו-1.7 עד 3.7 ל-5 שנים, ורוב הטעויות היו תחזית נמוכה מהתוצאה");
  }
  const borrowed = model.basis && model.basis !== "own";
  if (borrowed && grade !== "very_low") {
    reasons.push(`המודל נשען על בסיס חלקי (${model.basisNote})`);
    grade = grade === "high" ? "medium" : "low";
  }
  if (shortType && grade !== "very_low") {
    reasons.push("סוג מסלול חדש, עם פחות מ-36 חודשי נתונים");
    if (!(borrowed)) grade = grade === "high" ? "medium" : "low";
  }
  if (forecast.inputs.alphaClamped && (grade === "medium" || grade === "high")) { grade = grade === "high" ? "medium" : "low"; reasons.push("הרכיב הלא-מוסבר של המסלול היה חריג והוגבל"); }
  const he = { high: "גבוהה", medium: "בינונית", low: "נמוכה", very_low: "נמוכה מאוד" }[grade];
  return { grade, he, reasons, note: "הדירוג מתייחס לאופק של 3 עד 5 שנים. לשנה אחת אין תחזית נקודתית אמינה לאף מסלול עם מניות." };
}

/**
 * Multi-year forecast for one track (by fund id) or a track category:
 * expected yearly return range for 1, 3, 5 and 10 years, loss probability,
 * the anchors and assumptions behind it, a plain summary, a client-message
 * draft and forecast-card drafts. Yields come live from the Bank of Israel,
 * with a dated stored snapshot as fallback (the result says which).
 */
async function forecastFund({ fundId, dataset, category, annualFee = 0, assumptions = {}, trackLabel = null, includeHistory = true, savings = null, fetchImpl, today = new Date() } = {}) {
  const history = loadFactorHistory();
  if (!history) throw new tm.TrackModelError("קובץ היסטוריית גורמי השוק חסר");
  const resolved = resolveModel({ fundId, dataset, category });
  const { origin, label } = resolved;
  let model = resolved.model;
  const base = loadBaseline();
  let cat = model.kind === "fund" && model.category && base ? base.categories.find((c) => c.category === model.category) : null;
  // New track types (fewer than 36 months of data, all from one strong market period) give an
  // implausible unexplained return of 2.5% to 5% a year, against minus 0.7% to 1.7% in every
  // type with a full history. It is not carried into a forecast: a track with its own full
  // history keeps its own figure, and otherwise none is assumed.
  const shortType = model.shortHistory === true || (cat && cat.shortHistory === true);
  let shortTypeWarning = null;
  if (shortType) {
    cat = null;
    const ownFull = model.kind === "fund" && model.basis === "own";
    // In a short fit the constant and the bond sensitivities offset each other (a large positive
    // constant against negative bond sensitivities, each with a wide error). A long-only track
    // cannot have a negative exposure to bonds, so both are neutralised together.
    let bondNote = "";
    let hadNegativeBonds = false;
    if (!ownFull) {
      // The bond part is taken from the reported equity exposure (the track's own, or the
      // median of the type's tracks): what is not in equities is assumed to be in bonds,
      // half government and half corporate, unless the fit already shows at least that much.
      let equityPct = model.kind === "fund" ? model.equityPct : null;
      if (!Number.isFinite(equityPct)) {
        const peers = loadFunds().funds.filter((f) => f.cat === model.category && Number.isFinite(f.eqPct)).map((f) => f.eqPct).sort((x, y) => x - y);
        equityPct = peers.length ? peers[Math.floor(peers.length / 2)] : null;
      }
      // never beyond what the fitted equity sensitivities leave room for (index trackers that use
      // futures report a low equity exposure while moving one-for-one with the index)
      const room = Math.max(0, 1 - (Math.max(0, model.betas.ta125) + Math.max(0, model.betas.spx)));
      const bondShare = Number.isFinite(equityPct) ? Math.min(room, Math.max(0, Math.min(1, 1 - equityPct / 100))) : 0;
      hadNegativeBonds = model.betas.gov < 0 || model.betas.corp < 0;
      let gov = Math.max(0, model.betas.gov);
      let corp = Math.max(0, model.betas.corp);
      if (bondShare >= 0.05 && gov + corp < bondShare) { gov = bondShare / 2; corp = bondShare / 2; bondNote = ` רכיב האג"ח נקבע לפי החשיפה המדווחת (${Math.round(bondShare * 100)}% שאינם במניות).`; }
      model = { ...model, alpha: 0, betas: { ...model.betas, gov, corp } };
    }
    shortTypeWarning = "סוג המסלול חדש (פחות מ-36 חודשי נתונים). " + (ownFull ? "הרכיב שאינו מוסבר בשוק נלקח מהמסלול עצמו בלבד, ולא מסוג המסלול." : "לא הונח רכיב שאינו מוסבר בשוק" + (hadNegativeBonds ? ", ורגישות שלילית לאג\"ח (שאינה אפשרית במסלול כזה) אופסה." : ".") + bondNote) + " התחזית למסלול הזה פחות מבוססת.";
  }

  let yields;
  let yieldWarning = null;
  try {
    yields = await market.fetchYieldCurve({ today, ...(fetchImpl ? { fetchImpl } : {}) });
  } catch (err) {
    yields = yieldSnapshot();
    if (!yields) throw err;
    yieldWarning = `המשיכה החיה מבנק ישראל נכשלה (${err.message}); נעשה שימוש בנתון שמור מ-${yields.asOf}.`;
  }

  const storedValuation = valuationSnapshot();
  const valuation = assumptions && assumptions.cape ? { cape: Number(assumptions.cape), asOf: null, source: "הוזן על ידי המשתמש", dividendYield: storedValuation ? storedValuation.dividendYield : undefined } : storedValuation;
  // comprehensive pension funds hold a 30% CPI-linked guaranteed share (see forecastTrack)
  const comprehensivePension = model.product === "קרן פנסיה מקיפה" || String(model.category || "").startsWith("פנסיה מקיפה");
  const snap = yieldSnapshot();
  const trailing = snap && snap.trailingInflation5y ? snap.trailingInflation5y.value : null;
  // 30% of the fund's assets, allocated 60% to pensioners' assets (so a pensioners' track holds about twice the share)
  const pensioners = /מקבלי קצבה|פנסיונרים/.test(String(model.name || ""));
  const inflationLinked = comprehensivePension && Number.isFinite(trailing) && Number.isFinite(yields.inflation) ? { share: pensioners ? 0.6 : 0.3, trailingInflation: trailing, expectedInflation: yields.inflation } : null;
  const forecast = forecastEngine.forecastTrack({ model, history, yields, assumptions, valuation, inflationLinked, categoryAlpha: cat ? cat.alpha : null, annualFee: Number(annualFee) || 0 });
  const reliability = forecastReliability(model, forecast, { shortType });
  const name = trackLabel || label || "המסלול";
  // Official returns are gross of management fees, so the same forecast is also
  // shown after the track's average fee (when the caller gave no fee of their own).
  let afterAverageFee = null;
  let netForecast = Number(annualFee) > 0 ? forecast : null; // the forecast a savings projection should stand on
  if (!(Number(annualFee) > 0) && Number.isFinite(model.averageFee) && model.averageFee > 0) {
    const net = forecastEngine.forecastTrack({ model, history, yields, assumptions, valuation, inflationLinked, categoryAlpha: cat ? cat.alpha : null, annualFee: model.averageFee });
    netForecast = net;
    afterAverageFee = {
      fee: model.averageFee, depositFee: model.averageDepositFee, central: net.central, centralReal: net.centralReal,
      horizons: net.horizons.map((h) => ({ key: h.key, label: h.label, annualized: h.annualized, lossProbability: h.lossProbability })),
      note: "אחרי דמי הניהול הממוצעים מהצבירה במסלול, לפי הדיווח לרשות שוק ההון. דמי הניהול של לקוח מסוים עשויים להיות שונים; דמי ניהול מהפקדה אינם מנוכים כאן.",
    };
  }
  const text = explain.explainForecast({ forecast, trackLabel: name, afterAverageFee, reliability });

  // optional: what an opening balance and/or a monthly deposit may grow to
  let savingsProjection = null;
  if (savings && typeof savings === "object") {
    const basis = netForecast || forecast;
    const p = forecastEngine.projectSavings(basis, {
      years: Number(savings.years), balance: Number(savings.balance) || 0, monthlyDeposit: Number(savings.monthlyDeposit) || 0,
      depositFee: savings.depositFee == null ? 0 : Number(savings.depositFee),
    });
    savingsProjection = {
      ...p,
      feeBasis: Number(annualFee) > 0 ? `אחרי דמי ניהול של ${annualFee}% מהצבירה שהוזנו` : netForecast ? `אחרי דמי הניהול הממוצעים במסלול (${model.averageFee}% מהצבירה)` : "לפני דמי ניהול (לא ידועים דמי הניהול במסלול)",
      text: `אם ${p.balance ? `יושקעו היום ${p.balance.toLocaleString("en-US")} ₪` : ""}${p.balance && p.monthlyDeposit ? " ו" : ""}${p.monthlyDeposit ? `יופקדו ${p.monthlyDeposit.toLocaleString("en-US")} ₪ בכל חודש` : ""} במשך ${p.years} שנים, הסכום הצפוי בסוף התקופה הוא בסביבות ${p.finalBalance.central.toLocaleString("en-US")} ₪, בטווח סביר של ${p.finalBalance.low.toLocaleString("en-US")} עד ${p.finalBalance.high.toLocaleString("en-US")} ₪ (סך ההפקדות: ${p.paidIn.toLocaleString("en-US")} ₪).`,
    };
  }

  // the track's own record, when its official history is reachable
  let ownRecord = null;
  if (includeHistory && model.kind === "fund") {
    try {
      const h = await fetchFundHistory({ dataset: model.dataset, fundId: model.fundId, ...(fetchImpl ? { fetchImpl } : {}) });
      if (h.rows.length >= 36) {
        const d = tm.depositTimingStats(h.rows.map((r) => r.ret));
        ownRecord = { from: h.rows[0].period, to: h.rows[h.rows.length - 1].period, months: h.rows.length, holding: d.holding, worstDrawdowns: d.worstDrawdowns.slice(0, 3), currentDrawdown: d.currentDrawdown, afterDeclines: declineSummary(h.rows.map((r) => r.ret), -d.currentDrawdown.depth), negativeMonthsShare: d.negativeMonthsShare, note: "מה שקרה בפועל במסלול בעבר — תיאור, לא תחזית." };
      }
    } catch { /* the forecast does not depend on it */ }
  }

  const dataAsOf = `${yields.asOf}-01`.slice(0, 10);
  const cards = {};
  for (const key of ["1y", "5y"]) cards[key] = forecastEngine.toForecastCard(forecast, { asset: `${name} — תשואה מצטברת ל-${forecast.horizons.find((x) => x.key === key).label}`, key, dataAsOf });
  return {
    track: { label: name, fundId: model.fundId || null, dataset: model.dataset || null, category: model.category || null, modelOrigin: origin, modelBasis: model.basisNote || null },
    ...forecast,
    ...text,
    reliability,
    afterAverageFee,
    savingsProjection,
    stressTests: {
      episodes: forecastEngine.stressTests(model, history).map((e) => ({ ...e, actualSameCategory: model.category && e.actualByCategory[model.category] != null ? e.actualByCategory[model.category] : null, actualGeneralTrack: e.actualByCategory["גמל/השתלמות · כללי"] })),
      note: "מה היה קורה למסלול, עם הרגישות של היום, אילו חזרו תנועות השוק של כל תקופה. לשם השוואה מוצג מה שקרה בפועל למסלול כללי חציוני. בקורונה וב-2022 המסלולים הכלליים ירדו בפועל כ-15% עד 30% יותר מהחישוב. במשבר 2008 הם ירדו בפועל 11% עד 15%, פחות ממה שהחישוב נותן היום, כי אז החזיקו פחות מניות ופחות נכסים בחו\"ל. זהו תרחיש להמחשה ולא תחזית.",
    },
    returnsBasis: "התשואות הרשמיות הן נומינליות ברוטו — לפני דמי ניהול (כך מצוין באתר פנסיה־נט של רשות שוק ההון; בגמל־נט ובביטוח־נט לפי אותה שיטת דיווח).",
    ownRecord,
    forecastCardDrafts: cards,
    warnings: [
      yieldWarning,
      shortTypeWarning,
      model.qualityNote || null,
      !model.qualityNote && model.basis && model.basis !== "own" ? `המודל של המסלול נשען על בסיס חלקי (${model.basisNote}) — התחזית פחות מבוססת.` : null,
      forecast.inputs.centreBounded ? `המודל של המסלול נתן מרכז תחזית מחוץ לטווח סביר, והוא הוגבל ל-${forecast.inputs.centreBounds.low}% עד ${forecast.inputs.centreBounds.high}% בשנה. למסלול הזה התחזית פחות אמינה.` : null,
      forecast.inputs.alphaClamped ? "הרכיב שאינו מוסבר בשוק היה חריג, ולצורך התחזית הוגבל לטווח סביר (מינוס 1.5% עד 3.5% בשנה)." : null,
    ].filter(Boolean),
    notice: "תחזית = טווח תשואה אפשרי לפי מודל והנחות מוצהרות. אינה הבטחה, אינה המלצה ואינה ייעוץ מותאם אישית. רישום התחזית ביומן ושליחה ללקוח — רק באישור קארין.",
  };
}

/**
 * This year against the same months of last year, for one track: official
 * returns, the market moves in both periods, the gap split by factor, and a
 * plain explanation with a client-message draft.
 * factorRows: optional [{ period, factors }] covering both periods;
 * otherwise fetched (needs the index source).
 */
async function yearOverYear({ dataset, fundId, factorRows = null, trackLabel = "המסלול", fetchImpl, env = process.env, today = new Date() } = {}) {
  const fx = fetchImpl ? { fetchImpl } : {};
  const history = await fetchFundHistory({ dataset, fundId, ...fx });
  if (!history.rows.length) throw new tm.TrackModelError(`לא נמצאו נתונים למסלול ${fundId}`);
  const last = history.rows[history.rows.length - 1].period;
  const year = Number(last.slice(0, 4));
  const toMonth = Number(last.slice(4));
  const periods = (y) => Array.from({ length: toMonth }, (_, i) => `${y}${String(i + 1).padStart(2, "0")}`);
  const cur = periods(year);
  const prev = periods(year - 1);
  const byPeriod = new Map(history.rows.map((r) => [r.period, r.ret]));
  const missing = [...prev, ...cur].filter((p) => !byPeriod.has(p));
  if (missing.length) throw new tm.TrackModelError(`למסלול חסרים נתונים רשמיים בחודשים: ${missing.join(", ")} — אין השוואה מלאה בין השנים`);

  let factors = factorRows;
  let pendingMonths = [];
  let monthToDate = null;
  let sources = ["רשות שוק ההון — data.gov.il (תשואות חודשיות רשמיות)"];
  if (!factors) {
    const asOf = market.israelDate(today);
    let fetched;
    try { fetched = await market.fetchFactorHistory({ from: prev[0], to: cur[cur.length - 1], asOf, env, today, ...fx }); }
    catch (e) { if (e instanceof market.MarketDataError && e.status === 409) throw e; fetched = await market.fetchFactorHistory({ from: prev[0], to: cur[cur.length - 1], env, today, ...fx }); }
    factors = fetched.rows;
    sources = sources.concat(fetched.sources);
    pendingMonths = fetched.unpublishedMonths || [];
    monthToDate = fetched.monthToDate || null;
  } else sources.push("גורמי שוק — סופקו על ידי המשתמש");
  const fmap = new Map(factors.map((f) => [String(f.period), f.factors]));
  const noFactor = [...prev, ...cur].filter((p) => !fmap.has(p));
  if (noFactor.length) throw new tm.TrackModelError(`חסרים גורמי שוק לחודשים: ${noFactor.join(", ")}`);

  const { model, origin } = resolveModel({ fundId, dataset });
  const rows = (ps) => ps.map((p) => ({ period: p, ret: byPeriod.get(p), factors: fmap.get(p) }));
  const labels = [String(year - 1), String(year)];
  const attribution = tm.attributeDifference(model, rows(prev), rows(cur), { labels });
  const compoundMove = (ps, f) => Number(((ps.reduce((acc, p) => acc * (1 + fmap.get(p)[f] / 100), 1) - 1) * 100).toFixed(2));
  const factorMoves = { [labels[0]]: {}, [labels[1]]: {} };
  for (const f of Object.keys(model.betas)) {
    factorMoves[labels[0]][f] = compoundMove(prev, f);
    factorMoves[labels[1]][f] = compoundMove(cur, f);
  }
  // where the year is heading: official months, estimated months, the rest at the long-run average
  const errorSd = estimateErrorSd(model);
  const estimates = pendingMonths.map((u) => ({ period: u.period, estimate: tm.nowcast(model, u.factors).estimate, errorSd, elapsedShare: 1 }));
  if (monthToDate && monthToDate.factors) {
    const share = monthShare(monthToDate.asOf);
    estimates.push({ period: monthToDate.period, estimate: tm.nowcast(model, monthToDate.factors, { elapsedShare: share }).estimate, errorSd, elapsedShare: share });
  }
  const yearEnd = yearEndFor(history.rows, estimates, trackLabel, today);

  return {
    fund: { fundId: history.fundId, dataset, name: history.fundName, lastOfficialMonth: last },
    model: { origin, basis: model.basisNote || null },
    yearEnd,
    ...explain.explainYearOverYear({ attribution, factorMoves, years: labels, fromMonth: 1, toMonth, trackLabel }),
    sources,
    notice: "פירוק לפי הרגישות ההיסטורית של המסלול לגורמי השוק. תשואות ברמת המסלול; חשבון הלקוח מושפע גם מדמי ניהול ומועדי הפקדה.",
  };
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

  let unpublished = []; // complete months whose official figure is not out yet
  let factors = factorRows;
  let monthToDate = mtdFactors ? { asOf, factors: mtdFactors, supplied: true } : null;
  let sources = ["רשות שוק ההון — data.gov.il (תשואות חודשיות רשמיות)"];
  if (!factors) {
    const want = history.rows.slice(-Math.min(history.rows.length, window + 72));
    const fetched = await market.fetchFactorHistory({ from: want[0].period, to: last, asOf, env, today, ...fx });
    factors = fetched.rows;
    if (fetched.monthToDate) monthToDate = fetched.monthToDate;
    unpublished = fetched.unpublishedMonths || [];
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
  const model = { alpha: fit.alpha, betas: fit.betas, accuracy, residualSd: fit.residualSd };

  let earlyEstimate = null;
  if (monthToDate && monthToDate.factors) {
    earlyEstimate = { ...tm.nowcast(model, monthToDate.factors, { elapsedShare: monthShare(monthToDate.asOf), history: loadFactorHistory() }), asOf: monthToDate.asOf || null, since: monthToDate.since || null, marketMoves: monthToDate.factors, lastObservation: monthToDate.lastObservation || null };
  }

  // each complete month without an official figure gets its own full-month estimate
  const unpublishedEstimates = unpublished.map((u) => ({ period: u.period, ...tm.nowcast(model, u.factors, { history: loadFactorHistory() }), marketMoves: u.factors }));

  let depositTiming = null;
  if (history.rows.length >= 36) depositTiming = tm.depositTimingStats(history.rows.map((r) => r.ret), { splitMonths });

  let volatilityOutlook = null;
  if (history.rows.length >= 36) volatilityOutlook = tm.riskOutlook(history.rows.map((r) => r.ret), earlyEstimate ? { currentMonthEstimate: earlyEstimate.estimate } : {});

  // where the track stands against its peak, counting months that are only estimated so far
  let declineOutlook = null;
  if (history.rows.length >= 36) {
    const official = history.rows.map((r) => r.ret);
    const estimated = [...unpublishedEstimates.map((u) => u.estimate), ...(earlyEstimate ? [earlyEstimate.estimate] : [])].filter((v) => Number.isFinite(v));
    let level = 1; let peak = 1;
    for (const v of [...official, ...estimated]) { level *= 1 + v / 100; if (level > peak) peak = level; }
    const depthNow = (1 - level / peak) * 100;
    declineOutlook = { depthNow: Number((-depthNow).toFixed(2)), includesEstimatedMonths: estimated.length, afterDeclines: declineSummary(official, depthNow) };
  }

  const errorSd = estimateErrorSd(model);
  const yearEnd = yearEndFor(history.rows, [
    ...unpublishedEstimates.map((u) => ({ period: u.period, estimate: u.estimate, errorSd, elapsedShare: 1 })),
    ...(earlyEstimate && monthToDate.asOf ? [{ period: monthToDate.period || monthToDate.asOf.replace(/-/g, "").slice(0, 6), estimate: earlyEstimate.estimate, errorSd, elapsedShare: monthShare(monthToDate.asOf) }] : []),
  ], history.fundName, today);

  return {
    ok: true,
    fund: { fundId: history.fundId, dataset, name: history.fundName, company: history.company, historyFrom: history.rows[0].period, lastOfficialMonth: last, lastOfficialReturn: history.rows[history.rows.length - 1].ret, totalAssetsMillions: history.rows[history.rows.length - 1].totalAssets },
    model: { ...fit, accuracy },
    scenarios: tm.scenarioTable(model),
    earlyEstimate,
    unpublishedMonths: unpublishedEstimates,
    depositTiming,
    volatilityOutlook,
    declineOutlook,
    yearEnd,
    sources,
    notice: "המודל מסביר ומעריך את תשואת המסלול לפי תנועות השוק. אינו חוזה את כיוון השוק ואינו המלצה אישית. תשואות ברמת המסלול; חשבון הלקוח מושפע גם מדמי ניהול ומועדי הפקדה.",
  };
}

module.exports = { loadBaseline, loadFunds, loadFactorHistory, baselineSummary, resolveModel, searchFunds, analyzeFund, yearOverYear, forecastFund, forecastReliability, mainModels, marketWatch, fetchMarketWatch, unusualLevel, monthShare };
