"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { validateCard } = require("../ofek/forecast-card");
const { createLedger, memoryBackend } = require("../ofek/ledger");
const { pointMetrics, brierScore, walkForward, baselines, compareModels, incrementalValueTest, mulberry32 } = require("../ofek/metrics");
const { evaluateSignals } = require("../ofek/signals");
const { readSentiment } = require("../ofek/sentiment");
const { simulateRetirement } = require("../ofek/retirement");
const { compareTracks } = require("../ofek/pension");
const { checkVideo, findPii } = require("../ofek/video-check");
const { createOfekRouter } = require("../ofek/routes");

const NOW = new Date("2026-10-10T09:00:00Z");

const card = (over = {}) => ({
  asset: "ת\"א 125",
  horizon: "1y",
  method: "quantitative",
  modelVersion: "ofek-4.0-test",
  dataSource: { name: "TASE", asOf: "2026-10-09" },
  pointForecast: 0.0612,
  interval: { low: -0.1, high: 0.2, coverage: 0.8, method: "empirical_quantiles" },
  scenarios: { bull: { description: "צמיחה", return: 0.18 }, base: { description: "בסיס", return: 0.06 }, bear: { description: "מיתון", return: -0.15 } },
  risks: ["ריבית"],
  assumptions: ["אינפלציה 2.5%"],
  changeTriggers: ["החלטת ריבית"],
  ...over,
});

test("forecast card: valid card is rounded and stamped", () => {
  const r = validateCard(card(), { now: NOW });
  assert.equal(r.ok, true);
  assert.equal(r.card.pointForecast, 0.06); // 0.5pp precision for 1y
  assert.equal(r.card.reviewDate, "2027-10-10");
  assert.equal(r.card.interval.kind, "statistical");
});

test("forecast card: point forecast requires a quantitative model", () => {
  const r = validateCard(card({ method: "qualitative", interval: null }), { now: NOW });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.startsWith("pointForecast")));
});

test("forecast card: non-statistical interval is labelled judgmental", () => {
  const r = validateCard(card({ interval: { low: -0.1, high: 0.2, coverage: 0.8, method: "gut" } }), { now: NOW });
  assert.equal(r.ok, true);
  assert.equal(r.card.interval.kind, "judgmental");
});

test("ledger: revisions keep the original, outcomes once, chain verifies", async () => {
  const ledger = createLedger({ backend: memoryBackend() });
  assert.equal(ledger.persistent, false);
  const c = validateCard(card(), { now: NOW }).card;
  const v1 = await ledger.recordForecast(c);
  const v2 = await ledger.reviseForecast(v1.id, { ...c, pointForecast: 0.04 }, "נתוני אינפלציה חדשים");
  assert.equal(v2.version, 2);
  assert.equal(v2.seriesId, v1.id);
  await assert.rejects(ledger.reviseForecast(v1.id, c, "שוב"), /הגרסה האחרונה/);
  assert.throws(() => { v1.card.pointForecast = 1; }, TypeError); // frozen
  const hist = await ledger.history(v1.id);
  assert.equal(hist[0].card.pointForecast, 0.06);
  const oc = await ledger.recordOutcome(v1.id, { realizedReturn: 0.1, source: "TASE", observedAt: "2027-10-10" });
  assert.equal(oc.forecastError, -0.04);
  assert.equal(oc.insideInterval, true);
  await assert.rejects(ledger.recordOutcome(v1.id, { realizedReturn: 0.1, source: "x", observedAt: "2027-10-10" }), /כבר נרשמה/);
  assert.equal((await ledger.verify()).ok, true);
});

test("ledger: tampering is detected", async () => {
  const be = memoryBackend();
  const ledger = createLedger({ backend: be });
  const c = validateCard(card(), { now: NOW }).card;
  await ledger.recordForecast(c);
  await ledger.recordForecast(c);
  const all = await be.all();
  const forged = JSON.parse(JSON.stringify(all[0]));
  forged.card.pointForecast = 0.5;
  const fake = { ...be, all: async () => [forged, all[1]] };
  assert.equal((await createLedger({ backend: fake }).verify()).ok, false);
});

test("metrics: MAE/RMSE/bias/direction/coverage", () => {
  const m = pointMetrics([
    { forecast: 0.1, actual: 0.05, low: 0, high: 0.2 },
    { forecast: -0.02, actual: 0.03, low: -0.1, high: 0.0 },
  ]);
  assert.ok(Math.abs(m.mae - 0.05) < 1e-12);
  assert.ok(Math.abs(m.bias - 0) < 1e-12);
  assert.equal(m.directionalAccuracy, 0.5);
  assert.equal(m.intervalCoverage.empirical, 0.5);
  assert.ok(Math.abs(brierScore([1, 0], [1, 0]).brier) < 1e-12);
});

test("metrics: walk-forward never peeks ahead; compare needs evidence", () => {
  const series = Array.from({ length: 40 }, (_, i) => (i % 2 ? 0.02 : -0.01));
  let maxSeen = 0;
  walkForward(series, { spy: (train) => { maxSeen = Math.max(maxSeen, train.length); return 0; } }, { minTrain: 24 });
  assert.equal(maxSeen, 39);
  const wf = walkForward(series, baselines, { minTrain: 24 });
  assert.equal(wf.steps, 16);
  const few = compareModels([{ forecast: 0, actual: 0 }], [{ forecast: 1, actual: 0 }]);
  assert.equal(few.improved, false);
  const ref = Array.from({ length: 30 }, () => ({ forecast: 0.1, actual: 0 }));
  const cand = Array.from({ length: 30 }, () => ({ forecast: 0.01, actual: 0 }));
  assert.equal(compareModels(cand, ref).improved, true);
});

test("signals: levels, staleness and insufficient data", () => {
  const d = (value) => ({ value, asOf: "2026-10-01", source: "test" });
  assert.equal(evaluateSignals({ yieldCurve: d(0.5) }, { now: NOW }).level.code, "insufficient");
  const calm = { rateShock: d(10), inflationExpectations: d(5), yieldCurve: d(0.5), creditSpreads: d(10), earningsRevisions: d(1), volatility: d(15) };
  assert.equal(evaluateSignals(calm, { now: NOW }).level.code, "stable");
  const stressed = { ...calm, creditSpreads: d(150), volatility: d(32), earningsRevisions: d(-5), yieldCurve: d(-0.3) };
  assert.equal(evaluateSignals(stressed, { now: NOW }).level.code, "elevated");
  const old = evaluateSignals({ ...calm, volatility: { value: 40, asOf: "2026-01-01", source: "t" } }, { now: NOW });
  assert.equal(old.stale.length, 1);
});

test("retirement: requires return assumption; fees and sequence risk show up", () => {
  assert.equal(simulateRetirement({ currentAge: 40, retirementAge: 67, balance: 1, monthlyContribution: 1 }).ok, false);
  const r = simulateRetirement({
    currentAge: 45, retirementAge: 67, endAge: 95, balance: 400000, monthlyContribution: 3000,
    feeOnBalance: 0.0022, feeOnDeposit: 0.015, monthlyWithdrawal: 9000,
    realReturn: { mean: 0.035, vol: 0.1 }, simulations: 1000,
  });
  assert.equal(r.ok, true);
  assert.ok(r.deterministic.feeCostAtRetirement > 0);
  assert.ok(r.monteCarlo.balanceAtRetirement.p5 < r.monteCarlo.balanceAtRetirement.p95);
  assert.ok(r.sequenceRisk.balanceAtEndIfShockEarly < r.sequenceRisk.balanceAtEndIfShockLate);
  // Deterministic seed => reproducible.
  const again = simulateRetirement({ currentAge: 45, retirementAge: 67, endAge: 95, balance: 400000, monthlyContribution: 3000, feeOnBalance: 0.0022, feeOnDeposit: 0.015, monthlyWithdrawal: 9000, realReturn: { mean: 0.035, vol: 0.1 }, simulations: 1000 });
  assert.deepEqual(again.monteCarlo, r.monteCarlo);
});

test("pension: refuses mixed risk, aligns windows", () => {
  const months = (start, n, r) => Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2024, start + i, 1));
    return { month: d.toISOString().slice(0, 7), r };
  });
  const base = { product: "גמל", returnsBasis: "gross", feeOnBalance: 0.006, source: "גמל־נט", asOf: "2026-09-30" };
  const a = { ...base, name: "A", track: "מניות", riskLevel: 5, monthlyReturns: months(0, 24, 0.01) };
  const b = { ...base, name: "B", track: "מניות", riskLevel: 5, monthlyReturns: months(6, 24, 0.008) };
  const c = { ...base, name: "C", track: "אג\"ח", riskLevel: 2, monthlyReturns: months(0, 24, 0.003) };
  assert.equal(compareTracks([a, c]).ok, false);
  const r = compareTracks([a, b]);
  assert.equal(r.ok, true);
  assert.equal(r.groups[0].window.months, 18);
  assert.ok(r.groups[0].tracks[0].estimatedNetOfFees.annualizedReturn < r.groups[0].tracks[0].reported.annualizedReturn);
});

test("video: blocks forecasts without disclaimer, PII, or approval", () => {
  assert.equal(findPii("ת.ז. 000000018 טל 050-1234567").length, 2);
  const good = {
    scriptText: "מדד ת\"א 125 עלה 5.2% השנה. התחזית: טווח בין -10% ל־20% בתרחישים שונים. זו הערכה מחקרית ואינה תשואה מובטחת. אין באמור ייעוץ.",
    videoDate: "2026-10-10",
    graphics: [{ label: "תשואה", value: "5.2%" }],
    rates: [{ name: "דולר", value: 3.7, source: "בנק ישראל", verifiedAt: "2026-10-10" }],
    manual: { calculationsReviewed: true, regulatoryDisclosures: true, factForecastSeparated: true },
    approval: { approvedBy: "karin", approvedAt: "2026-10-10T08:00:00Z" },
  };
  assert.equal(checkVideo(good, { now: NOW, approvers: ["karin"] }).publishable, true);
  const noDisc = checkVideo({ ...good, scriptText: good.scriptText.replace("זו הערכה מחקרית ואינה תשואה מובטחת.", "") }, { now: NOW, approvers: ["karin"] });
  assert.ok(noDisc.failed.includes("forecastDisclaimer"));
  const noApproval = checkVideo({ ...good, approval: {} }, { now: NOW, approvers: ["karin"] });
  assert.ok(noApproval.failed.includes("approval"));
});

test("routes: token required, memory ledger warns it is not persistent", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/ofek", createOfekRouter({ ledger: createLedger({ backend: memoryBackend() }), token: "secret", runResearch: async () => ({}) }));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/ofek`;
  try {
    assert.equal((await fetch(`${base}/status`)).status, 401);
    const headers = { Authorization: "Bearer secret", "Content-Type": "application/json" };
    const res = await fetch(`${base}/forecasts`, { method: "POST", headers, body: JSON.stringify(card()) });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.persistent, false);
    assert.match(body.storageWarning, /זיכרון בלבד/);
  } finally {
    server.close();
  }
});

test("sentiment value test (9.6.6): noise rejected, signal approved, regime-limited approval, dependence", () => {
  const rnd = mulberry32(7);
  const n = 200;
  const ind = Array.from({ length: n }, () => rnd() * 2 - 1);
  const noise = () => (rnd() - 0.5) * 0.01;
  const regimes = Array.from({ length: n }, (_, t) => (t % 40 < 20 ? "a" : "b"));
  const unrelated = Array.from({ length: n }, () => noise());
  assert.equal(incrementalValueTest(unrelated, ind, { regimes }).status, "rejected");
  const related = Array.from({ length: n }, (_, t) => (t ? 0.03 * ind[t - 1] : 0) + noise());
  const r = incrementalValueTest(related, ind, { regimes });
  assert.equal(r.status, "approved");
  assert.deepEqual(r.failingRegimes, []);
  // Signal exists only in regime "a" => approval limited to "a", "b" reported as failing.
  const partialSignal = Array.from({ length: n }, (_, t) => (t && regimes[t] === "a" ? 0.03 * ind[t - 1] : 0) + noise());
  const lim = incrementalValueTest(partialSignal, ind, { regimes });
  assert.equal(lim.status, "approved_limited");
  assert.deepEqual(lim.approvedRegimes, ["a"]);
  assert.deepEqual(lim.failingRegimes, ["b"]);
  assert.equal(incrementalValueTest(related, ind, { regimes, testsConducted: 20 }).significance.effectiveAlpha, 0.0025);
  assert.equal(incrementalValueTest(related, ind, { blockSize: 6 }).significance.blockSize, 6);
});

const sHist = () => Array.from({ length: 30 }, (_, i) => ({ date: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`, value: i }));
const sInd = (name, family, value) => ({
  name, family, orientation: "higher_is_bullish", source: "test", market: "IL", maxAgeDays: 30, history: sHist(), current: { date: "2026-10-05", value },
});

test("sentiment reading (9.6): point-in-time, dispersion, separate confidences, partial", () => {
  const withFuture = sInd("s1", "say", 29);
  withFuture.history.push({ date: "2026-12-01", value: 1000 }); // must be ignored
  const one = readSentiment({ indicators: [withFuture, sInd("d1", "do", 29), sInd("p1", "price", 15)], now: NOW });
  assert.equal(one.indicators[0].score, 98);
  assert.equal(one.overall.code, "optimistic");
  assert.equal(one.descriptiveConfidence.level, "medium"); // single indicator per family
  assert.equal(one.predictiveConfidence.level, "not_tested");
  const full = readSentiment({
    indicators: [sInd("s1", "say", 29), sInd("s2", "say", 25), sInd("d1", "do", 29), sInd("d2", "do", 27), sInd("p1", "price", 28), sInd("p2", "price", 26)],
    predictiveConfidence: "low", now: NOW,
  });
  assert.equal(full.descriptiveConfidence.level, "high");
  assert.equal(full.predictiveConfidence.level, "low"); // accurate reading != predictive value
  const conflict = readSentiment({ indicators: [sInd("s1", "say", 29), sInd("s2", "say", 0), sInd("d1", "do", 29), sInd("p1", "price", 28)], now: NOW });
  assert.equal(conflict.families.say.internalConflict, true);
  assert.ok(conflict.families.say.dispersion.range > 90);
  const mixed = readSentiment({ indicators: [sInd("s1", "say", 29), sInd("d1", "do", 0), sInd("p1", "price", 15)], now: NOW });
  assert.equal(mixed.overall.code, "mixed");
  const partial = readSentiment({ indicators: [sInd("s1", "say", 29), sInd("d1", "do", 29)], now: NOW });
  assert.equal(partial.complete, false);
  assert.equal(partial.overall, null);
  assert.equal(partial.descriptiveConfidence.level, "low");
  const stale = sInd("p1", "price", 15);
  stale.current.date = "2026-01-01";
  assert.equal(readSentiment({ indicators: [sInd("s1", "say", 29), sInd("d1", "do", 29), stale], now: NOW }).complete, false);
});

test("sentiment readings log (9.6.11): append-only, corrections, manual record without DB", async () => {
  const ledger = createLedger({ backend: memoryBackend() });
  const r = readSentiment({ indicators: [sInd("s1", "say", 29), sInd("d1", "do", 29), sInd("p1", "price", 15)], now: NOW });
  await assert.rejects(ledger.recordSentimentReading(r, { market: "IL" }), /חובה/);
  const first = await ledger.recordSentimentReading(r, { market: "IL", population: "פרטיים", horizon: "3m" });
  await assert.rejects(ledger.recordSentimentReading(r, { market: "IL", population: "פרטיים", horizon: "3m", correctsId: first.id }), /סיבה/);
  const fix = await ledger.recordSentimentReading(r, { market: "IL", population: "פרטיים", horizon: "3m", correctsId: first.id, reason: "תיקון מקור" });
  assert.equal(fix.correctsId, first.id);
  assert.equal((await ledger.listSentimentReadings()).length, 2);
  assert.equal((await ledger.verify()).ok, true);

  const app = express();
  app.use(express.json());
  app.use("/api/ofek", createOfekRouter({ ledger, token: "secret", runResearch: async () => ({}) }));
  const server = app.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/ofek/sentiment/read`, {
      method: "POST",
      headers: { Authorization: "Bearer secret", "Content-Type": "application/json" },
      body: JSON.stringify({ indicators: [sInd("s1", "say", 29)], record: { market: "IL", population: "פרטיים", horizon: "1m" } }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.persistent, false);
    assert.ok(body.manualRecord && body.manualRecord.type === "sentiment_reading");
  } finally {
    server.close();
  }
});
