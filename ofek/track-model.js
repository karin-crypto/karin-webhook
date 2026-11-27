"use strict";

/**
 * OFEK TRACK MODEL — market-factor model for Israeli savings tracks
 * (provident / study funds, pension funds, insurance policies).
 *
 * What it does:
 *   - explains a track's monthly return with a few market factors
 *     (TA-125, S&P 500 in USD, USD/ILS, government bonds, corporate bonds);
 *   - measures its own accuracy out of sample (walk-forward);
 *   - translates a market scenario into an expected effect on a track;
 *   - gives an EARLY ESTIMATE of the current month from month-to-date market
 *     moves, weeks before the official monthly return is published;
 *   - attributes the gap between two periods to the factors;
 *   - computes deposit-timing statistics from a track's own history.
 *
 * What it does NOT do: predict WHEN markets will fall. Research on 178 months
 * (2012–2026) found no predictive value in last month's market moves for next
 * month's track return — `predictabilityTest` re-checks this on any data.
 *
 * Units: all returns and factor moves are in PERCENT (1.5 = 1.5%).
 * All functions are pure; nothing here fetches data.
 */

const FACTORS = {
  ta125: { he: 'מדד ת"א 125' },
  spx: { he: "S&P 500 (בדולרים)" },
  usd: { he: "שער הדולר מול השקל" },
  gov: { he: 'אג"ח ממשלתיות (תל גוב כללי)' },
  corp: { he: 'אג"ח קונצרניות (תל בונד 60)' },
};
const FACTOR_NAMES = Object.keys(FACTORS);

/**
 * Illustrative market scenarios. The shock sizes are round illustrative
 * numbers chosen by the researcher (judgmental), NOT forecasts and NOT
 * probabilities.
 */
const SCENARIOS = {
  ta125_down_10: { he: 'ירידה של 10% במדד ת"א 125', shocks: { ta125: -10 } },
  spx_down_10: { he: "ירידה של 10% ב-S&P 500", shocks: { spx: -10 } },
  shekel_stronger_5: { he: "התחזקות השקל ב-5% (הדולר יורד)", shocks: { usd: -5 } },
  shekel_weaker_5: { he: "היחלשות השקל ב-5% (הדולר עולה)", shocks: { usd: 5 } },
  gov_bonds_down_2: { he: 'ירידה של 2% באג"ח ממשלתיות', shocks: { gov: -2 } },
  corp_bonds_down_3: { he: 'ירידה של 3% באג"ח קונצרניות', shocks: { corp: -3 } },
  local_shock: { he: 'זעזוע מקומי: ת"א -10%, קונצרני -2%, דולר +4%', shocks: { ta125: -10, corp: -2, usd: 4 } },
  global_selloff: { he: 'ירידה עולמית: S&P -10%, ת"א -6%, דולר +3%', shocks: { spx: -10, ta125: -6, usd: 3 } },
  yields_up: { he: 'עליית תשואות: ממשלתי -3%, קונצרני -2.5%, מניות -3%', shocks: { gov: -3, corp: -2.5, ta125: -3, spx: -3 } },
  // upside scenarios; the combined moves follow the median of such months since 2008
  global_rally: { he: 'עלייה עולמית: S&P +8%, ת"א +6%, קונצרני +1.5%, דולר -2.5%', shocks: { spx: 8, ta125: 6, corp: 1.5, usd: -2.5 } },
  local_rally: { he: 'עלייה מקומית: ת"א +10%, קונצרני +2%, דולר -3%', shocks: { ta125: 10, corp: 2, usd: -3 } },
  yields_down: { he: 'ירידת תשואות (ציפייה להורדת ריבית): ממשלתי +2%, קונצרני +1.5%, מניות +2%', shocks: { gov: 2, corp: 1.5, ta125: 2, spx: 2 } },
};

const round = (x, d = 2) => (Number.isFinite(x) ? Number(x.toFixed(d)) : null);
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const quantile = (a, q) => {
  const s = a.slice().sort((x, y) => x - y);
  if (!s.length) return null;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
};
const compound = (rets) => (rets.reduce((p, r) => p * (1 + r / 100), 1) - 1) * 100;

class TrackModelError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

/** Invert a small symmetric positive-definite matrix (Gauss-Jordan, partial pivoting). */
function invert(m) {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-10) throw new TrackModelError("הגורמים תלויים זה בזה או חסרי שונות — לא ניתן לאמוד מודל");
    [a[c], a[p]] = [a[p], a[c]];
    const d = a[c][c];
    for (let j = 0; j < 2 * n; j++) a[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c];
      if (f) for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[c][j];
    }
  }
  return a.map((row) => row.slice(n));
}

function cleanRows(rows, factors) {
  if (!Array.isArray(rows)) throw new TrackModelError("rows: מערך של { period, ret, factors }");
  const out = [];
  for (const r of rows) {
    if (!r || typeof r.ret !== "number" || !Number.isFinite(r.ret) || !r.factors) continue;
    if (!factors.every((f) => typeof r.factors[f] === "number" && Number.isFinite(r.factors[f]))) continue;
    out.push({ period: String(r.period), ret: r.ret, x: [1, ...factors.map((f) => r.factors[f])] });
  }
  out.sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));
  return out;
}

function ols(clean) {
  const k = clean[0].x.length;
  const xtx = Array.from({ length: k }, () => Array(k).fill(0));
  const xty = Array(k).fill(0);
  for (const r of clean) {
    for (let i = 0; i < k; i++) {
      xty[i] += r.x[i] * r.ret;
      for (let j = 0; j < k; j++) xtx[i][j] += r.x[i] * r.x[j];
    }
  }
  const inv = invert(xtx);
  const b = inv.map((row) => row.reduce((s, v, j) => s + v * xty[j], 0));
  return { b, inv };
}

const predictRow = (b, x) => b.reduce((s, v, i) => s + v * x[i], 0);

/**
 * Fit ret = alpha + Σ beta_f · factor_f by ordinary least squares.
 * rows: [{ period: 'YYYYMM', ret, factors: { ta125, spx, usd, gov, corp } }]
 */
function fitFactorModel(rows, { factors = FACTOR_NAMES, minObs = 24 } = {}) {
  const clean = cleanRows(rows, factors);
  if (clean.length < Math.max(minObs, factors.length + 3)) {
    throw new TrackModelError(`נדרשים לפחות ${Math.max(minObs, factors.length + 3)} חודשים עם נתונים מלאים (יש ${clean.length})`);
  }
  const { b, inv } = ols(clean);
  const resid = clean.map((r) => r.ret - predictRow(b, r.x));
  const ys = clean.map((r) => r.ret);
  const my = mean(ys);
  const sse = resid.reduce((s, v) => s + v * v, 0);
  const sst = ys.reduce((s, v) => s + (v - my) ** 2, 0);
  const dof = Math.max(1, clean.length - b.length);
  const sigma2 = sse / dof;
  const se = inv.map((row, i) => Math.sqrt(Math.max(0, sigma2 * row[i])));
  return {
    ok: true,
    n: clean.length,
    from: clean[0].period,
    to: clean[clean.length - 1].period,
    factors,
    alpha: round(b[0], 4),
    betas: Object.fromEntries(factors.map((f, i) => [f, round(b[i + 1], 4)])),
    standardErrors: Object.fromEntries(factors.map((f, i) => [f, round(se[i + 1], 4)])),
    r2: sst > 0 ? round(1 - sse / sst, 4) : null,
    residualSd: round(Math.sqrt(sigma2), 4),
    method: "OLS על תשואות חודשיות באחוזים; alpha = התשואה החודשית הממוצעת שאינה מוסברת בגורמים",
  };
}

/**
 * Out-of-sample accuracy: for each month, fit only on earlier months and
 * predict it. `window` (months) uses a rolling window; null = expanding.
 */
function walkForwardFit(rows, { factors = FACTOR_NAMES, minTrain = 36, window = null, keepErrors = 24 } = {}) {
  const clean = cleanRows(rows, factors);
  if (clean.length < minTrain + 6) throw new TrackModelError(`נדרשים לפחות ${minTrain + 6} חודשים לבדיקה מחוץ למדגם (יש ${clean.length})`);
  const errs = [];
  const naive = [];
  const zero = [];
  const detail = [];
  for (let i = minTrain; i < clean.length; i++) {
    const train = clean.slice(window ? Math.max(0, i - window) : 0, i);
    const { b } = ols(train);
    const predicted = predictRow(b, clean[i].x);
    const actual = clean[i].ret;
    errs.push(predicted - actual);
    naive.push(mean(train.map((r) => r.ret)) - actual);
    zero.push(-actual);
    detail.push({ period: clean[i].period, predicted: round(predicted), actual: round(actual) });
  }
  const abs = errs.map(Math.abs);
  const mae = mean(abs);
  const naiveMae = mean(naive.map(Math.abs));
  return {
    ok: true,
    n: errs.length,
    from: detail[0].period,
    to: detail[detail.length - 1].period,
    window: window || "expanding",
    mae: round(mae, 3),
    rmse: round(Math.sqrt(mean(errs.map((e) => e * e))), 3),
    bias: round(mean(errs), 3),
    p90AbsError: round(quantile(abs, 0.9), 3),
    naiveMeanMae: round(naiveMae, 3),
    naiveZeroMae: round(mean(zero.map(Math.abs)), 3),
    skillVsNaive: naiveMae > 0 ? round(1 - mae / naiveMae, 3) : null,
    directionHitRate: round(mean(detail.map((d) => (Math.sign(d.predicted) === Math.sign(d.actual) ? 1 : 0))), 3),
    recent: detail.slice(-keepErrors),
    note: "בכל חודש המודל נאמד רק על חודשים קודמים. הבדיקה מניחה שתנועות השוק של אותו חודש ידועות — זו בדיקת הסבר ואומדן מוקדם, לא חיזוי של השוק.",
  };
}

function resolveShocks(scenario) {
  if (typeof scenario === "string") {
    const s = Object.prototype.hasOwnProperty.call(SCENARIOS, scenario) ? SCENARIOS[scenario] : null;
    if (!s) throw new TrackModelError(`תרחיש לא מוכר: ${scenario}. קיימים: ${Object.keys(SCENARIOS).join(", ")}`);
    return { name: scenario, he: s.he, shocks: s.shocks };
  }
  if (scenario && typeof scenario === "object") return { name: "custom", he: scenario.he || "תרחיש מותאם", shocks: scenario.shocks || scenario };
  throw new TrackModelError("scenario: שם תרחיש או אובייקט shocks");
}

function requireBetas(model) {
  if (!model || !model.betas || typeof model.betas !== "object") throw new TrackModelError("model.betas חובה");
  return model.betas;
}

/** Expected effect (percentage points) of a market scenario on a track. */
function scenarioImpact(model, scenario) {
  const betas = requireBetas(model);
  const { name, he, shocks } = resolveShocks(scenario);
  const contributions = {};
  const ignored = [];
  let impact = 0;
  for (const [f, move] of Object.entries(shocks)) {
    if (f === "he") continue;
    if (typeof betas[f] !== "number") { ignored.push(f); continue; }
    if (typeof move !== "number" || !Number.isFinite(move)) throw new TrackModelError(`זעזוע לא מספרי עבור ${f}`);
    contributions[f] = round(betas[f] * move);
    impact += betas[f] * move;
  }
  const band = model.accuracy && typeof model.accuracy.p90AbsError === "number" ? model.accuracy.p90AbsError : null;
  return {
    ok: true,
    scenario: name,
    description: he,
    shocks,
    impact: round(impact),
    range: band == null ? null : { low: round(impact - band), high: round(impact + band), basis: "טעות מוחלטת באחוזון 90 בבדיקה מחוץ למדגם" },
    contributions,
    ignoredFactors: ignored,
    note: "השפעה צפויה אם התרחיש מתממש בתוך חודש, לפי הרגישות ההיסטורית של המסלול. גודל הזעזוע הוא הדגמה, לא תחזית.",
  };
}

/**
 * How often a scenario's market moves actually happened in the factor
 * history: in a single month, and cumulatively within any 3- or 12-month
 * window. A scenario with several factors counts only when all of them
 * moved at least that much in the same window.
 */
function scenarioFrequency(history, scenario) {
  const { shocks } = resolveShocks(scenario);
  const entries = Object.entries(shocks).filter(([f, v]) => FACTORS[f] && typeof v === "number" && v !== 0);
  if (!history || !Array.isArray(history.periods) || !entries.length) return null;
  const n = history.periods.length;
  const count = (w) => {
    let hits = 0;
    for (let i = w - 1; i < n; i++) {
      const ok = entries.every(([f, v]) => {
        let g = 1;
        for (let t = i - w + 1; t <= i; t++) g *= 1 + history.factors[f][t] / 100;
        const cum = (g - 1) * 100;
        return v < 0 ? cum <= v : cum >= v;
      });
      if (ok) hits++;
    }
    return { hits, windows: n - w + 1, share: round(hits / (n - w + 1), 3) };
  };
  return { from: history.periods[0], to: history.periods[n - 1], oneMonth: count(1), threeMonths: count(3), twelveMonths: count(12) };
}

/** All named scenarios for one model. */
function scenarioTable(model) {
  return Object.keys(SCENARIOS).map((k) => {
    const r = scenarioImpact(model, k);
    return { scenario: k, description: r.description, impact: r.impact, range: r.range };
  });
}

/**
 * Early estimate of a month's return from month-to-date factor moves.
 * `elapsedShare` (0–1) scales alpha when the month is not over yet.
 */
/**
 * Chance that the month's official return ends below zero, given an early
 * estimate made when `elapsedShare` of the month has passed. The rest of the
 * month is taken at the track's average monthly return with its usual
 * volatility (both from the last 60 months of factor history), plus the
 * estimate's own error. Checked at mid-month on 715 category-months
 * (2017–2026, each fitted on the past only): Brier score 0.134 against 0.200
 * for the plain share of negative months; when it said 70–90% the month
 * ended negative 86% of the time, and above 90% — 96%. Between 10% and 30%
 * it overstates (said 20%, happened 8%). A second check with weekly closes
 * (equities and the dollar only) around days 8, 15, 22 and 27 gave a skill
 * of 14%, 30%, 45% and 66% over the base rate, and every month it put above
 * 90% ended negative (7, 14, 45 and 78 months).
 */
function negativeMonthProbability(model, estimate, { elapsedShare = 1, history = null } = {}) {
  const betas = requireBetas(model);
  if (!Number.isFinite(estimate) || !history || !Array.isArray(history.periods) || history.periods.length < 36) return null;
  const names = Object.keys(betas);
  const n = Math.min(60, history.periods.length);
  const tail = Object.fromEntries(names.map((f) => [f, history.factors[f].slice(-n)]));
  const mu = Object.fromEntries(names.map((f) => [f, mean(tail[f])]));
  let factorVar = 0;
  for (const f of names) for (const g of names) {
    let c = 0;
    for (let t = 0; t < n; t++) c += (tail[f][t] - mu[f]) * (tail[g][t] - mu[g]);
    factorVar += betas[f] * betas[g] * (c / (n - 1));
  }
  const resid = Number.isFinite(model.residualSd) ? model.residualSd : model.accuracy && Number.isFinite(model.accuracy.p90AbsError) ? model.accuracy.p90AbsError / 1.645 : 0.45;
  const monthlyMean = (model.alpha || 0) + names.reduce((t, f) => t + betas[f] * mu[f], 0);
  const rest = 1 - elapsedShare;
  // the estimate already holds the constant for the elapsed part of the month
  const centre = estimate + rest * monthlyMean;
  const sdAll = Math.sqrt(rest * (factorVar + resid * resid) + resid * resid);
  if (!(sdAll > 0)) return null;
  // standard normal CDF (Abramowitz–Stegun 7.1.26)
  const below = (threshold) => {
    const z = (threshold - centre) / sdAll;
    const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
    const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
    return 0.5 * (1 + (z >= 0 ? erf : -erf));
  };
  const p = below(0);
  const p1 = below(-1);
  return {
    probability: round(p, 2),
    // the same check for a fall of more than 1%: skill of 37%, 50% and 68% on days 15, 22 and 27
    declineOver1Probability: round(p1, 2),
    expectedMonthEnd: round(centre),
    text: `הסיכוי המוערך שהחודש יסתיים בירידה: ${Math.round(p * 100)}%; בירידה של יותר מ-1%: ${Math.round(p1 * 100)}%`,
    note: "מדד מחקרי. נבדק בימים 8, 15, 22 ו-27 בחודש על כ-600 חודשים (2017–2026): כשהמדד היה מעל 90%, כל החודשים הסתיימו בירידה; בין 70% ל-90% — כ-9 מכל 10 (ביום 8: 3 מכל 4). ככל שהחודש מתקדם המדד חד יותר. הוא מתייחס לחודש הנוכחי בלבד ואינו חוזה את החודש הבא.",
  };
}

function nowcast(model, mtdFactors, { elapsedShare = 1, history = null } = {}) {
  const betas = requireBetas(model);
  if (!mtdFactors || typeof mtdFactors !== "object") throw new TrackModelError("factors: תנועות השוק מתחילת החודש, באחוזים");
  const missing = Object.keys(betas).filter((f) => typeof mtdFactors[f] !== "number" || !Number.isFinite(mtdFactors[f]));
  if (missing.length) throw new TrackModelError(`חסרים גורמים: ${missing.join(", ")}`);
  if (!(elapsedShare > 0 && elapsedShare <= 1)) throw new TrackModelError("elapsedShare בין 0 ל־1");
  const contributions = Object.fromEntries(Object.keys(betas).map((f) => [f, round(betas[f] * mtdFactors[f])]));
  const alphaPart = (model.alpha || 0) * elapsedShare;
  const estimate = alphaPart + Object.keys(betas).reduce((s, f) => s + betas[f] * mtdFactors[f], 0);
  const band = model.accuracy && typeof model.accuracy.p90AbsError === "number" ? model.accuracy.p90AbsError : null;
  return {
    ok: true,
    estimate: round(estimate),
    negativeMonth: negativeMonthProbability(model, estimate, { elapsedShare, history }),
    range: band == null ? null : { low: round(estimate - band), high: round(estimate + band), coverage: 0.9, method: "walk_forward_errors" },
    contributions: { alpha: round(alphaPart), ...contributions },
    partialMonth: elapsedShare < 1,
    note: "אומדן מוקדם לפי תנועות השוק עד כה. אינו תשואה רשמית; התשואה הרשמית מתפרסמת על ידי רשות שוק ההון לאחר סוף החודש. אם החודש לא הסתיים — המספר ישתנה.",
  };
}

/**
 * Attribute the gap between two periods to the factors.
 * periodA / periodB: arrays of monthly rows { period, ret, factors }.
 * Uses sums of monthly contributions; the compounding difference is
 * reported inside `unexplained`.
 */
function attributeDifference(model, periodA, periodB, { labels = ["A", "B"] } = {}) {
  const betas = requireBetas(model);
  const factors = Object.keys(betas);
  const a = cleanRows(periodA, factors);
  const b = cleanRows(periodB, factors);
  if (!a.length || !b.length) throw new TrackModelError("נדרשים חודשים עם נתונים מלאים בשתי התקופות");
  const part = (rows) => {
    const byFactor = Object.fromEntries(factors.map((f, i) => [f, rows.reduce((s, r) => s + betas[f] * r.x[i + 1], 0)]));
    return { months: rows.length, from: rows[0].period, to: rows[rows.length - 1].period, actual: compound(rows.map((r) => r.ret)), byFactor, alpha: (model.alpha || 0) * rows.length };
  };
  const pa = part(a);
  const pb = part(b);
  const gap = pb.actual - pa.actual;
  const byFactor = Object.fromEntries(factors.map((f) => [f, round(pb.byFactor[f] - pa.byFactor[f])]));
  const explained = factors.reduce((s, f) => s + (pb.byFactor[f] - pa.byFactor[f]), 0) + (pb.alpha - pa.alpha);
  return {
    ok: true,
    [labels[0]]: { months: pa.months, from: pa.from, to: pa.to, actualReturn: round(pa.actual) },
    [labels[1]]: { months: pb.months, from: pb.from, to: pb.to, actualReturn: round(pb.actual) },
    gap: round(gap),
    byFactor,
    differentLength: pa.months !== pb.months ? round(pb.alpha - pa.alpha) : 0,
    unexplained: round(gap - explained),
    warnings: pa.months !== pb.months ? ["התקופות אינן באורך זהה — ההשוואה אינה תפוחים לתפוחים"] : [],
    note: "פירוק הפער לפי רגישות המסלול לגורמי השוק. 'unexplained' כולל השפעות ייחודיות למסלול (בחירת נכסים, נכסים לא סחירים, שינוי חשיפות) ואת הפרש הריבית דריבית.",
  };
}

/**
 * Deposit-timing statistics from a track's own monthly returns (oldest first).
 * Answers "one deposit now, or spread over a few months?" with history only.
 */
function depositTimingStats(monthlyReturns, { splitMonths = 3, horizons = [12, 36, 60] } = {}) {
  const r = (monthlyReturns || []).map((v) => (v && typeof v === "object" ? v.ret : v)).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (r.length < 36) throw new TrackModelError(`נדרשים לפחות 36 חודשי תשואה (יש ${r.length})`);
  if (!(Number.isInteger(splitMonths) && splitMonths >= 2 && splitMonths <= 12)) throw new TrackModelError("splitMonths: מספר שלם בין 2 ל־12");

  // lump sum at start of month i vs equal parts at the start of months i..i+k-1, valued at the end of month i+k-1
  const diffs = [];
  for (let i = 0; i + splitMonths <= r.length; i++) {
    const growth = (from) => r.slice(from, i + splitMonths).reduce((p, v) => p * (1 + v / 100), 1);
    const lump = growth(i);
    let split = 0;
    for (let j = 0; j < splitMonths; j++) split += growth(i + j) / splitMonths;
    diffs.push((lump - split) * 100);
  }

  const afterNeg = [];
  const afterPos = [];
  for (let i = 1; i < r.length; i++) (r[i - 1] < 0 ? afterNeg : afterPos).push(r[i]);

  // what followed: average return, average size of the move, and how often it was large or negative
  const followStats = (next) => ({
    n: next.length,
    meanNextMonth: next.length ? round(mean(next)) : null,
    meanAbsNextMonth: next.length ? round(mean(next.map(Math.abs))) : null,
    moveAbove2Share: next.length ? round(mean(next.map((v) => (Math.abs(v) > 2 ? 1 : 0))), 3) : null,
    negativeShare: next.length ? round(mean(next.map((v) => (v < 0 ? 1 : 0))), 3) : null,
  });

  const holding = horizons.filter((h) => r.length >= h + 12).map((h) => {
    const w = [];
    for (let i = 0; i + h <= r.length; i++) w.push(compound(r.slice(i, i + h)));
    return { months: h, windows: w.length, positiveShare: round(mean(w.map((v) => (v > 0 ? 1 : 0))), 3), median: round(quantile(w, 0.5)), worst: round(Math.min(...w)), best: round(Math.max(...w)) };
  });

  // drawdowns on the cumulative index
  const draws = [];
  let level = 1;
  let peak = 1;
  let peakAt = -1;
  let cur = null;
  r.forEach((v, i) => {
    level *= 1 + v / 100;
    if (level >= peak) {
      if (cur) { cur.recoveredAfterMonths = i - cur.peakIndex; draws.push(cur); cur = null; }
      peak = level; peakAt = i;
    } else {
      const depth = (level / peak - 1) * 100;
      if (!cur) cur = { peakIndex: peakAt, troughIndex: i, depth, recoveredAfterMonths: null };
      if (depth < cur.depth) { cur.depth = depth; cur.troughIndex = i; }
    }
  });
  // where the track stands now against its peak; `deepest` is the low point of the same decline
  const current = cur ? { depth: round((level / peak - 1) * 100), deepest: round(cur.depth), monthsSincePeak: r.length - 1 - cur.peakIndex } : { depth: 0, deepest: 0, monthsSincePeak: 0 };
  const worst = draws.concat(cur ? [cur] : []).sort((x, y) => x.depth - y.depth).slice(0, 5)
    .map((d) => ({ depth: round(d.depth), monthsToTrough: d.troughIndex - d.peakIndex, recoveredAfterMonths: d.recoveredAfterMonths }));

  return {
    ok: true,
    months: r.length,
    lumpVsSplit: {
      splitMonths,
      windows: diffs.length,
      lumpBetterShare: round(mean(diffs.map((d) => (d > 0 ? 1 : 0))), 3),
      meanAdvantage: round(mean(diffs)),
      worst5pct: round(quantile(diffs, 0.05)),
      best5pct: round(quantile(diffs, 0.95)),
      note: "יתרון ההפקדה החד־פעמית על פני פריסה, בנקודות אחוז, בסוף תקופת הפריסה. הכסף שממתין להפקדה מחושב ללא תשואה.",
    },
    afterNegativeMonth: followStats(afterNeg),
    afterPositiveMonth: followStats(afterPos),
    volatilityNote: "במחקר 2012–2026: אחרי חודש שלילי, החודש הבא תנודתי יותר (לשני הכיוונים) — אך הכיוון עצמו אינו צפוי.",
    monthlyVolatility: round(sd(r)),
    negativeMonthsShare: round(mean(r.map((v) => (v < 0 ? 1 : 0))), 3),
    holding,
    worstDrawdowns: worst,
    currentDrawdown: current,
    note: "סטטיסטיקה היסטורית של המסלול עצמו. אינה תחזית ואינה המלצה אישית; ההחלטה על הפקדה תלויה בצרכים ובאופק של הלקוח ונבדקת על ידי בעלת הרישיון.",
  };
}

/**
 * What followed past declines that reached a given depth below the previous
 * month-end peak: how often they deepened, and how long until the peak was
 * regained, counted from the month the decline first reached that depth.
 * Unlike a table of finished declines sorted by their final depth, this
 * conditions only on what is known at the time. Descriptive, not a forecast.
 */
function declineOutlook(monthlyReturns, { depth, deeper = null } = {}) {
  const r = (monthlyReturns || []).map((v) => (v && typeof v === "object" ? v.ret : v)).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (r.length < 36) throw new TrackModelError(`נדרשים לפחות 36 חודשי תשואה (יש ${r.length})`);
  const d = Math.abs(Number(depth));
  if (!(d > 0 && d < 100)) throw new TrackModelError("depth: עומק הירידה באחוזים (מספר חיובי)");
  const deeperAt = deeper == null ? Math.max(2 * d, d + 2) : Math.abs(Number(deeper));
  const closed = [];
  let level = 1; let peak = 1; let cur = null;
  r.forEach((v, i) => {
    level *= 1 + v / 100;
    if (level >= peak) {
      if (cur && cur.reachedAt != null) { cur.monthsToRecover = i - cur.reachedAt; closed.push(cur); }
      peak = level; cur = null;
    } else {
      const dd = (1 - level / peak) * 100;
      if (!cur) cur = { reachedAt: null, maxDepth: 0, monthsToRecover: null };
      if (dd > cur.maxDepth) cur.maxDepth = dd;
      if (cur.reachedAt == null && dd >= d) cur.reachedAt = i;
    }
  });
  // A decline that reached the depth and has not ended yet is part of the record: it counts in
  // "how often it deepened", and as "not recovered within N months" once N months have passed.
  const open = cur && cur.reachedAt != null ? { ...cur, monthsSoFar: r.length - 1 - cur.reachedAt } : null;
  const all = open ? closed.concat([open]) : closed;
  const n = all.length;
  const months = closed.map((e) => e.monthsToRecover);
  const within = (m) => {
    const known = closed.length + (open && open.monthsSoFar >= m ? 1 : 0);
    return known ? round(closed.filter((e) => e.monthsToRecover <= m).length / known, 2) : null;
  };
  return {
    ok: true,
    depth: round(d),
    episodes: n,
    finishedEpisodes: closed.length,
    deepenedBeyond: round(deeperAt),
    // an open decline is a known "deepened" once it has; until then its outcome is unknown and it is left out
    deepenedShare: closed.length + (open && open.maxDepth >= deeperAt ? 1 : 0) ? round((all.filter((e) => e.maxDepth >= deeperAt).length) / (closed.length + (open && open.maxDepth >= deeperAt ? 1 : 0)), 2) : null,
    medianFinalDepth: closed.length ? round(-quantile(closed.map((e) => e.maxDepth), 0.5)) : null,
    worstFinalDepth: n ? round(-Math.max(...all.map((e) => e.maxDepth))) : null,
    medianMonthsToRecover: months.length ? round(quantile(months, 0.5), 1) : null,
    longestMonthsToRecover: months.length || open ? Math.max(...months, open ? open.monthsSoFar : 0) : null,
    longestStillOpen: !!(open && open.monthsSoFar >= Math.max(0, ...months)),
    recoveredWithin: { months6: within(6), months12: within(12), months24: within(24) },
    inProgress: open ? { depthSoFar: round(-open.maxDepth), monthsSinceReached: open.monthsSoFar } : null,
    months: r.length,
    reliable: n >= 8,
    note: `מה שקרה בעבר אחרי שהמסלול ירד ${round(d)}% ומעלה מהשיא (לפי סוף חודש), מהחודש שבו הגיע לעומק הזה. ירידה שעדיין לא הסתיימה נספרת. ${n < 8 ? "מעט מקרים — לא בסיס למסקנה. " : ""}תיאור העבר, לא תחזית.`,
  };
}

/**
 * Where the calendar year is heading: official months so far, months that
 * are only estimated (each with its own error), and the months still ahead
 * at the track's long-run monthly average. The range is an 80% interval
 * built from the estimates' errors and recent (EWMA) volatility; in a check
 * on 1999–2026 such ranges held in about 75–90% of the years.
 *   history:   [{ period: "YYYYMM", ret }] official monthly returns
 *   estimates: [{ period, estimate, errorSd, elapsedShare }] months after the
 *              last official one, in order
 */
function yearEndProjection(history, { estimates = [] } = {}) {
  const rows = (history || []).filter((x) => x && /^\d{6}$/.test(String(x.period)) && Number.isFinite(x.ret)).map((x) => ({ period: String(x.period), ret: x.ret }));
  if (rows.length < 36) throw new TrackModelError(`נדרשים לפחות 36 חודשי תשואה רשמיים (יש ${rows.length})`);
  const lastOfficial = rows[rows.length - 1].period;
  const est = new Map((estimates || []).filter((e) => e && /^\d{6}$/.test(String(e.period)) && Number.isFinite(e.estimate) && String(e.period) > lastOfficial)
    .map((e) => [String(e.period), { period: String(e.period), estimate: e.estimate, errorSd: Number.isFinite(e.errorSd) ? Math.abs(e.errorSd) : 0.5, elapsedShare: e.elapsedShare > 0 && e.elapsedShare <= 1 ? e.elapsedShare : 1 }]));
  // The projection stays with the year of the last official month until that year's December
  // is official; only then does an estimate for January open the next year.
  const yearDone = lastOfficial.endsWith("12");
  const year = yearDone && est.size ? String(Number(lastOfficial.slice(0, 4)) + 1) : lastOfficial.slice(0, 4);
  const all = rows.map((x) => x.ret);
  const mu = mean(all);
  let wSum = 0; let wVar = 0;
  for (let i = all.length - 1, w = 1; i >= 0; i--, w *= 0.94) { wSum += w; wVar += w * (all[i] - mu) ** 2; }
  const monthlySd = Math.sqrt(wVar / wSum);

  const official = rows.filter((x) => x.period.startsWith(year));
  let growth = official.reduce((g, x) => g * (1 + x.ret / 100), 1);
  let variance = 0;
  const estimated = [];
  let averaged = 0; // months with neither an official figure nor an estimate
  const firstOpen = official.length ? Number(official[official.length - 1].period.slice(4)) + 1 : 1;
  for (let m = firstOpen; m <= 12; m++) {
    const e = est.get(`${year}${String(m).padStart(2, "0")}`);
    if (e) {
      const rest = 1 - e.elapsedShare; // the part of a partial month still ahead
      growth *= 1 + (e.estimate + mu * rest) / 100;
      variance += e.errorSd ** 2 + rest * monthlySd ** 2;
      estimated.push(e);
    } else {
      growth *= 1 + mu / 100;
      variance += monthlySd ** 2;
      averaged++;
    }
  }
  const central = (growth - 1) * 100;
  const half = 1.2816 * Math.sqrt(variance) * growth;
  const complete = official.length === 12;
  return {
    ok: true,
    year: Number(year),
    officialThrough: official.length ? official[official.length - 1].period : null,
    officialYearToDate: official.length ? round(compound(official.map((x) => x.ret))) : null,
    estimatedMonths: estimated.map((e) => ({ period: e.period, estimate: round(e.estimate), partial: e.elapsedShare < 1 })),
    averagedMonths: averaged,
    remainingMonths: averaged,
    assumedMonthlyAverage: round(mu),
    monthlyVolatilityUsed: round(monthlySd),
    central: round(central),
    range: complete ? null : { low: round(central - half), high: round(central + half), coverage: 0.8 },
    complete,
    note: complete ? "השנה הסתיימה — זו התשואה הרשמית." : "הערכה מחקרית לסיום השנה: החודשים הרשמיים, אומדן לחודשים שיש עליהם נתוני שוק, וממוצע רב-שנתי לשאר החודשים. הטווח הוא התחזית; אינו תשואה מובטחת.",
  };
}

/**
 * Volatility outlook for the coming month, from the track's own history.
 * Research (2012–2026): after a negative month the next month's move tends
 * to be larger, in EITHER direction; the direction itself is not predictable.
 * `currentMonthEstimate` (percent) lets the caller use an early estimate of
 * a month whose official figure is not out yet. Descriptive statistic — a
 * research-stage indicator under Module 9.6, not an approved forecast.
 */
function riskOutlook(monthlyReturns, { currentMonthEstimate = null, largeMove = 2 } = {}) {
  const r = (monthlyReturns || []).map((v) => (v && typeof v === "object" ? v.ret : v)).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (r.length < 36) throw new TrackModelError(`נדרשים לפחות 36 חודשי תשואה (יש ${r.length})`);
  const after = { negative: [], positive: [] };
  for (let i = 1; i < r.length; i++) after[r[i - 1] < 0 ? "negative" : "positive"].push(r[i]);
  const stats = (next) => ({
    n: next.length,
    meanAbsMove: next.length ? round(mean(next.map(Math.abs))) : null,
    largeMoveShare: next.length ? round(mean(next.map((v) => (Math.abs(v) > largeMove ? 1 : 0))), 3) : null,
    negativeShare: next.length ? round(mean(next.map((v) => (v < 0 ? 1 : 0))), 3) : null,
  });
  const neg = stats(after.negative);
  const pos = stats(after.positive);
  const usedEstimate = typeof currentMonthEstimate === "number" && Number.isFinite(currentMonthEstimate);
  const last = usedEstimate ? currentMonthEstimate : r[r.length - 1];
  const elevated = last < 0;
  const enough = neg.n >= 12 && pos.n >= 12;
  const ratio = enough && pos.largeMoveShare > 0 ? round(neg.largeMoveShare / pos.largeMoveShare, 1) : null;
  const pctText = (x) => `${Math.round(x * 100)}%`;
  return {
    ok: true,
    state: !enough ? "insufficient_history" : elevated ? "elevated_volatility" : "normal_volatility",
    basedOn: { lastMonthReturn: round(last), isEarlyEstimate: usedEstimate },
    largeMoveThreshold: largeMove,
    afterNegativeMonth: neg,
    afterPositiveMonth: pos,
    largeMoveRatio: ratio,
    statement: !enough
      ? "אין מספיק היסטוריה כדי להעריך את רמת התנודתיות."
      : elevated
        ? `החודש האחרון${usedEstimate ? " (לפי אומדן מוקדם)" : ""} שלילי. בהיסטוריה של המסלול, אחרי חודש שלילי הייתה תנועה של יותר מ-${largeMove}% (למעלה או למטה) ב-${pctText(neg.largeMoveShare)} מהמקרים, לעומת ${pctText(pos.largeMoveShare)} אחרי חודש חיובי. הכיוון אינו צפוי: החודש הבא היה שלילי ב-${pctText(neg.negativeShare)} מהמקרים, לעומת ${pctText(pos.negativeShare)}.`
        : `החודש האחרון${usedEstimate ? " (לפי אומדן מוקדם)" : ""} חיובי. בהיסטוריה של המסלול, אחרי חודש חיובי הייתה תנועה של יותר מ-${largeMove}% ב-${pctText(pos.largeMoveShare)} מהמקרים.`,
    note: "סטטיסטיקה תיאורית מההיסטוריה של המסלול. אינדיקטור בשלב מחקרי (מודול 9.6) — אינו תחזית מאושרת ואינו חוזה כיוון.",
  };
}

/**
 * Can last month's market moves predict this month's track return?
 * Walk-forward, compared with the historical-mean forecast.
 */
function predictabilityTest(rows, { factors = FACTOR_NAMES, minTrain = 60 } = {}) {
  const clean = cleanRows(rows, factors);
  const lagged = [];
  for (let i = 1; i < clean.length; i++) lagged.push({ period: clean[i].period, ret: clean[i].ret, x: clean[i - 1].x });
  if (lagged.length < minTrain + 12) throw new TrackModelError(`נדרשים לפחות ${minTrain + 13} חודשים (יש ${clean.length})`);
  const errs = [];
  const naive = [];
  let hit = 0;
  let alwaysUp = 0;
  let negCalls = 0;
  let negRight = 0;
  for (let i = minTrain; i < lagged.length; i++) {
    const train = lagged.slice(0, i);
    const { b } = ols(train);
    const p = predictRow(b, lagged[i].x);
    const a = lagged[i].ret;
    errs.push(Math.abs(p - a));
    naive.push(Math.abs(mean(train.map((t) => t.ret)) - a));
    if (Math.sign(p) === Math.sign(a)) hit++;
    if (a > 0) alwaysUp++;
    if (p < 0) { negCalls++; if (a < 0) negRight++; }
  }
  const n = errs.length;
  const mae = mean(errs);
  const naiveMae = mean(naive);
  const improves = mae < naiveMae * 0.97 && hit / n > alwaysUp / n;
  return {
    ok: true,
    n,
    mae: round(mae, 3),
    naiveMeanMae: round(naiveMae, 3),
    directionHitRate: round(hit / n, 3),
    alwaysPositiveHitRate: round(alwaysUp / n, 3),
    declineCalls: negCalls,
    declineCallsCorrect: negRight,
    verdict: improves ? "possible_signal_needs_validation" : "no_predictive_value",
    conclusion: improves
      ? "נמצא שיפור מול הממוצע ההיסטורי. לפני שימוש נדרשת בדיקה לפי מודול 9.6.6 (ריבוי בדיקות, משטרי שוק)."
      : "תנועות השוק של החודש הקודם אינן משפרות את חיזוי החודש הבא מול הממוצע ההיסטורי. אין בסיס לטעון לחיזוי עיתוי של ירידות.",
  };
}

/** Pick a model from the stored baseline by category name or fund id. */
function findBaselineModel(baseline, { category, fundId } = {}) {
  if (!baseline) return null;
  if (fundId != null) {
    const f = (baseline.funds || []).find((x) => String(x.fundId) === String(fundId));
    if (f) return { ...f, kind: "fund" };
  }
  if (category) {
    const cats = baseline.categories || [];
    const exact = cats.find((x) => x.category === category);
    if (exact) return { ...exact, kind: "category" };
    // a partial name is accepted only when it points at exactly one category
    const partial = cats.filter((x) => x.category.includes(category));
    if (partial.length === 1) return { ...partial[0], kind: "category" };
    if (partial.length > 1) throw new TrackModelError(`"${category}" מתאים לכמה סוגי מסלולים — ציינו שם מלא: ${partial.map((x) => x.category).join(" | ")}`);
  }
  return null;
}

module.exports = {
  FACTORS, FACTOR_NAMES, SCENARIOS, TrackModelError,
  fitFactorModel, walkForwardFit, scenarioImpact, scenarioTable, scenarioFrequency, nowcast, negativeMonthProbability,
  attributeDifference, depositTimingStats, declineOutlook, yearEndProjection, riskOutlook, predictabilityTest, findBaselineModel,
};
