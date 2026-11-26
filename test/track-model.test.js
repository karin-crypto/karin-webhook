"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const tm = require("../ofek/track-model");
const service = require("../ofek/track-service");
const explain = require("../ofek/track-explain");
const fc = require("../ofek/track-forecast");
const { validateCard } = require("../ofek/forecast-card");
const market = require("../ofek/connectors/market");
const { fetchFundHistory, RESOURCES, HISTORY_RESOURCES } = require("../ofek/connectors/gemelnet");
const { createLedger, memoryBackend } = require("../ofek/ledger");
const { createToolExecutor, TOOL_DEFS } = require("../ofek/agent-tools");
const { createOfekRouter } = require("../ofek/routes");
const { mulberry32 } = require("../ofek/metrics");

const round3 = (x) => Number(x.toFixed(3));
const TRUE = { alpha: 0.1, betas: { ta125: 0.2, spx: 0.25, usd: 0.1, gov: 0.05, corp: 0.3 } };

/** Standard normal from a seeded uniform generator (Box-Muller). */
function normal(rnd) {
  return Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
}

/** Synthetic months: random factor moves, return = TRUE model + small noise. */
function synthetic(n = 120, seed = 11, noise = 0.2) {
  const rnd = mulberry32(seed);
  const rows = [];
  let y = 2015;
  let m = 1;
  for (let i = 0; i < n; i++) {
    const factors = { ta125: normal(rnd) * 4, spx: normal(rnd) * 4, usd: normal(rnd) * 2, gov: normal(rnd) * 1, corp: normal(rnd) * 1 };
    const ret = TRUE.alpha + Object.keys(TRUE.betas).reduce((s, f) => s + TRUE.betas[f] * factors[f], 0) + normal(rnd) * noise;
    rows.push({ period: `${y}${String(m).padStart(2, "0")}`, ret, factors });
    if (++m > 12) { m = 1; y++; }
  }
  return rows;
}

test("track model: OLS recovers known sensitivities and reports fit quality", () => {
  const rows = synthetic();
  const fit = tm.fitFactorModel(rows);
  assert.equal(fit.n, 120);
  assert.equal(fit.from, "201501");
  for (const f of tm.FACTOR_NAMES) assert.ok(Math.abs(fit.betas[f] - TRUE.betas[f]) < 0.06, `${f}: ${fit.betas[f]}`);
  assert.ok(Math.abs(fit.alpha - TRUE.alpha) < 0.06);
  assert.ok(fit.r2 > 0.95);
  assert.ok(fit.residualSd < 0.3);
  assert.ok(fit.standardErrors.ta125 > 0 && fit.standardErrors.ta125 < 0.02);

  assert.throws(() => tm.fitFactorModel(rows.slice(0, 10)), /לפחות/);
  // a factor with no variation cannot be separated from the intercept
  const flat = rows.map((r) => ({ ...r, factors: { ...r.factors, gov: 1 } }));
  assert.throws(() => tm.fitFactorModel(flat), /תלויים/);
  // rows with a missing factor are skipped, not guessed
  const holes = rows.map((r, i) => (i % 10 === 0 ? { ...r, factors: { ...r.factors, usd: null } } : r));
  assert.equal(tm.fitFactorModel(holes).n, 108);
});

test("track model: walk-forward never uses the future and beats the naive mean", () => {
  const rows = synthetic();
  const wf = tm.walkForwardFit(rows, { minTrain: 36 });
  assert.equal(wf.n, 84);
  assert.ok(wf.mae < 0.3 && wf.mae < wf.naiveMeanMae / 3, `mae ${wf.mae} naive ${wf.naiveMeanMae}`);
  assert.ok(wf.p90AbsError >= wf.mae);
  assert.ok(wf.skillVsNaive > 0.6);

  // changing the last month must not change any earlier prediction
  const changed = rows.map((r, i) => (i === rows.length - 1 ? { ...r, ret: 50 } : r));
  const wf2 = tm.walkForwardFit(changed, { minTrain: 36, keepErrors: 200 });
  const wf1 = tm.walkForwardFit(rows, { minTrain: 36, keepErrors: 200 });
  assert.deepEqual(wf2.recent.slice(0, -1), wf1.recent.slice(0, -1));

  const rolling = tm.walkForwardFit(rows, { minTrain: 60, window: 60 });
  assert.equal(rolling.window, 60);
  assert.equal(rolling.n, 60);
  assert.throws(() => tm.walkForwardFit(rows.slice(0, 30), { minTrain: 36 }), /לפחות/);
});

test("track model: scenarios, early estimate and their guards", () => {
  const model = { ...TRUE, accuracy: { p90AbsError: 0.7 } };
  const local = tm.scenarioImpact(model, "local_shock"); // ta125 -10, corp -2, usd +4
  assert.equal(local.impact, -2.2);
  assert.deepEqual(local.contributions, { ta125: -2, corp: -0.6, usd: 0.4 });
  assert.deepEqual(local.range, { low: -2.9, high: -1.5, basis: local.range.basis });

  const custom = tm.scenarioImpact(model, { shocks: { spx: -5, nasdaq: -9 } });
  assert.equal(custom.impact, -1.25);
  assert.deepEqual(custom.ignoredFactors, ["nasdaq"]);
  assert.throws(() => tm.scenarioImpact(model, "no_such"), /לא מוכר/);
  assert.throws(() => tm.scenarioImpact(model, "constructor"), /לא מוכר/); // inherited object keys are not scenarios
  assert.throws(() => tm.scenarioImpact({}, "local_shock"), /betas/);
  assert.equal(tm.scenarioTable(model).length, Object.keys(tm.SCENARIOS).length);

  const mtd = { ta125: -3, spx: -5, usd: 7, gov: 0.3, corp: -0.9 };
  const est = tm.nowcast(model, mtd);
  // 0.1 + (-0.6) + (-1.25) + 0.7 + 0.015 + (-0.27)
  assert.equal(est.estimate, -1.3);
  assert.deepEqual(est.range, { low: -2, high: -0.6, coverage: 0.9, method: "walk_forward_errors" });
  assert.equal(est.partialMonth, false);
  const half = tm.nowcast(model, mtd, { elapsedShare: 0.5 });
  assert.equal(half.contributions.alpha, 0.05);
  assert.equal(half.partialMonth, true);
  assert.match(est.note, /אינו תשואה רשמית/);
  assert.throws(() => tm.nowcast(model, { ta125: -3 }), /חסרים גורמים/);
  assert.throws(() => tm.nowcast(model, mtd, { elapsedShare: 0 }), /elapsedShare/);
});

test("track model: attribution adds up to the actual gap", () => {
  const rows = synthetic(48, 5, 0.1);
  const a = rows.slice(0, 10);
  const b = rows.slice(12, 22);
  const r = tm.attributeDifference(TRUE, a, b, { labels: ["2015", "2016"] });
  assert.equal(r["2015"].months, 10);
  const sum = Object.values(r.byFactor).reduce((s, v) => s + v, 0) + r.differentLength + r.unexplained;
  assert.ok(Math.abs(sum - r.gap) < 0.05, `sum ${sum} gap ${r.gap}`);
  assert.equal(r.warnings.length, 0);
  const uneven = tm.attributeDifference(TRUE, rows.slice(0, 6), rows.slice(12, 22));
  assert.match(uneven.warnings[0], /באורך זהה/);
  assert.equal(uneven.differentLength, 0.4); // 4 extra months of alpha 0.1
  assert.throws(() => tm.attributeDifference(TRUE, [], b), /שתי התקופות/);
});

test("track model: deposit-timing statistics", () => {
  // always +1%: a lump sum always wins, nothing negative, no drawdown
  const up = tm.depositTimingStats(Array(60).fill(1));
  assert.equal(up.lumpVsSplit.lumpBetterShare, 1);
  assert.equal(up.lumpVsSplit.windows, 58);
  assert.ok(Math.abs(up.lumpVsSplit.meanAdvantage - 1.02) < 0.02);
  assert.equal(up.afterNegativeMonth.n, 0);
  assert.equal(up.negativeMonthsShare, 0);
  assert.equal(up.currentDrawdown.depth, 0);
  assert.equal(up.holding.find((h) => h.months === 12).positiveShare, 1);
  assert.equal(up.holding.some((h) => h.months === 60), false); // not enough history for 60-month windows

  // a 10% fall followed by a slow recovery
  const series = [...Array(24).fill(1), -10, ...Array(11).fill(1), ...Array(12).fill(0.5)];
  const dd = tm.depositTimingStats(series);
  assert.equal(dd.worstDrawdowns[0].depth, -10);
  assert.equal(dd.worstDrawdowns[0].monthsToTrough, 1);
  assert.equal(dd.worstDrawdowns[0].recoveredAfterMonths, 12);
  assert.equal(dd.afterNegativeMonth.n, 1);
  assert.equal(dd.afterNegativeMonth.meanNextMonth, 1);
  assert.equal(dd.afterNegativeMonth.meanAbsNextMonth, 1);
  assert.equal(dd.afterNegativeMonth.moveAbove2Share, 0);
  assert.equal(dd.afterPositiveMonth.negativeShare, round3(1 / 46));
  assert.equal(dd.afterPositiveMonth.moveAbove2Share, round3(1 / 46)); // the -10% month itself
  assert.match(dd.note, /אינה המלצה אישית/);

  const falling = tm.depositTimingStats([...Array(36).fill(1), -2, -3]);
  assert.equal(falling.currentDrawdown.monthsSincePeak, 2);
  assert.ok(falling.currentDrawdown.depth < -4.9);
  assert.throws(() => tm.depositTimingStats([1, 2, 3]), /לפחות 36/);
  assert.throws(() => tm.depositTimingStats(Array(40).fill(1), { splitMonths: 1 }), /splitMonths/);
});

test("track model: volatility outlook describes history and never claims a direction", () => {
  // calm after gains, wild (both ways) after losses
  const series = [];
  for (let i = 0; i < 30; i++) series.push(1, 0.8, -1.5, i % 2 ? 3 : -3);
  const out = tm.riskOutlook(series);
  assert.equal(out.basedOn.lastMonthReturn, 3);
  assert.equal(out.state, "normal_volatility");
  assert.ok(out.afterNegativeMonth.largeMoveShare > 0.4 && out.afterPositiveMonth.largeMoveShare < 0.1);
  assert.equal(out.largeMoveRatio, null); // no large move ever followed a gain, so no ratio is quoted
  const mixed = tm.riskOutlook([...series, 1, 2.5, 1, 2.6, 1, 2.7]);
  assert.ok(mixed.largeMoveRatio > 4);
  const afterDrop = tm.riskOutlook(series, { currentMonthEstimate: -1.2 });
  assert.equal(afterDrop.state, "elevated_volatility");
  assert.equal(afterDrop.basedOn.isEarlyEstimate, true);
  assert.match(afterDrop.statement, /הכיוון אינו צפוי/);
  assert.match(afterDrop.statement, /לפי אומדן מוקדם/);
  assert.match(afterDrop.note, /אינו תחזית מאושרת/);
  assert.equal(tm.riskOutlook(Array(40).fill(1)).state, "insufficient_history"); // never a negative month
  assert.throws(() => tm.riskOutlook([1, -1]), /לפחות 36/);
});

test("track model: last month's markets do not predict independent returns", () => {
  const r = tm.predictabilityTest(synthetic(160, 3));
  assert.equal(r.verdict, "no_predictive_value");
  assert.ok(r.mae >= r.naiveMeanMae * 0.97);
  assert.match(r.conclusion, /אין בסיס/);
  assert.throws(() => tm.predictabilityTest(synthetic(40)), /לפחות/);
});

test("track model: stored baseline is complete and usable", () => {
  const b = service.loadBaseline();
  assert.ok(b && b.categories.length >= 15 && b.funds.length >= 20);
  for (const x of [...b.categories, ...b.funds]) {
    for (const f of tm.FACTOR_NAMES) assert.equal(typeof x.betas[f], "number", `${x.category || x.name} ${f}`);
    if (x.accuracy) assert.ok(x.accuracy.mae > 0 && x.accuracy.mae < x.accuracy.naiveMeanMae, `${x.category || x.name} accuracy`);
  }
  const general = b.categories.find((c) => c.category === "גמל/השתלמות · כללי");
  const equity = b.categories.find((c) => c.category === "גמל/השתלמות · מניות");
  assert.ok(equity.betas.ta125 > general.betas.ta125 && equity.betas.spx > general.betas.spx);

  const { model, origin, label } = service.resolveModel({ fundId: 50 });
  assert.match(label, /הפניקס/);
  assert.match(origin, /baseline/);
  assert.ok(tm.scenarioImpact(model, "global_selloff").impact < -2);
  assert.equal(service.resolveModel({ category: "ביטוח · כללי" }).model.kind, "category");
  assert.equal(service.resolveModel({ betas: { ta125: 1 } }).origin, "supplied");
  assert.throws(() => service.resolveModel({ fundId: 999999 }), /לא נמצא מודל/);
  // a partial category name must point at exactly one category
  assert.throws(() => service.resolveModel({ category: "כללי" }), /מתאים לכמה סוגי מסלולים/);
  assert.throws(() => service.resolveModel({ category: "מניות" }), /מתאים לכמה סוגי מסלולים/);
  assert.equal(service.resolveModel({ category: "אשראי" }).label, 'גמל/השתלמות · אשראי ואג"ח');
  assert.equal(service.resolveModel({ category: "גמל/השתלמות · מניות" }).label, "גמל/השתלמות · מניות"); // exact wins over "מניות סחיר"

  const sum = service.baselineSummary({ product: "פנסיה" });
  assert.ok(sum.categories.length >= 4 && sum.categories.every((c) => c.category.includes("פנסיה")));
  assert.equal(sum.funds.length, 0);
});

test("track explanations: drivers, offsets, environment and a client draft that follows the office rules", () => {
  const model = { ...TRUE, accuracy: { p90AbsError: 0.7 } };
  const mtd = { ta125: -3, spx: -5, usd: 7, gov: 0.3, corp: -0.9 };
  const r = explain.explainMonth({ model, factors: mtd, partial: true, asOf: "2026-11-26", trackLabel: "המסלול הכללי" });
  assert.equal(r.isEstimate, true);
  assert.equal(r.value, -1.3);
  assert.deepEqual(r.drivers.map((d) => d.factor), ["spx", "ta125", "corp"]); // largest negative contributions first
  assert.deepEqual(r.offsets.map((d) => d.factor), ["usd"]);
  assert.deepEqual(r.environment.tags.map((t) => t.tag), ["israel_equities_down", "global_equities_down", "shekel_weaker"]);
  assert.match(r.summary, /אומדן מוקדם/);
  assert.match(r.summary, /טווח סביר/);

  const d = r.clientDraft;
  assert.equal(d.status, "draft");
  assert.equal(d.requiresApproval, true);
  assert.ok(d.text.startsWith("היי"));
  assert.match(d.text, /עדיין לא הנתון הרשמי/);
  assert.match(d.text, /מתחילת החודש/);
  for (const banned of ["קארין", "קרן", "בברכה", "לכל שאלה", "רישיון", "**", "#", "\n"]) assert.equal(d.text.includes(banned), false, banned);
  assert.ok(d.text.length < 600);

  // published month: official number, no "estimate" wording, unexplained gap is called out
  const done = explain.explainMonth({ model, factors: mtd, actual: -2.4, trackLabel: "המסלול הכללי" });
  assert.equal(done.isEstimate, false);
  assert.equal(done.range, null);
  assert.match(done.summary, /נתון רשמי/);
  assert.match(done.summary, /אינו מוסבר/);
  assert.equal(/הערכה מוקדמת/.test(done.clientDraft.text), false);

  // a positive, quiet month: no "it happened before" consolation line
  const calm = explain.explainMonth({ model, factors: { ta125: 0.2, spx: 0.3, usd: 0.1, gov: 0.1, corp: 0.1 }, asOf: "2026-11-26" });
  assert.equal(calm.environment.tags[0].tag, "calm");
  assert.ok(calm.value > 0);
  assert.equal(/תנודה של חודש/.test(calm.clientDraft.text), false);
  assert.throws(() => explain.explainMonth({ model, factors: { ta125: 1 } }), /חסרים גורמים/);

  const pb = explain.scenarioPlaybook(service.mainModels());
  assert.equal(pb.length, Object.keys(tm.SCENARIOS).length);
  for (const s of pb) {
    assert.ok(s.what && s.talkingPoints && s.impacts.length >= 8, s.scenario);
  }
  const sell = pb.find((s) => s.scenario === "global_selloff");
  const impact = (label) => sell.impacts.find((i) => i.track === label).impact;
  assert.ok(impact("גמל/השתלמות · מניות") < impact("גמל/השתלמות · כללי"));
  assert.ok(impact("גמל/השתלמות · כללי") < impact("גמל/השתלמות · 60 ומעלה"));
  const weak = pb.find((s) => s.scenario === "shekel_weaker_5");
  assert.ok(weak.impacts.find((i) => i.track === "ביטוח · עוקב S&P 500").impact > 3);
});

test("all-track file: every active track is searchable and almost all have a usable model", () => {
  const file = service.loadFunds();
  assert.ok(file.funds.length >= 1200);
  const withModel = file.funds.filter((f) => f.basis);
  assert.ok(withModel.length / file.funds.length > 0.95);
  for (const f of withModel) {
    assert.equal(f.b.length, 5, f.name);
    assert.ok(f.b.every((v) => Number.isFinite(v)) && Number.isFinite(f.a), f.name);
    assert.ok(file.basisNote[f.basis], f.basis);
    assert.ok(f.p90 > 0, `${f.name}: every modelled track carries an error band`);
  }
  assert.equal(file.funds.some((f) => /1;[pP]/.test(f.name)), false); // source typo for "S&P" is repaired

  const hits = service.searchFunds({ q: "הפניקס כללי", limit: 5 });
  assert.equal(hits.funds[0].fundId, 50); // largest first
  assert.equal(hits.funds[0].dataset, "insurance");
  assert.ok(hits.funds.length <= 5 && hits.total >= hits.funds.length);
  assert.ok(service.searchFunds({ q: "מיטב השתלמות", dataset: "gemel" }).funds.every((f) => f.dataset === "gemel"));
  assert.equal(service.searchFunds({ q: "אין מסלול כזה בכלל" }).total, 0);

  // the same id can exist in two datasets: the caller must say which
  assert.throws(() => service.resolveModel({ fundId: 103 }), /ציינו dataset/);
  assert.match(service.resolveModel({ fundId: 103, dataset: "gemel" }).label, /מיטב/);
  // a track with a short history borrows from its category and says so
  const short = file.funds.find((f) => f.basis === "blend");
  const m = service.resolveModel({ fundId: short.id, dataset: short.ds }).model;
  assert.match(m.basisNote, /היסטוריה קצרה/);
  assert.ok(m.accuracy && m.accuracy.p90AbsError > 0);
  // a track with no usable data is refused, not guessed
  const none = file.funds.find((f) => !f.basis);
  assert.throws(() => service.resolveModel({ fundId: none.id, dataset: none.ds }), /אין מספיק נתונים/);
});

test("daily watch: estimates per track type, how unusual, matching scenarios, no false alarms", () => {
  const nov = service.marketWatch({ factors: { ta125: -3.34, spx: -5.24, usd: 6.93, gov: 0.33, corp: -0.86 }, asOf: "2026-11-26", elapsedShare: service.monthShare("2026-11-26") });
  assert.equal(nov.partialMonth, true);
  assert.equal(nov.alert.attention, true);
  assert.ok(nov.categories.length >= 20);
  assert.ok(nov.categories.every((c, i) => i === 0 || c.estimate >= nov.categories[i - 1].estimate)); // weakest first
  const cat = (w, name) => w.categories.find((c) => c.category === name);
  assert.ok(cat(nov, "גמל/השתלמות · מניות").estimate < cat(nov, "גמל/השתלמות · כללי").estimate);
  assert.ok(cat(nov, "ביטוח · עוקב S&P 500").estimate > 0); // the weaker shekel outweighs the fall in US stocks
  assert.equal(cat(nov, "גמל/השתלמות · אשראי ואג\"ח").level, "within_noise"); // a tiny fall is not called a weak month
  assert.ok(nov.matchingScenarios.length <= 2 && nov.matchingScenarios.some((m) => m.scenario === "global_selloff"));
  assert.match(nov.generalTrackExplanation.clientDraft.text, /^היי/);
  assert.match(nov.note, /רק באישור קארין/);

  const calm = service.marketWatch({ factors: { ta125: 0.5, spx: 1, usd: -0.3, gov: 0.1, corp: 0.2 }, asOf: "2026-12-31" });
  assert.equal(calm.alert.attention, false);
  assert.deepEqual(calm.matchingScenarios, []);
  assert.equal(calm.partialMonth, false);

  const shekel = service.marketWatch({ factors: { ta125: 0.5, spx: 1, usd: -5, gov: 0.1, corp: 0.2 }, asOf: "2026-12-31" });
  assert.equal(shekel.matchingScenarios[0].scenario, "shekel_stronger_5");
  assert.equal(cat(shekel, "ביטוח · עוקב S&P 500").level, "very_unusual");
  assert.equal(cat(shekel, "גמל/השתלמות · אג\"ח ממשלות").level, "normal");

  assert.equal(service.monthShare("2026-11-15"), 0.5);
  assert.equal(service.monthShare("2026-02-28"), 1);
  assert.equal(service.unusualLevel(-3, null).level, "unknown");
});

test("track forecast: range per horizon, anchors, prudence cap, fees and guards", () => {
  const history = service.loadFactorHistory();
  assert.ok(history.periods.length >= 170 && tm.FACTOR_NAMES.every((f) => history.factors[f].length === history.periods.length));
  const yields = { y5: 3.86, y10: 4.24, inflation: 1.95, asOf: "2026-10", source: "בדיקה" };
  const general = { alpha: 0.08, betas: { ta125: 0.16, spx: 0.23, usd: 0.11, gov: -0.01, corp: 0.2 }, residualSd: 0.43 };
  const f = fc.forecastTrack({ model: general, history, yields });
  assert.deepEqual(f.horizons.map((h) => h.key), ["1y", "3y", "5y", "10y"]);
  assert.ok(f.central > 4 && f.central < 8, `centre ${f.central}`);
  assert.ok(Math.abs(f.central - (f.anchors.historical.annual + f.anchors.yieldBased.annual) / 2) < 0.11);
  assert.ok(Math.abs(f.centralReal - (f.central - 1.95)) < 0.11);
  // the range narrows with the horizon, and the chance of a loss falls
  const widths = f.horizons.map((h) => h.annualized.high - h.annualized.low);
  assert.ok(widths[0] > widths[1] && widths[1] > widths[2] && widths[2] > widths[3]);
  const loss = f.horizons.map((h) => h.lossProbability);
  assert.ok(loss[0] > loss[1] && loss[1] > loss[2] && loss[0] > 0.1 && loss[0] < 0.3);
  assert.ok(f.horizons[0].annualized.low < 0, "a one-year range for a general track includes a loss");
  assert.equal(f.horizons[3].backtested, false);
  assert.ok(Math.abs(f.horizons[2].cumulative.central - ((1 + f.central / 100) ** 5 - 1) * 100) < 0.3);
  assert.equal(f.calibration.insideShare, 0.73);
  assert.ok(f.caveats.some((c) => /אינה מבטיחה/.test(c)));

  // more equity -> higher centre, wider range, more chance of a loss in one year
  const equity = { alpha: -0.02, betas: { ta125: 0.4, spx: 0.55, usd: 0.1, gov: 0, corp: 0.1 }, residualSd: 0.8 };
  const e = fc.forecastTrack({ model: equity, history, yields });
  assert.ok(e.central > f.central && e.annualVolatility > f.annualVolatility * 1.7);
  assert.ok(e.horizons[0].lossProbability > f.horizons[0].lossProbability);
  assert.match(e.anchors.historicalCap, /S&P 500/); // the exceptional 2012–2026 average is not projected forward
  const tracker = fc.forecastTrack({ model: { alpha: 0, betas: { ta125: 0, spx: 1, usd: 0, gov: 0, corp: 0 }, residualSd: 0.3 }, history, yields });
  // cap = (4.24% + 2 × 4%) a year, applied monthly and compounded: about 13%, below the raw 2012–2026 average
  assert.ok(tracker.anchors.historical.annual > 12 && tracker.anchors.historical.annual <= 13.1, `capped historical anchor ${tracker.anchors.historical.annual}`);

  // a bond track is anchored on yields only
  const bond = fc.forecastTrack({ model: { alpha: 0.05, betas: { ta125: 0.02, spx: 0.03, usd: 0.02, gov: 0.4, corp: 0.3 }, residualSd: 0.2 }, history, yields });
  assert.match(bond.anchors.centreRule, /בלבד/);
  assert.equal(bond.central, bond.anchors.yieldBased.annual);

  // fee, category shrinkage and custom assumptions
  const net = fc.forecastTrack({ model: general, history, yields, annualFee: 0.8 });
  assert.ok(Math.abs(f.central - net.central - 0.8) < 0.11);
  const shrunk = fc.forecastTrack({ model: { ...general, alpha: 0.4 }, history, yields, categoryAlpha: 0.08 });
  const own = fc.forecastTrack({ model: { ...general, alpha: 0.4 }, history, yields });
  assert.ok(shrunk.central < own.central && shrunk.central > f.central);
  const cautious = fc.forecastTrack({ model: general, history, yields, assumptions: { equityPremium: 2 } });
  assert.ok(cautious.central < f.central);

  assert.throws(() => fc.forecastTrack({ model: general, history, yields: { y5: 3.9 } }), /y10/);
  assert.throws(() => fc.forecastTrack({ model: { betas: { ta125: 0.1 } }, history, yields }), /חסרות רגישויות/);
  assert.throws(() => fc.forecastTrack({ model: general, history, yields, annualFee: 9 }), /annualFee/);
  assert.throws(() => fc.forecastTrack({ model: general, history: { periods: [], factors: {} }, yields }), /60 חודשים/);
  assert.ok(Math.abs(fc.normalCdf(0) - 0.5) < 1e-6 && Math.abs(fc.normalCdf(-1.2816) - 0.1) < 2e-3);

  // forecast card drafts are valid cards; the untested 10-year range is not presented as statistical
  const card5 = validateCard(fc.toForecastCard(f, { asset: "מסלול בדיקה", key: "5y", dataAsOf: "2026-10-01" }), { now: new Date("2026-11-26T12:00:00Z") });
  assert.equal(card5.ok, true);
  assert.equal(card5.card.interval.kind, "statistical");
  const card10 = validateCard(fc.toForecastCard(f, { asset: "מסלול בדיקה", key: "10y", dataAsOf: "2026-10-01" }), { now: new Date("2026-11-26T12:00:00Z") });
  assert.equal(card10.ok, true);
  assert.notEqual(card10.card.interval.kind, "statistical");

  const text = explain.explainForecast({ forecast: f, trackLabel: "המסלול הכללי" });
  assert.match(text.summary, /הטווח הסביר/);
  assert.match(text.summary, /73%/);
  assert.ok(text.clientDraft.text.startsWith("היי") && /אינה תשואה מובטחת/.test(text.clientDraft.text));
  assert.equal(text.clientDraft.requiresApproval, true);
});

test("forecast service: live yields with a dated fallback, per-track and per-category", async () => {
  market._clearCache();
  const curve = [
    "SERIES_CODE,FREQ,NOMINAL_REAL,TIME_PERIOD_TYPE,DATA_TYPE,MODEL_TYPE,TIME_TO_MATURITY,FCT_TOPIC,FCT_SOURCE,DATA_SOURCE,TIME_COLLECT,CONF_STATUS,PUB_WEBSITE,UNIT_MEASURE,UNIT_MULT,TIME_PERIOD,OBS_VALUE,RELEASE_STATUS",
    "ZC_TSB_ZND_05Y_MA,M,N,_Z,ZC_YTM,M_T,Y05T05,_Z,_Z,BOI,V,F,Y,PT,0,2026-09,3.7,YP",
    "ZC_TSB_ZND_05Y_MA,M,N,_Z,ZC_YTM,M_T,Y05T05,_Z,_Z,BOI,V,F,Y,PT,0,2026-10,3.9,YP",
    "ZC_TSB_ZND_10Y_MA,M,N,_Z,ZC_YTM,M_T,Y10T10,_Z,_Z,BOI,V,F,Y,PT,0,2026-10,4.3,YP",
    "EXP_EXB_ZD_10Y_MA,M,_Z,_Z,INF_EXP,M_T,Y10T10,_Z,_Z,BOI,V,F,Y,PT,0,2026-10,2.0,YP",
    "INF_MAX_TRGT_D,D,_Z,_Z,INF_MAX_TRGT,_Z,_Z,_Z,_Z,BOI,V,F,Y,PT,0,2026-11-25,3,YP",
  ].join("\n");
  const ok = async (url) => (String(url).includes("/ZCM/") ? { ok: true, status: 200, text: async () => curve } : { ok: true, status: 200, json: async () => ({ success: true, result: { records: [], total: 0 } }), text: async () => "" });
  const today = new Date("2026-11-26T12:00:00Z");
  const y = await market.fetchYieldCurve({ fetchImpl: ok, today });
  assert.deepEqual([y.y5, y.y10, y.inflation, y.asOf, y.live], [3.9, 4.3, 2, "2026-10", true]);

  const r = await service.forecastFund({ fundId: 50, fetchImpl: ok, today });
  assert.match(r.track.label, /הפניקס/);
  assert.equal(r.inputs.yields.y10, 4.3);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.ownRecord, null); // no official history reachable in this test — the forecast does not depend on it
  assert.ok(r.forecastCardDrafts["5y"].asset.includes("הפניקס") && validateCard(r.forecastCardDrafts["1y"], { now: today }).ok);
  assert.match(r.notice, /אינה הבטחה/);

  // Bank of Israel unreachable -> stored snapshot, and the result says so
  market._clearCache();
  const down = async () => ({ ok: false, status: 503, text: async () => "" });
  const fallback = await service.forecastFund({ category: "גמל/השתלמות · כללי", fetchImpl: down, today });
  assert.equal(fallback.inputs.yields.asOf, "2026-10");
  assert.match(fallback.warnings[0], /נתון שמור/);
  assert.ok(fallback.central > 3 && fallback.central < 9);

  // a short-history track carries a warning
  const short = service.loadFunds().funds.find((x) => x.basis === "blend");
  const s = await service.forecastFund({ fundId: short.id, dataset: short.ds, fetchImpl: down, today });
  assert.ok(s.warnings.some((w) => /היסטוריה קצרה/.test(w)));
  await assert.rejects(service.forecastFund({ fundId: 999999, fetchImpl: down, today }), /לא נמצא מודל/);
  market._clearCache();
});

/* ---------- connectors with a fake network ---------- */

const CLOSES = {
  ta125: { 20260831: 100, 20260930: 102, 20261031: 99.96, 20261126: 97.9608 },
  spx: { 20260831: 5000, 20260930: 5100, 20261031: 5100, 20261126: 4845 },
  gov: { 20260831: 400, 20260930: 400, 20261031: 404, 20261126: 404 },
  corp: { 20260831: 300, 20260930: 303, 20261031: 303, 20261126: 300 },
};
const SYMBOL_TO_FACTOR = Object.fromEntries(Object.entries(market.INDEX_SYMBOLS).map(([f, s]) => [s.symbol, f]));
const USD_CSV = [
  "SERIES_CODE,FREQ,BASE_CURRENCY,COUNTER_CURRENCY,UNIT_MEASURE,DATA_TYPE,DATA_SOURCE,TIME_COLLECT,CONF_STATUS,PUB_WEBSITE,UNIT_MULT,COMMENTS,TIME_PERIOD,OBS_VALUE,RELEASE_STATUS",
  "RER_USD_ILS,D,USD,ILS,ILS,OF00,BOI_MRKT,V,F,Y,0,,2026-08-28,3.2,YP",
  "RER_USD_ILS,D,USD,ILS,ILS,OF00,BOI_MRKT,V,F,Y,0,,2026-09-30,3.264,YP",
  "RER_USD_ILS,D,USD,ILS,ILS,OF00,BOI_MRKT,V,F,Y,0,,2026-10-30,3.2,YP",
  "RER_USD_ILS,D,USD,ILS,ILS,OF00,BOI_MRKT,V,F,Y,0,,2026-11-25,3.36,YP",
].join("\n");

function fakeFetch({ funds = {}, log = [] } = {}) {
  return async (url) => {
    const u = new URL(url);
    log.push(u.host + u.pathname);
    const text = (body, ok = true, status = 200) => ({ ok, status, text: async () => body, json: async () => JSON.parse(body) });
    if (u.host === "edge.boi.gov.il") return text(USD_CSV);
    if (u.host === "www.globes.co.il") {
      const factor = SYMBOL_TO_FACTOR[u.searchParams.get("symbol")];
      const close = CLOSES[factor][u.searchParams.get("until")];
      if (close == null) return text("<yield></yield>");
      const d = u.searchParams.get("until");
      return text(`<yield><until>${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T00:00:00</until><until_close_price>${close}</until_close_price></yield>`);
    }
    if (u.host === "data.gov.il") {
      const rid = u.searchParams.get("resource_id");
      const id = JSON.parse(u.searchParams.get("filters")).FUND_ID;
      const records = ((funds[id] || {})[rid] || []);
      return text(JSON.stringify({ success: true, result: { records, total: records.length } }));
    }
    return text("", false, 404);
  };
}

test("market data: USD from Bank of Israel, index source is opt-in, moves computed from closes", async () => {
  market._clearCache();
  const log = [];
  const fetchImpl = fakeFetch({ log });
  const usd = await market.fetchUsdIls({ from: "2026-08-01", to: "2026-11-26", fetchImpl });
  assert.equal(usd.length, 4);
  assert.equal(market.lastOnOrBefore(usd, "20260930").rate, 3.264);
  assert.equal(market.lastOnOrBefore(usd, "20260831").date, "2026-08-28"); // last business day

  await assert.rejects(market.fetchFactorHistory({ from: "202609", to: "202610", fetchImpl, env: {} }), (e) => e.status === 409 && /אינו מופעל/.test(e.message));

  const env = { OFEK_INDEX_SOURCE: "globes" };
  const today = new Date("2026-11-27T05:00:00Z");
  const r = await market.fetchFactorHistory({ from: "202609", to: "202610", asOf: "2026-11-26", fetchImpl, env, today });
  assert.deepEqual(r.rows.map((x) => x.period), ["202609", "202610"]);
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  near(r.rows[0].factors.ta125, 2); near(r.rows[0].factors.spx, 2); near(r.rows[0].factors.usd, 2); near(r.rows[0].factors.gov, 0); near(r.rows[0].factors.corp, 1);
  near(r.rows[1].factors.ta125, -2); near(r.rows[1].factors.gov, 1);
  near(r.monthToDate.factors.ta125, -2); near(r.monthToDate.factors.spx, -5); near(r.monthToDate.factors.usd, 5);
  assert.equal(r.monthToDate.lastObservation.usd, "2026-11-25");
  assert.equal(r.monthToDate.since, "2026-10-31");

  // settled month-end closes are cached; the as-of close (yesterday) is fetched again
  const before = log.filter((x) => x.startsWith("www.globes")).length;
  await market.fetchFactorHistory({ from: "202609", to: "202610", asOf: "2026-11-26", fetchImpl, env, today });
  assert.equal(log.filter((x) => x.startsWith("www.globes")).length - before, 4);

  // official data two months behind: October is returned as its own unpublished month,
  // and month-to-date still starts at the end of October — not at the end of September
  const lag = await market.fetchFactorHistory({ from: "202609", to: "202609", asOf: "2026-11-26", fetchImpl, env, today });
  assert.deepEqual(lag.rows.map((x) => x.period), ["202609"]);
  assert.deepEqual(lag.unpublishedMonths.map((x) => x.period), ["202610"]);
  near(lag.unpublishedMonths[0].factors.ta125, -2);
  assert.equal(lag.monthToDate.since, "2026-10-31");
  assert.equal(lag.monthToDate.period, "202611");
  near(lag.monthToDate.factors.ta125, -2); // not the two-month move of about -4%
  near(lag.monthToDate.factors.spx, -5);
  assert.deepEqual(r.unpublishedMonths, []);

  // "today" is the Israeli calendar date, not the UTC one
  assert.equal(market.israelDate(new Date("2026-11-30T22:30:00Z")), "2026-12-01");
  assert.equal(market.israelDate(new Date("2026-11-30T12:00:00Z")), "2026-11-30");

  await assert.rejects(market.fetchFactorHistory({ from: "202609", to: "202610", asOf: "2026-10-15", fetchImpl, env, today }), /asOf/);
  await assert.rejects(market.fetchFactorHistory({ from: "202610", to: "202609", fetchImpl, env }), /from ≤ to/);
  await assert.rejects(market.fetchFactorHistory({ from: "202609", to: "202612", fetchImpl, env, today }), (e) => e.status === 502);
  market._clearCache();
});

function fundRecords(rows, id = 50, name = "מסלול בדיקה כללי") {
  return rows.map((r) => ({ FUND_ID: id, FUND_NAME: name, REPORT_PERIOD: Number(r.period), MONTHLY_YIELD: r.ret, TOTAL_ASSETS: 1234.5 }));
}

test("fund history: merges older and current files, one row per month, skips empty yields", async () => {
  const rows = synthetic(30);
  const older = fundRecords(rows.slice(0, 20));
  const current = [...fundRecords(rows.slice(18)), { FUND_ID: 50, FUND_NAME: "מסלול בדיקה כללי", REPORT_PERIOD: 201707, MONTHLY_YIELD: null }];
  const fetchImpl = fakeFetch({ funds: { 50: { [HISTORY_RESOURCES.insurance[0]]: older, [RESOURCES.insurance]: current } } });
  const h = await fetchFundHistory({ dataset: "insurance", fundId: 50, fetchImpl });
  assert.equal(h.rows.length, 30);
  assert.equal(h.rows[0].period, "201501");
  assert.equal(h.fundName, "מסלול בדיקה כללי");
  assert.ok(h.rows.every((r, i) => i === 0 || r.period > h.rows[i - 1].period));
  await assert.rejects(fetchFundHistory({ dataset: "stocks", fundId: 50, fetchImpl }), /dataset/);
  await assert.rejects(fetchFundHistory({ dataset: "constructor", fundId: 50, fetchImpl }), /dataset/);
  await assert.rejects(fetchFundHistory({ dataset: "gemel", fundId: "abc", fetchImpl }), /fundId/);
});

test("fund analysis: model, accuracy, scenarios, early estimate and deposit timing from supplied factors", async () => {
  const rows = synthetic(120);
  const fetchImpl = fakeFetch({ funds: { 77: { [RESOURCES.gemel]: fundRecords(rows, 77) } } });
  const factorRows = rows.map((r) => ({ period: r.period, factors: r.factors }));
  const mtd = { ta125: -3, spx: -5, usd: 7, gov: 0.3, corp: -0.9 };
  const r = await service.analyzeFund({ dataset: "gemel", fundId: 77, factorRows, mtdFactors: mtd, asOf: "2025-01-20", fetchImpl });
  assert.equal(r.fund.lastOfficialMonth, "202412");
  assert.equal(r.model.n, 60);
  assert.ok(Math.abs(r.model.betas.spx - 0.25) < 0.06);
  assert.equal(r.model.accuracy.n, 60);
  assert.ok(r.model.accuracy.mae < 0.3);
  assert.equal(r.scenarios.length, Object.keys(tm.SCENARIOS).length);
  assert.ok(Math.abs(r.earlyEstimate.estimate + 1.3) < 0.4);
  assert.ok(r.earlyEstimate.range.low < r.earlyEstimate.estimate);
  assert.equal(r.depositTiming.months, 120);
  assert.match(r.notice, /אינו חוזה/);
  assert.equal(r.volatilityOutlook.basedOn.isEarlyEstimate, true);
  assert.ok(["elevated_volatility", "normal_volatility"].includes(r.volatilityOutlook.state));

  // official data ends in September while the market data runs to late November:
  // October gets its own full-month estimate and November its own month-to-date estimate
  market._clearCache();
  const months = []; for (let y = 2015, m = 1; months.length < 141; m === 12 ? (m = 1, y++) : m++) months.push(`${y}${String(m).padStart(2, "0")}`);
  const upToSept = synthetic(141).map((x, i) => ({ ...x, period: months[i] })).filter((x) => x.period <= "202609");
  const lagFetch = fakeFetch({ funds: { 77: { [RESOURCES.gemel]: fundRecords(upToSept.slice(-100), 77) } } });
  const flat = async (url, opts) => {
    const u = new URL(url);
    if (u.host === "edge.boi.gov.il") {
      const [head, ...rest] = USD_CSV.split("\n");
      // a varying rate for the older months (mid-month observations, so the real late-2026 rows decide the recent moves)
      const older = months.filter((p) => p < "202608").map((p, i) => rest[0].replace("2026-08-28", `${p.slice(0, 4)}-${p.slice(4)}-15`).replace(",3.2,", `,${(3.2 + 0.15 * Math.sin(i * 1.3)).toFixed(4)},`));
      return { ok: true, status: 200, text: async () => [head, ...older, ...rest].join("\n") };
    }
    if (u.host === "www.globes.co.il") {
      const d = u.searchParams.get("until");
      const factor = SYMBOL_TO_FACTOR[u.searchParams.get("symbol")];
      const known = CLOSES[factor][d];
      const wobble = 100 + 8 * Math.sin(Number(d.slice(0, 6)) * ({ ta125: 0.7, spx: 1.1, gov: 1.7, corp: 2.3 })[factor]); // older months: any varying level
      return { ok: true, status: 200, text: async () => `<yield><until>${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T00:00:00</until><until_close_price>${known == null ? wobble : known}</until_close_price></yield>` };
    }
    return lagFetch(url, opts);
  };
  const lagged = await service.analyzeFund({ dataset: "gemel", fundId: 77, asOf: "2026-11-26", fetchImpl: flat, env: { OFEK_INDEX_SOURCE: "globes" }, today: new Date("2026-11-27T05:00:00Z") });
  assert.equal(lagged.fund.lastOfficialMonth, "202609");
  assert.deepEqual(lagged.unpublishedMonths.map((u) => u.period), ["202610"]);
  assert.ok(Math.abs(lagged.unpublishedMonths[0].marketMoves.ta125 + 2) < 1e-9);
  assert.equal(lagged.earlyEstimate.since, "2026-10-31");
  assert.ok(Math.abs(lagged.earlyEstimate.marketMoves.ta125 + 2) < 1e-9);
  assert.equal(lagged.earlyEstimate.partialMonth, true);
  market._clearCache();

  // without supplied factors and without the opt-in index source the analysis refuses rather than guessing
  await assert.rejects(service.analyzeFund({ dataset: "gemel", fundId: 77, fetchImpl, env: {} }), (e) => e.status === 409);
  await assert.rejects(service.analyzeFund({ dataset: "gemel", fundId: 78, factorRows, fetchImpl }), /מעט מדי/);
});

test("year over year: same months in both years, gap split by factor, draft without names", async () => {
  const rows = synthetic(30); // 201501 .. 201706 -> compares January-June 2016 with January-June 2017
  const fetchImpl = fakeFetch({ funds: { 50: { [RESOURCES.insurance]: fundRecords(rows, 50, "מסלול בדיקה כללי") } } });
  const factorRows = rows.map((r) => ({ period: r.period, factors: r.factors }));
  const r = await service.yearOverYear({ dataset: "insurance", fundId: 50, factorRows, fetchImpl });
  assert.deepEqual(r.years, ["2016", "2017"]);
  assert.equal(r.months.label, "ינואר עד יוני");
  assert.equal(r.fund.lastOfficialMonth, "201706");
  const sum = Object.values(r.byFactor).reduce((t, v) => t + v, 0) + r.unexplained;
  assert.ok(Math.abs(sum - r.gap) < 0.05, `sum ${sum} gap ${r.gap}`);
  assert.equal(typeof r.factorMoves["2016"].ta125, "number");
  assert.ok([...r.drivers, ...r.offsets].every((d) => Math.abs(d.contribution) >= 0.3));
  assert.match(r.summary, /נקודות אחוז/);
  assert.ok(r.clientDraft.text.startsWith("היי"));
  assert.equal(r.clientDraft.requiresApproval, true);
  for (const banned of ["קארין", "בברכה", "כדאי לך", "מומלץ"]) assert.equal(r.clientDraft.text.includes(banned), false, banned);

  // a year with a missing month is refused rather than compared unevenly
  const gap = rows.filter((x) => x.period !== "201603");
  const holed = fakeFetch({ funds: { 50: { [RESOURCES.insurance]: fundRecords(gap, 50) } } });
  await assert.rejects(service.yearOverYear({ dataset: "insurance", fundId: 50, factorRows, fetchImpl: holed }), /חסרים נתונים רשמיים/);
  await assert.rejects(service.yearOverYear({ dataset: "insurance", fundId: 50, factorRows: factorRows.slice(0, 20), fetchImpl }), /חסרים גורמי שוק/);
  await assert.rejects(service.yearOverYear({ dataset: "insurance", fundId: 50, fetchImpl, env: {} }), (e) => e.status === 409);

  // wording: verb agrees with the subject, and opposite directions are spelled out
  const text = explain.explainYearOverYear({
    attribution: { 2025: { actualReturn: 12.1 }, 2026: { actualReturn: -1.5 }, gap: -13.6, byFactor: { ta125: -6, spx: -4, usd: 1.2, gov: 0.1, corp: -0.2 }, unexplained: -4.7, warnings: [] },
    factorMoves: { 2025: { ta125: 38, spx: 16.3, usd: -11, gov: 5, corp: 6 }, 2026: { ta125: 7.4, spx: -3.2, usd: -2.3, gov: 2, corp: 3 } },
    years: [2025, 2026], fromMonth: 1, toMonth: 10,
  });
  assert.match(text.summary, /הבורסה בתל אביב \(מדד ת"א 125\) עלתה 38% ב-2025, לעומת 7\.4% ב-2026/);
  assert.match(text.summary, /המניות בארה"ב \(מדד S&P 500\) עלו 16% ב-2025, וירדו 3\.2% ב-2026/);
  assert.match(text.clientDraft.text, /ובאותם חודשים ב-2026 ירד 1\.5%/);
  assert.match(text.clientDraft.text, /2025 הייתה שנה חריגה לטובה/);
  assert.deepEqual(text.offsets.map((o) => o.factor), ["usd"]);
});

test("routes and agent tools: track model end to end", async () => {
  const rows = synthetic(120);
  const fetchImpl = fakeFetch({ funds: { 77: { [RESOURCES.gemel]: fundRecords(rows, 77) } } });
  const ledger = createLedger({ backend: memoryBackend() });
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api/ofek", createOfekRouter({ ledger, token: "secret", runResearch: async () => ({}), fetchImpl, agentClient: null }));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/ofek`;
  const headers = { Authorization: "Bearer secret", "Content-Type": "application/json" };
  const post = async (path, body) => {
    const res = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  try {
    assert.equal((await fetch(`${base}/track-model/baseline`)).status, 401);
    const baseline = await (await fetch(`${base}/track-model/baseline?product=${encodeURIComponent("ביטוח")}`, { headers })).json();
    assert.ok(baseline.funds.some((f) => f.fundId === 50));
    const scen = await (await fetch(`${base}/track-model/scenarios`, { headers })).json();
    assert.ok(scen.scenarios.local_shock);

    const found = await (await fetch(`${base}/track-model/funds?limit=3&q=${encodeURIComponent("הפניקס כללי")}`, { headers })).json();
    assert.equal(found.funds[0].fundId, 50);
    assert.equal(found.funds.length, 3);
    const table = await post("/track-model/scenario", { fundId: 50 });
    assert.equal(table.body.table.length, Object.keys(tm.SCENARIOS).length);
    const one = await post("/track-model/scenario", { category: "גמל/השתלמות · מניות", shocks: { ta125: -10 } });
    assert.ok(one.body.result.impact < -3);
    assert.equal((await post("/track-model/scenario", { fundId: 123456789 })).status, 400);

    const mtd = { ta125: -3, spx: -5, usd: 7, gov: 0.3, corp: -0.9 };
    assert.equal((await post("/track-model/nowcast", { fundId: 50, factors: mtd })).status, 400); // no asOf/source
    const est = await post("/track-model/nowcast", { fundId: 50, factors: mtd, asOf: "2026-11-26", source: "בדיקה" });
    assert.equal(est.status, 200);
    assert.ok(est.body.estimate < 0 && est.body.range.high > est.body.estimate);

    const fit = await post("/track-model/fit", { rows, window: 60, minTrain: 60 });
    assert.ok(fit.body.model.r2 > 0.95 && fit.body.accuracy.mae < 0.3);
    assert.equal((await post("/track-model/fit", { rows: rows.slice(0, 5) })).status, 400);

    const exp = await post("/track-model/explain", { fundId: 50, factors: mtd, asOf: "2026-11-26", source: "בדיקה", partial: true, trackLabel: "המסלול הכללי" });
    assert.equal(exp.status, 200);
    assert.equal(exp.body.clientDraft.requiresApproval, true);
    assert.equal((await post("/track-model/explain", { fundId: 50, factors: mtd })).status, 400);
    const playbook = await (await fetch(`${base}/track-model/playbook`, { headers })).json();
    assert.equal(playbook.playbook.length, Object.keys(tm.SCENARIOS).length);

    const forecast = await post("/track-model/forecast", { fundId: 50, annualFee: 0.9 });
    assert.equal(forecast.status, 200);
    assert.equal(forecast.body.horizons.length, 4);
    assert.equal(forecast.body.inputs.annualFee, 0.9);
    assert.equal((await post("/track-model/forecast", { fundId: 123456789 })).status, 400);

    const attr = await post("/track-model/attribution", { betas: TRUE.betas, alpha: TRUE.alpha, periodA: rows.slice(0, 10), periodB: rows.slice(12, 22), labels: ["לפני", "אחרי"] });
    assert.equal(attr.body["אחרי"].months, 10);
    const timing = await post("/track-model/deposit-timing", { monthlyReturns: rows.map((r) => r.ret) });
    assert.equal(timing.body.months, 120);
    const pred = await post("/track-model/predictability", { rows });
    assert.equal(pred.body.verdict, "no_predictive_value");

    const fund = await post("/track-model/fund", { dataset: "gemel", fundId: 77, factorRows: rows.map((r) => ({ period: r.period, factors: r.factors })) });
    assert.equal(fund.status, 200);
    assert.equal(fund.body.earlyEstimate, null);
    assert.equal((await post("/track-model/fund", { dataset: "gemel", fundId: 77 })).status, 409); // index source not enabled
    assert.equal((await fetch(`${base}/market/factors?from=202609&to=202610`, { headers })).status, 409);
    assert.equal((await fetch(`${base}/track-model/watch?asOf=2026-11-26`, { headers })).status, 409); // needs the index source
    const watch = await post("/track-model/watch", { factors: mtd, asOf: "2026-11-26", source: "בדיקה" });
    assert.equal(watch.status, 200);
    assert.ok(watch.body.categories.length >= 20 && watch.body.partialMonth === true);
    assert.equal((await post("/track-model/watch", { factors: mtd })).status, 400);
  } finally {
    server.close();
  }

  // the same capabilities as agent tools
  for (const name of ["find_track", "forecast_track", "track_model_baseline", "track_scenario_impact", "track_early_estimate", "analyze_fund_track", "deposit_timing_stats", "explain_track_month", "explain_year_over_year", "scenario_playbook", "market_watch"]) {
    assert.ok(TOOL_DEFS.some((t) => t.name === name), name);
  }
  const tools = createToolExecutor({ ledger, fetchImpl });
  const fcTool = await tools.execute("forecast_track", { category: "ביטוח · כללי" });
  assert.equal(fcTool.isError, false);
  assert.equal(fcTool.result.horizons.length, 4);
  const located = await tools.execute("find_track", { q: "הפניקס כללי" });
  assert.equal(located.result.funds[0].fundId, 50);
  const impact = await tools.execute("track_scenario_impact", { fundId: 50, scenario: "global_selloff" });
  assert.equal(impact.isError, false);
  assert.ok(impact.result.impact < -2 && /הפניקס/.test(impact.result.track));
  const early = await tools.execute("track_early_estimate", { category: "ביטוח · כללי", factors: { ta125: -3, spx: -5, usd: 7, gov: 0.3, corp: -0.9 } });
  assert.equal(early.isError, true); // asOf and source are mandatory
  const told = await tools.execute("explain_track_month", { category: "ביטוח · כללי", factors: { ta125: -3, spx: -5, usd: 7, gov: 0.3, corp: -0.9 }, asOf: "2026-11-26", source: "בדיקה", partial: true });
  assert.equal(told.isError, false);
  assert.equal(told.result.clientDraft.status, "draft");
  assert.equal((await tools.execute("scenario_playbook", {})).result.playbook.length, Object.keys(tm.SCENARIOS).length);
  const watched = await tools.execute("market_watch", { factors: { ta125: -3, spx: -5, usd: 7, gov: 0.3, corp: -0.9 }, asOf: "2026-11-26", source: "בדיקה" });
  assert.equal(watched.isError, false);
  assert.equal(watched.result.alert.attention, true);
  assert.equal((await tools.execute("market_watch", {})).isError, true); // automatic fetch needs the index source
  const timing = await tools.execute("deposit_timing_stats", { dataset: "gemel", fundId: 77 });
  assert.equal(timing.result.fund.fundId, 77);
  assert.equal(timing.result.months, 120);
  const blocked = await tools.execute("analyze_fund_track", { dataset: "gemel", fundId: 77 });
  assert.equal(blocked.isError, true);
  assert.match(blocked.content, /אינו מופעל/);
});
