"use strict";

/**
 * Forecast evaluation (spec §10–11): error metrics, interval coverage,
 * calibration, Brier score, baselines, walk-forward evaluation and a paired
 * permutation test so "the model improved" is only claimed with evidence.
 */

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * pairs: [{ forecast, actual, low?, high?, coverage? }]
 */
function pointMetrics(pairs) {
  const ps = pairs.filter((p) => Number.isFinite(p.forecast) && Number.isFinite(p.actual));
  if (!ps.length) return { n: 0 };
  const errs = ps.map((p) => p.forecast - p.actual);
  const dir = ps.filter((p) => p.forecast !== 0 && p.actual !== 0);
  const withIv = ps.filter((p) => Number.isFinite(p.low) && Number.isFinite(p.high));
  return {
    n: ps.length,
    mae: mean(errs.map(Math.abs)),
    rmse: Math.sqrt(mean(errs.map((e) => e * e))),
    bias: mean(errs), // > 0 = forecasts too high on average
    directionalAccuracy: dir.length ? dir.filter((p) => Math.sign(p.forecast) === Math.sign(p.actual)).length / dir.length : null,
    directionalN: dir.length,
    intervalCoverage: withIv.length
      ? {
          n: withIv.length,
          empirical: withIv.filter((p) => p.actual >= p.low && p.actual <= p.high).length / withIv.length,
          nominal: withIv.every((p) => Number.isFinite(p.coverage)) ? mean(withIv.map((p) => p.coverage)) : null,
        }
      : null,
  };
}

/** Brier score for binary event forecasts. probs in [0,1], outcomes 0/1. */
function brierScore(probs, outcomes) {
  if (!probs.length || probs.length !== outcomes.length) throw new Error("probs/outcomes length mismatch");
  const bs = mean(probs.map((p, i) => (p - outcomes[i]) ** 2));
  const base = mean(outcomes);
  const climatology = mean(outcomes.map((o) => (base - o) ** 2));
  return { n: probs.length, brier: bs, climatologyBrier: climatology, skill: climatology > 0 ? 1 - bs / climatology : null };
}

/** Reliability table: predicted probability vs observed frequency per bin. */
function calibrationTable(probs, outcomes, bins = 10) {
  const rows = Array.from({ length: bins }, (_, i) => ({ from: i / bins, to: (i + 1) / bins, n: 0, sumP: 0, hits: 0 }));
  probs.forEach((p, i) => {
    const b = rows[Math.min(bins - 1, Math.floor(p * bins))];
    b.n++;
    b.sumP += p;
    b.hits += outcomes[i];
  });
  return rows
    .filter((r) => r.n > 0)
    .map((r) => ({ from: r.from, to: r.to, n: r.n, meanPredicted: r.sumP / r.n, observed: r.hits / r.n }));
}

/* ---------- baselines ---------- */

const baselines = {
  /** Random walk on price: expected return 0. */
  zeroReturn: () => 0,
  /** Mean of the returns available so far (no look-ahead). */
  historicalMean: (train) => mean(train),
};

/**
 * Walk-forward (expanding window). At step t the predictor only sees
 * series[0..t-1]; it forecasts series[t]. Strictly out-of-sample.
 *
 * predictors: { name: (trainSlice) => forecast }
 */
function walkForward(series, predictors, { minTrain = 24 } = {}) {
  if (series.length <= minTrain) throw new Error(`נדרשות יותר מ־${minTrain} תצפיות`);
  const out = {};
  for (const [name, fn] of Object.entries(predictors)) out[name] = [];
  for (let t = minTrain; t < series.length; t++) {
    const train = series.slice(0, t);
    for (const [name, fn] of Object.entries(predictors)) {
      out[name].push({ t, forecast: fn(train), actual: series[t] });
    }
  }
  const summary = {};
  for (const [name, pairs] of Object.entries(out)) summary[name] = pointMetrics(pairs);
  return { steps: series.length - minTrain, summary, pairs: out };
}

/**
 * Paired sign-flip permutation test on absolute-error differences.
 * Returns improvement only if the candidate's MAE is lower AND p < alpha.
 */
function compareModels(candidatePairs, referencePairs, { alpha = 0.05, iterations = 10000, seed = 42, minN = 12 } = {}) {
  if (candidatePairs.length !== referencePairs.length) throw new Error("נדרשות תצפיות מזווגות באותו אורך");
  const n = candidatePairs.length;
  const d = candidatePairs.map((c, i) => Math.abs(c.forecast - c.actual) - Math.abs(referencePairs[i].forecast - referencePairs[i].actual));
  const observed = mean(d);
  const rnd = mulberry32(seed);
  let extreme = 0;
  for (let k = 0; k < iterations; k++) {
    let s = 0;
    for (const x of d) s += rnd() < 0.5 ? -x : x;
    if (s / n <= observed) extreme++;
  }
  const pValue = (extreme + 1) / (iterations + 1); // one-sided: candidate better
  const candMae = mean(candidatePairs.map((p) => Math.abs(p.forecast - p.actual)));
  const refMae = mean(referencePairs.map((p) => Math.abs(p.forecast - p.actual)));
  const enough = n >= minN;
  const improved = enough && observed < 0 && pValue < alpha;
  return {
    n,
    candidateMae: candMae,
    referenceMae: refMae,
    maeSkill: refMae > 0 ? 1 - candMae / refMae : null,
    pValue,
    improved,
    verdict: !enough
      ? `אין מספיק תצפיות (${n} < ${minN}) — אין לקבוע שיפור`
      : improved
        ? "שיפור מובהק סטטיסטית לעומת מודל הייחוס"
        : "לא הוכח שיפור מובהק — אין להכריז שהמודל השתפר",
  };
}

module.exports = { pointMetrics, brierScore, calibrationTable, baselines, walkForward, compareModels, mulberry32, mean };
