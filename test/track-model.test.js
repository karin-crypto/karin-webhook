"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const tm = require("../ofek/track-model");
const service = require("../ofek/track-service");
const explain = require("../ofek/track-explain");
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

  // without supplied factors and without the opt-in index source the analysis refuses rather than guessing
  await assert.rejects(service.analyzeFund({ dataset: "gemel", fundId: 77, fetchImpl, env: {} }), (e) => e.status === 409);
  await assert.rejects(service.analyzeFund({ dataset: "gemel", fundId: 78, factorRows, fetchImpl }), /מעט מדי/);
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
  } finally {
    server.close();
  }

  // the same capabilities as agent tools
  for (const name of ["track_model_baseline", "track_scenario_impact", "track_early_estimate", "analyze_fund_track", "deposit_timing_stats", "explain_track_month", "scenario_playbook"]) {
    assert.ok(TOOL_DEFS.some((t) => t.name === name), name);
  }
  const tools = createToolExecutor({ ledger, fetchImpl });
  const impact = await tools.execute("track_scenario_impact", { fundId: 50, scenario: "global_selloff" });
  assert.equal(impact.isError, false);
  assert.ok(impact.result.impact < -2 && /הפניקס/.test(impact.result.track));
  const early = await tools.execute("track_early_estimate", { category: "ביטוח · כללי", factors: { ta125: -3, spx: -5, usd: 7, gov: 0.3, corp: -0.9 } });
  assert.equal(early.isError, true); // asOf and source are mandatory
  const told = await tools.execute("explain_track_month", { category: "ביטוח · כללי", factors: { ta125: -3, spx: -5, usd: 7, gov: 0.3, corp: -0.9 }, asOf: "2026-11-26", source: "בדיקה", partial: true });
  assert.equal(told.isError, false);
  assert.equal(told.result.clientDraft.status, "draft");
  assert.equal((await tools.execute("scenario_playbook", {})).result.playbook.length, Object.keys(tm.SCENARIOS).length);
  const timing = await tools.execute("deposit_timing_stats", { dataset: "gemel", fundId: 77 });
  assert.equal(timing.result.fund.fundId, 77);
  assert.equal(timing.result.months, 120);
  const blocked = await tools.execute("analyze_fund_track", { dataset: "gemel", fundId: 77 });
  assert.equal(blocked.isError, true);
  assert.match(blocked.content, /אינו מופעל/);
});
