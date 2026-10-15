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

const { runQualityGate } = require("../ofek/quality-gate");
const { createIndicatorRegistry } = require("../ofek/indicators");

test("quality gate (9.6.13): pass, pass with notes, blocked", () => {
  const ctx = { now: NOW, approvers: ["karin"], knownForecastIds: new Set(["fc_1"]) };
  const base = {
    contentType: "post",
    text: "מדד ת\"א 125 עלה 5% ברבעון. אין באמור ייעוץ.",
    sources: [{ claim: "תשואת ת\"א 125", source: "הבורסה", verifiedAt: "2026-10-09" }],
    dataPoints: [{ label: "תשואה רבעונית", measuredAt: "2026-09-30", publishedAt: "2026-10-01" }],
    manual: { regulatoryDisclosures: true },
    approval: { approvedBy: "karin", approvedAt: "2026-10-10T08:00:00Z" },
  };
  assert.equal(runQualityGate(base, ctx).outcome, "pass");

  // 3: direction without a ledger forecast -> blocked; with a known forecast -> passes check 3.
  const dir = { ...base, text: base.text + " השוק יעלה ברבעון הבא, בטווח של תרחישים. זו הערכה מחקרית ואינה תשואה מובטחת." };
  const blocked = runQualityGate(dir, ctx);
  assert.equal(blocked.outcome, "blocked");
  assert.equal(blocked.checks.find((c) => c.n === 3).pass, false);
  assert.equal(runQualityGate({ ...dir, forecastIds: ["fc_1"] }, ctx).outcome, "pass");
  assert.equal(runQualityGate({ ...dir, forecastIds: ["fc_missing"] }, ctx).outcome, "blocked");

  // 6: a guarantee blocks; the negated disclaimer does not.
  assert.equal(runQualityGate({ ...base, text: base.text + " תשואה מובטחת!" }, ctx).checks.find((c) => c.n === 6).pass, false);

  // 7 (non-blocking): blocked until documented, then pass_with_notes.
  const hype = { ...base, text: base.text + " אל תפספסו." };
  assert.equal(runQualityGate(hype, ctx).outcome, "blocked");
  assert.equal(runQualityGate({ ...hype, notes: "הביטוי יוסר בעריכה הסופית" }, ctx).outcome, "pass_with_notes");

  // 8 and 10 block.
  assert.equal(runQualityGate({ ...base, text: base.text + " ת.ז. 000000018" }, ctx).outcome, "blocked");
  assert.equal(runQualityGate({ ...base, approval: {} }, ctx).outcome, "blocked");

  // Video also runs the video fact check.
  const v = runQualityGate({ ...base, contentType: "video", video: { videoDate: "2026-10-01" } }, ctx);
  assert.equal(v.outcome, "blocked");
  assert.ok(v.video.failed.includes("date"));
});

test("indicator registry (9.6.1/9.6.6): lifecycle, approvals, experiments", async () => {
  const ledger = createLedger({ backend: memoryBackend() });
  const reg = createIndicatorRegistry(ledger);
  const karin = { approvedBy: "karin", approvedAt: "2026-10-10T08:00:00Z" };
  const card = {
    name: "פדיונות קרנות נאמנות", family: "do", market: "IL", population: "פרטיים", source: "מקור לדוגמה",
    termsOfUse: "שימוש פנימי מותר", frequency: "חודשי", measurementPeriod: "חודש קלנדרי", unit: "% מהנכסים",
    orientation: "higher_is_bearish", maxAgeDays: 45,
  };
  await assert.rejects(reg.register(card, {}), /אישור/);
  const { indicatorId } = await reg.register(card, karin);
  assert.equal((await reg.get(indicatorId)).status, "research");
  await assert.rejects(reg.register(card, karin), /כבר רשום/);

  // Cannot skip to active, cannot enter probation without an approved experiment.
  await assert.rejects(reg.transition(indicatorId, { to: "active", reason: "x", probationSummary: "x", approval: karin }), /מעבר לא מותר/);
  await assert.rejects(reg.transition(indicatorId, { to: "probation", reason: "x" }), /ניסוי/);

  const prereg = { hypothesis: "פדיונות חריגים מקדימים ירידות", asset: "ת\"א 125", market: "IL", horizon: "1m", successMetrics: "MAE", lag: 1, orientation: "contrarian", regimeDefinition: "ריבית מעל/מתחת 3%", plannedVariants: 2 };
  const rejected = await reg.recordExperiment(indicatorId, { preRegistration: prereg, testsConducted: 1, result: { status: "rejected" } });
  await assert.rejects(reg.transition(indicatorId, { to: "probation", reason: "x", experimentId: rejected.id }), /נדחה/);
  await assert.rejects(reg.recordExperiment(indicatorId, { preRegistration: prereg, testsConducted: 2, result: { status: "approved", significance: { testsConducted: 1 } } }), /אינו תואם/);

  const limited = await reg.recordExperiment(indicatorId, { preRegistration: prereg, testsConducted: 2, result: { status: "approved_limited", approvedRegimes: ["ריבית גבוהה"], failingRegimes: ["ריבית נמוכה"] } });
  await assert.rejects(reg.transition(indicatorId, { to: "probation", reason: "x", experimentId: limited.id }), /זמן אמת/);
  await reg.transition(indicatorId, { to: "probation", reason: "עבר בדיקה היסטורית", experimentId: limited.id, realTimeRegimeRule: "ריבית בנק ישראל ביום הקריאה > 3%" });
  const onProbation = await reg.get(indicatorId);
  assert.equal(onProbation.status, "probation");
  assert.deepEqual(onProbation.approvedRegimes, ["ריבית גבוהה"]);

  await assert.rejects(reg.transition(indicatorId, { to: "active", reason: "x", approval: karin }), /probationSummary/);
  await assert.rejects(reg.transition(indicatorId, { to: "active", reason: "x", probationSummary: "6 חודשים", approval: { approvedBy: "someone", approvedAt: "2026-10-10" } }), /אישור/);
  await reg.transition(indicatorId, { to: "active", reason: "תקופת ניסיון הצליחה", probationSummary: "6 חודשים, MAE נמוך מהבסיס", approval: karin });
  await reg.transition(indicatorId, { to: "suspended", reason: "ביצועים נחותים בזמן אמת" });
  const final = await reg.get(indicatorId);
  assert.equal(final.status, "suspended");
  assert.equal(final.approvedRegimes, null);
  assert.equal(final.history.length, 4);
  assert.equal((await ledger.verify()).ok, true);
});

const { recordsToTracks, parseCsv } = require("../ofek/connectors/gemelnet");
const { postProcess, createReportAnalyzer } = require("../ofek/reports");
const { loadSources, mcpRequestParts, describeSources } = require("../ofek/sources");
const { buildDcf, buildComps } = require("../ofek/valuation");

test("gemel-net import: CSV parsing, mapping, units, validation", () => {
  const csv = [
    "FUND_ID,FUND_NAME,MANAGING_CORPORATION,FUND_CLASSIFICATION,SPECIALIZATION,REPORT_PERIOD,MONTHLY_YIELD,AVG_ANNUAL_MANAGEMENT_FEE,STOCK_MARKET_EXPOSURE",
    '101,"קופה א, מניות",חברה א,תגמולים,מניות,202401,1.5,0.6,95',
    "101,קופה א,חברה א,תגמולים,מניות,202402,-0.5,0.6,95",
    "102,קופה ב,חברה ב,תגמולים,מניות,2024-01,1.0,0.5,90",
    "102,קופה ב,חברה ב,תגמולים,מניות,,1.0,0.5,90",
  ].join("\r\n");
  const rows = parseCsv(csv);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].FUND_NAME, "קופה א, מניות");
  const out = recordsToTracks(rows, { returnsBasis: "gross", source: "גמל־נט (בדיקה)" });
  assert.equal(out.tracks.length, 2);
  const a = out.tracks.find((t) => t.fundId === "101");
  assert.deepEqual(a.monthlyReturns, [{ month: "2024-01", r: 0.015 }, { month: "2024-02", r: -0.005 }]);
  assert.equal(a.feeOnBalance, 0.006);
  assert.equal(out.skipped.length, 1);
  assert.throws(() => recordsToTracks(rows, { source: "x" }), /returnsBasis/);
  assert.throws(() => recordsToTracks([{ ID: 1 }], { returnsBasis: "net", source: "x" }), /עמודות חובה/);
  const mapped = recordsToTracks([{ ID: 7, M: "202403", Y: 0.01 }], { mapping: { fundId: "ID", period: "M", monthlyReturn: "Y" }, unit: "decimal", returnsBasis: "net", source: "x" });
  assert.equal(mapped.tracks[0].monthlyReturns[0].r, 0.01);
});

test("report analyzer: quotes verified by code, changes computed by code, draft + review", async () => {
  const text = "הכנסות הקרן ברבעון השני הסתכמו ב־120 מיליון ש\"ח. דמי הניהול עמדו על 0.52%.";
  const extraction = {
    summary: "ס", notableChanges: [], risks: [], dataGaps: [],
    metrics: [
      { name: "הכנסות", value: 120, unit: "₪ מיליונים", period: "Q2", page: null, quote: "הסתכמו ב־120 מיליון ש\"ח" },
      { name: "דמי ניהול", value: 0.52, unit: "%", period: "Q2", page: null, quote: "דמי ניהול של 0.9%" },
    ],
  };
  const prev = { metrics: [{ name: "הכנסות", value: 100, unit: "₪ מיליונים", period: "Q1" }] };
  const r = postProcess(extraction, { text, previous: prev });
  assert.equal(r.metrics[0].quoteCheck, "verified");
  assert.equal(r.metrics[1].quoteCheck, "not_found");
  assert.equal(r.changes[0].relativeChange, 0.2);
  assert.equal(postProcess(extraction, {}).metrics[0].quoteCheck, "manual_check_required");

  // Mocked Claude client: the analyzer records a draft, then a review.
  const fake = { beta: { messages: { create: async () => ({ stop_reason: "end_turn", model: "m", content: [{ type: "text", text: JSON.stringify(extraction) }] }) } } };
  const ledger = createLedger({ backend: memoryBackend() });
  const an = createReportAnalyzer(ledger, { client: fake });
  await assert.rejects(an.analyze({ entity: "קרן X", period: "Q2", text }), /entityType/);
  const res = await an.analyze({ entity: "קרן X", entityType: "fund", period: "2026-Q2", text });
  assert.equal(res.recorded, true);
  assert.equal(res.entry.status, "draft");
  await assert.rejects(an.review(res.entry.id, { approval: { approvedBy: "nobody", approvedAt: "2026-10-15" } }), /אישור/);
  await an.review(res.entry.id, { approval: { approvedBy: "karin", approvedAt: "2026-10-15T09:00:00Z" }, notes: "תוקן ציטוט דמי ניהול" });
  assert.equal((await an.list("קרן X"))[0].status, "reviewed");
  const second = await an.analyze({ entity: "קרן X", entityType: "fund", period: "2026-Q3", text });
  assert.equal(second.entry.previousExtractionId, res.entry.id);
});

test("licensed data sources: validation, MCP request shape, no token leak", () => {
  const { sources, errors } = loadSources(JSON.stringify([
    { name: "morningstar", label: "Morningstar", url: "https://mcp.example.com/ms", authorization_token: "SECRET", allowedTools: ["search"] },
    { name: "bad", url: "http://insecure.example.com" },
    { name: "morningstar", url: "https://dup.example.com" },
  ]));
  assert.equal(sources.length, 1);
  assert.equal(errors.length, 2);
  const parts = mcpRequestParts(sources);
  assert.equal(parts.beta, "mcp-client-2025-11-20");
  assert.equal(parts.mcp_servers[0].authorization_token, "SECRET");
  assert.equal(parts.tools[0].mcp_server_name, "morningstar");
  assert.equal(parts.tools[0].configs.search.enabled, true);
  assert.ok(!JSON.stringify(describeSources(sources)).includes("SECRET"));
  assert.equal(mcpRequestParts([]), null);
  assert.equal(loadSources("not json").errors.length, 1);
});

test("model builder: DCF math, guards, sensitivity; comps range and outliers", () => {
  const src = { baseFcf: "דוח 2025", growth: "הנחת צוות", discountRate: "WACC", terminal: "צמיחה ארוכת טווח" };
  // One explicit year, Gordon terminal: hand-checkable.
  const d = buildDcf({ baseFcf: 100, growth: [0.1], discountRate: 0.1, terminal: { method: "gordon", growth: 0.02 }, netDebt: 50, sharesOutstanding: 10, currency: "ILS", assumptionSources: src });
  assert.equal(d.ok, true);
  // FCF1 = 110; PV = 100; TV = 110*1.02/0.08 = 1402.5; PV(TV) = 1275; EV = 1375; equity = 1325; per share 132.5
  assert.equal(d.result.enterpriseValue, 1375);
  assert.equal(d.result.perShare, 132.5);
  assert.ok(d.warnings.some((w) => w.includes("ערך הטרמינלי")));
  assert.equal(d.sensitivity.grid.length, 5);
  assert.equal(d.sensitivity.grid[2].values[2], 132.5);
  assert.equal(buildDcf({ ...d.assumptions, currency: "ILS", assumptionSources: src, terminal: { method: "gordon", growth: 0.1 } }).ok, false); // g >= r
  assert.equal(buildDcf({ baseFcf: 100, growth: [0.1], discountRate: 0.1, terminal: { method: "gordon", growth: 0.02 }, netDebt: 0, currency: "ILS" }).ok, false); // sources required
  const sc = buildDcf({ baseFcf: 100, growth: [0.1], discountRate: 0.1, terminal: { method: "gordon", growth: 0.02 }, netDebt: 50, sharesOutstanding: 10, currency: "ILS", assumptionSources: src, scenarios: { bear: { discountRate: 0.12 } } });
  assert.ok(sc.scenarios.bear.perShare < sc.result.perShare);

  const peers = [8, 9, 10, 11, 12, 60, -3].map((m, i) => ({ name: `P${i}`, multiple: m, source: "מקור", asOf: "2026-10-01" }));
  const c = buildComps({ multipleName: "EV/EBITDA", basis: "enterprise", subjectMetric: 10, netDebt: 20, currency: "ILS", peers });
  assert.equal(c.ok, true);
  assert.ok(c.excluded.some((x) => x.name === "P5")); // outlier 60
  assert.ok(c.excluded.some((x) => x.name === "P6")); // negative
  assert.equal(c.peerStats.median, 10);
  assert.equal(c.impliedRange.median.equityValue, 80); // 10 * 10 - 20
});

const { createAgent } = require("../ofek/agent");

function fakeClient(script) {
  const calls = [];
  return {
    calls,
    beta: { messages: { stream: (params) => {
      calls.push(JSON.parse(JSON.stringify(params.messages)));
      const next = script.shift();
      return { finalMessage: async () => { if (next instanceof Error) throw next; return next; } };
    } } },
  };
}

test("Ofek agent: tool loop, parallel results, proposals need approval, run is logged", async () => {
  const ledger = createLedger({ backend: memoryBackend() });
  const d = (value) => ({ value, asOf: "2026-10-01", source: "test" });
  const client = fakeClient([
    {
      model: "m", stop_reason: "tool_use",
      content: [
        { type: "text", text: "מריץ כלים" },
        { type: "tool_use", id: "t1", name: "evaluate_market_signals", input: { indicators: { rateShock: d(10), inflationExpectations: d(5), yieldCurve: d(0.5), creditSpreads: d(10), earningsRevisions: d(1), volatility: d(15) } } },
        { type: "tool_use", id: "t2", name: "propose_forecast", input: { card: card(), rationale: "בדיקה" } },
        { type: "tool_use", id: "t3", name: "no_such_tool", input: {} },
      ],
    },
    { model: "m", stop_reason: "end_turn", content: [{ type: "text", text: "## תקציר מנהלים\nסביבה יציבה יחסית." }] },
  ]);
  const agent = createAgent({ ledger, client, sources: [], now: () => NOW });
  const r = await agent.run({ task: "בדיקת סביבת שוק" });

  assert.equal(r.complete, true);
  assert.match(r.report, /סביבה יציבה/);
  // All three tool results went back in ONE user message, errors flagged.
  const second = client.calls[1];
  const results = second[second.length - 1].content;
  assert.equal(results.length, 3);
  assert.match(results[0].content, /stable/);
  assert.equal(results[2].is_error, true);
  // Proposal filed, not a forecast.
  assert.equal(r.proposals.length, 1);
  assert.equal((await ledger.list()).length, 0);
  const [p] = await agent.listProposals();
  assert.equal(p.status, "pending");

  await assert.rejects(agent.decide(p.id, { decision: "approve", approval: { approvedBy: "someone", approvedAt: "2026-10-10" } }), /אישור/);
  const dec = await agent.decide(p.id, { decision: "approve", approval: { approvedBy: "karin", approvedAt: "2026-10-10T09:00:00Z" } });
  assert.ok(dec.forecast.id);
  assert.equal((await ledger.list()).length, 1);
  await assert.rejects(agent.decide(p.id, { decision: "reject", approval: { approvedBy: "karin", approvedAt: "2026-10-10T09:00:00Z" } }), /כבר התקבלה/);

  const runs = (await ledger.entries()).filter((e) => e.type === "agent_run");
  assert.equal(runs.length, 1);
  assert.deepEqual(runs[0].tools, ["evaluate_market_signals", "propose_forecast", "no_such_tool"]);
  assert.equal((await ledger.verify()).ok, true);
});

test("Ofek agent: failed run rolls back, session continues append-only", async () => {
  const ledger = createLedger({ backend: memoryBackend() });
  const client = fakeClient([
    { model: "m", stop_reason: "end_turn", content: [{ type: "text", text: "תשובה ראשונה" }] },
    new Error("network"),
    { model: "m", stop_reason: "end_turn", content: [{ type: "text", text: "תשובה שנייה" }] },
  ]);
  const agent = createAgent({ ledger, client, sources: [], now: () => NOW });
  const first = await agent.run({ task: "שאלה 1" });
  await assert.rejects(agent.run({ task: "שאלה 2", sessionId: first.sessionId }), /network/);
  const third = await agent.run({ task: "שאלה 2", sessionId: first.sessionId });
  assert.equal(third.sessionId, first.sessionId);
  // History sent on the retry = turn 1 (user + assistant) + new user turn; the failed turn is gone.
  const sent = client.calls[2];
  assert.equal(sent.length, 3);
  assert.deepEqual(sent.map((m) => m.role), ["user", "assistant", "user"]);
  assert.equal(sent[1].content[0].text, "תשובה ראשונה");
});
