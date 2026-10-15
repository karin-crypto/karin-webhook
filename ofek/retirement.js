"use strict";

/**
 * Retirement planning calculations (spec §8). Everything is in REAL (today's)
 * shekels on an annual step. Return and inflation figures are assumptions
 * the caller supplies — they are echoed back so the output stays auditable.
 *
 * This is a planning calculation, not a product or track recommendation.
 */

const { mulberry32 } = require("./metrics");

function normal(rnd) {
  // Box–Muller
  let u = 0;
  while (u === 0) u = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

/** Lognormal annual return with the given arithmetic mean and volatility. */
function lognormalParams(m, s) {
  const sigma2 = Math.log(1 + (s * s) / ((1 + m) * (1 + m)));
  return { mu: Math.log(1 + m) - sigma2 / 2, sigma: Math.sqrt(sigma2) };
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const DEFAULTS = {
  endAge: 100,
  contributionGrowthReal: 0,
  feeOnBalance: 0,
  feeOnDeposit: 0,
  monthlyWithdrawal: 0,
  withdrawalIndexed: true,
  inflation: { mean: 0.025, vol: 0.01 },
  simulations: 5000,
  seed: 20261010,
};

function validate(p) {
  const errors = [];
  const req = ["currentAge", "retirementAge", "balance", "monthlyContribution"];
  for (const k of req) if (!Number.isFinite(p[k])) errors.push(`${k}: מספר חובה`);
  if (!p.realReturn || !Number.isFinite(p.realReturn.mean) || !Number.isFinite(p.realReturn.vol)) {
    errors.push("realReturn: { mean, vol } — הנחת תשואה ריאלית שנתית חובה (אין ברירת מחדל)");
  }
  if (p.retirementAge <= p.currentAge) errors.push("retirementAge חייב להיות גדול מ־currentAge");
  if (p.endAge <= p.retirementAge) errors.push("endAge חייב להיות גדול מ־retirementAge");
  if (p.simulations > 50000) errors.push("simulations: עד 50,000");
  if (p.feeOnBalance < 0 || p.feeOnBalance > 0.05) errors.push("feeOnBalance: שיעור שנתי עשרוני (0.0022 = 0.22%)");
  if (p.feeOnDeposit < 0 || p.feeOnDeposit > 0.1) errors.push("feeOnDeposit: שיעור עשרוני (0.015 = 1.5%)");
  return errors;
}

/**
 * Run one path. returns[i] = real return in year i; infl[i] = inflation.
 * Returns { atRetirement, path, depletedAtAge }.
 */
function runPath(p, returns, infl) {
  let bal = p.balance;
  let contrib = p.monthlyContribution * 12;
  let withdraw = p.monthlyWithdrawal * 12;
  let atRetirement = null;
  let depletedAtAge = null;
  const path = [];
  const years = p.endAge - p.currentAge;
  for (let y = 0; y < years; y++) {
    const age = p.currentAge + y;
    if (age < p.retirementAge) {
      bal = (bal + contrib * (1 - p.feeOnDeposit)) * (1 + returns[y]) * (1 - p.feeOnBalance);
      contrib *= 1 + p.contributionGrowthReal;
    } else {
      if (atRetirement === null) atRetirement = bal;
      bal = (bal - withdraw) * (1 + returns[y]) * (1 - p.feeOnBalance);
      // A non-indexed (nominal) withdrawal loses real value each year.
      if (!p.withdrawalIndexed) withdraw /= 1 + infl[y];
      if (bal <= 0 && depletedAtAge === null) { depletedAtAge = age + 1; bal = 0; }
      if (bal <= 0) bal = 0;
    }
    path.push({ age: age + 1, balance: bal });
  }
  return { atRetirement, path, depletedAtAge };
}

function simulateRetirement(input) {
  const p = { ...DEFAULTS, ...input, inflation: { ...DEFAULTS.inflation, ...(input && input.inflation) } };
  const errors = validate(p);
  if (errors.length) return { ok: false, errors };

  const years = p.endAge - p.currentAge;
  const flat = (v) => Array(years).fill(v);

  // Deterministic projection at the mean, with and without fees.
  const det = runPath(p, flat(p.realReturn.mean), flat(p.inflation.mean));
  const noFee = runPath({ ...p, feeOnBalance: 0, feeOnDeposit: 0 }, flat(p.realReturn.mean), flat(p.inflation.mean));

  // Monte Carlo.
  const rnd = mulberry32(p.seed);
  const rp = lognormalParams(p.realReturn.mean, p.realReturn.vol);
  const atRet = [];
  const depletion = [];
  const finals = [];
  for (let s = 0; s < p.simulations; s++) {
    const rs = [];
    const inf = [];
    for (let y = 0; y < years; y++) {
      rs.push(Math.exp(rp.mu + rp.sigma * normal(rnd)) - 1);
      inf.push(p.inflation.mean + p.inflation.vol * normal(rnd));
    }
    const r = runPath(p, rs, inf);
    atRet.push(r.atRetirement);
    depletion.push(r.depletedAtAge);
    finals.push(r.path[r.path.length - 1].balance);
  }
  atRet.sort((a, b) => a - b);
  finals.sort((a, b) => a - b);
  const pct = (arr) => Object.fromEntries([0.05, 0.25, 0.5, 0.75, 0.95].map((q) => [`p${Math.round(q * 100)}`, Math.round(percentile(arr, q))]));

  const checkAges = [85, 90, 95, 100].filter((a) => a > p.retirementAge && a <= p.endAge);
  const depletionProbability = Object.fromEntries(
    checkAges.map((a) => [a, depletion.filter((d) => d !== null && d <= a).length / p.simulations])
  );

  // Sequence-of-returns illustration: identical returns, opposite order.
  const retYears = p.endAge - p.retirementAge;
  const shock = [-0.2, -0.1, -0.05];
  const n = Math.max(0, retYears - shock.length);
  // Pick the filler so both sequences share the same arithmetic mean as the assumption.
  const filler = n > 0 ? (p.realReturn.mean * retYears - shock.reduce((a, b) => a + b, 0)) / n : 0;
  const accum = flat(p.realReturn.mean).slice(0, p.retirementAge - p.currentAge);
  const early = accum.concat(shock, Array(n).fill(filler));
  const late = accum.concat(Array(n).fill(filler), shock.slice().reverse());
  const seqEarly = runPath(p, early, flat(p.inflation.mean));
  const seqLate = runPath(p, late, flat(p.inflation.mean));

  return {
    ok: true,
    assumptions: {
      realReturn: p.realReturn,
      inflation: p.inflation,
      feeOnBalance: p.feeOnBalance,
      feeOnDeposit: p.feeOnDeposit,
      monthlyWithdrawal: p.monthlyWithdrawal,
      withdrawalIndexed: p.withdrawalIndexed,
      simulations: p.simulations,
      seed: p.seed,
      model: "תשואות שנתיות לוג־נורמליות בלתי תלויות; צעד שנתי; ערכים ריאליים (שקלים של היום)",
    },
    deterministic: {
      balanceAtRetirement: Math.round(det.atRetirement),
      balanceAtRetirementNoFees: Math.round(noFee.atRetirement),
      feeCostAtRetirement: Math.round(noFee.atRetirement - det.atRetirement),
      depletedAtAge: det.depletedAtAge,
    },
    monteCarlo: {
      balanceAtRetirement: pct(atRet),
      balanceAtEndAge: pct(finals),
      depletionProbability,
    },
    sequenceRisk: {
      description: "אותן תשואות בדיוק, סדר הפוך: ירידות בתחילת הפרישה מול בסופה",
      depletedAtAgeIfShockEarly: seqEarly.depletedAtAge,
      depletedAtAgeIfShockLate: seqLate.depletedAtAge,
      balanceAtEndIfShockEarly: Math.round(seqEarly.path[seqEarly.path.length - 1].balance),
      balanceAtEndIfShockLate: Math.round(seqLate.path[seqLate.path.length - 1].balance),
    },
    notice:
      "חישוב תכנוני בלבד על בסיס ההנחות שסופקו — אינו המלצה על מוצר או מסלול. " +
      "כל מסקנה ללקוח מחייבת התאמה ובקרה של בעל הרישיון הרלוונטי.",
  };
}

module.exports = { simulateRetirement, lognormalParams, percentile };
