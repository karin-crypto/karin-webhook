"use strict";

/**
 * OFEK TRACK FORECAST — expected return RANGE for a savings track over one,
 * three, five and ten years.
 *
 * Method (all inputs and assumptions are returned with every forecast):
 *   1. The track's sensitivities to five market factors (track-model.js).
 *   2. Two anchors for what the factors may deliver:
 *        - historical: their average monthly change since 2012;
 *        - yield-based: government-bond yields published by the Bank of
 *          Israel, plus stated premiums for corporate bonds and equities.
 *      The centre is the average of the two; for tracks with almost no
 *      equity sensitivity it is the yield-based anchor alone.
 *   3. A range around the centre: k(horizon) × the track's annual
 *      volatility, where volatility blends the long-run level with the
 *      recent one (EWMA), so the range widens after turbulent months.
 *
 * What the backtest showed (19 track categories, forecast origins 2011–2026,
 * market data from 2008 so the 2008 crisis is in the sample): about 83% of
 * realised returns fell inside the range, about 4% below it and about 14%
 * above it. One-year outcomes are wide — a single number for one year is
 * not reliable; the range is the forecast.
 *
 * Units: percent. Nothing here fetches data, and nothing here is a promise
 * of return.
 */

const { FACTOR_NAMES, TrackModelError } = require("./track-model");

// k = how many "annual volatilities" wide the range is on each side. For the backtested
// horizons it is 1.1 × the theoretical 80% multiplier (1.2816 / √years); the extra 10%
// covers uncertainty about the centre. The 10-year multiplier is wider still and untested.
const HORIZONS = [
  { months: 12, key: "1y", label: "שנה", k: 1.41, backtested: true },
  { months: 36, key: "3y", label: "3 שנים", k: 0.81, backtested: true },
  { months: 60, key: "5y", label: "5 שנים", k: 0.63, backtested: true },
  { months: 120, key: "10y", label: "10 שנים", k: 0.5, backtested: false },
];

// Weight of a single track's own unexplained return against its category's. Tested on
// general tracks 2013–2023: the slope of future on past unexplained return averaged 0.16
// (pooled 0.36) and changed sign between periods.
const OWN_ALPHA_WEIGHT = 0.25;

// EWMA decay for recent volatility (monthly data).
const EWMA_LAMBDA = 0.94;

// Judgmental long-run premiums (percent per year). Stated, not estimated.
const DEFAULT_ASSUMPTIONS = {
  equityPremium: 4, // equities over the 10-year government yield
  corporateSpread: 1, // corporate bonds over the 5-year government yield
  usdDrift: 0, // expected yearly change of USD/ILS
  // The model's S&P 500 factor is the price index (no dividends), while the equity premium
  // and the valuation fit are total-return figures. A track's dividends sit in its fitted
  // alpha, so the S&P anchors are taken net of the dividend yield to avoid counting it twice.
  // (Tel Aviv indices are gross total-return indices, so TA-125 needs no such correction.)
  spxDividendYield: 1.1,
};

// Valuation anchor for the S&P 500: ten-year nominal total return (percent a year) regressed on
// the Shiller earnings yield (100 / CAPE), monthly data 1881–2023 (public-domain Shiller dataset).
// Out of sample the rule beat the historical mean at ten years (R² about 20–28% for origins from
// 1930 or 1960), had about a third of that at five years, and none at one year or since 1990.
const VALUATION_FIT = { intercept: 3.37, slope: 0.85, residualSd: 4.46, sample: "1881–2023", horizonYears: 10 };

// Bounds (percent per year) on the unexplained return carried into a forecast.
const ALPHA_BOUNDS = { low: -1.5, high: 3.5 };

const BACKTEST = {
  period: "2011–2026 (נתוני שוק מ-2008, כולל משבר 2008)",
  categories: 19,
  forecasts: { "1y": 2191, "3y": 1735, "5y": 1279 },
  insideShare: 0.83,
  belowShare: 0.04,
  aboveShare: 0.14,
  byHorizon: { "1y": { inside: 0.81, below: 0.05, above: 0.14 }, "3y": { inside: 0.83, below: 0.03, above: 0.14 }, "5y": { inside: 0.86, below: 0.03, above: 0.11 } },
  meanAbsErrorGeneralTrack: { "1y": 4.6, "3y": 2.1, "5y": 1.6 }, // percentage points per year
  independentWindows: { "1y": 15, "3y": 5, "5y": 3 },
  // the same rule applied to 70 individual tracks of specific companies (not category medians), 2012–2026
  individualTracks: { tracks: 70, forecasts: { "1y": 1895, "3y": 1335, "5y": 792 }, inside: { "1y": 0.82, "3y": 0.83, "5y": 0.93 }, below: { "1y": 0.05, "3y": 0, "5y": 0 }, meanAbsError: { "1y": 5.4, "3y": 2.6, "5y": 1.9 } },
  lossProbabilityNote: "הסיכוי להפסד שהמודל נותן שמרני: בבדיקה על מסלולים בודדים, כשהמודל נתן 15% עד 25% להפסד אחרי שנה, הפסד קרה ב-9% מהמקרים; ל-3 ול-5 שנים כמעט לא נרשמו הפסדים בתקופה שנבדקה.",
  persistence: "בין מסלולים כלליים של חברות שונות, רמת התנודתיות נשמרה מתקופה לתקופה (מתאם ממוצע 0.84), ואילו התשואה היחסית כמעט לא (0.12, ובחלק מהתקופות התהפכה).",
  tenYearCheck: "אופק 10 שנים לא נבדק כתחזית. לשם בדיקת סבירות: בכל 215 התקופות של 10 שנים במסלול הכללי החציוני (1999–2026) התשואה השנתית הממוצעת הייתה בין 3.6% ל-7.8%.",
  note: "בדיקה חודש-חודש: בכל נקודה המודל ראה רק את העבר. התחזיות חופפות בזמן, ולכן מספר התקופות הבלתי תלויות קטן (כ-15 של שנה, 5 של 3 שנים, 3 של 5 שנים). רוב החריגות היו כלפי מעלה: בתקופה הזו התחזית הייתה נמוכה מהתוצאה ב-1.5 עד 2.5 נקודות אחוז לשנה בממוצע. בקרנות פנסיה מקיפות לפי גיל התחזית ל-5 שנים הייתה נמוכה מהתוצאה ברוב המקרים.",
};

// What the median general track (provident / study funds) actually did, 1999–2026:
// annualised return over every rolling window of each length (official monthly data).
const GENERAL_TRACK_RECORD = {
  period: "1999–2026", months: 334,
  windows: {
    "1y": { min: -22.6, p10: -2.5, median: 7.5, p90: 14.4, max: 34.6, negativeShare: 0.17 },
    "3y": { min: -3.6, p10: 3.0, median: 5.4, p90: 10.9, max: 13.7, negativeShare: 0.02 },
    "5y": { min: 1.1, p10: 3.5, median: 5.8, p90: 9.1, max: 11.7, negativeShare: 0 },
    "10y": { min: 3.6, p10: 4.4, median: 5.8, p90: 7.0, max: 7.8, negativeShare: 0 },
  },
  worstCalendarYear: { year: 2008, return: -23 }, bestCalendarYear: { year: 2009, return: 35 },
  // declines from a month-end peak, and the months from that peak until it was regained
  drawdowns: {
    // counted from the month-end at which the decline first reached that depth (known at the time)
    onceDown: [
      { depth: 1, episodes: 19, deepenedTo: 3, deepenedShare: 0.53, medianMonthsToRecover: 4, within6: 0.63, within12: 0.79, within24: 1, longestMonths: 24 },
      { depth: 3, episodes: 10, deepenedTo: 6, deepenedShare: 0.4, medianMonthsToRecover: 10, within6: 0.3, within12: 0.6, within24: 1, longestMonths: 22 },
    ],
    "5plus": { declines: 4, medianMonthsToRecover: 21.5, longestMonthsToRecover: 25, episodes: [
      { peak: "2007-10", trough: "2008-12", depth: -24.0, monthsToRecover: 25 },
      { peak: "2011-02", trough: "2011-09", depth: -6.7, monthsToRecover: 19 },
      { peak: "2020-01", trough: "2020-03", depth: -10.8, monthsToRecover: 10 },
      { peak: "2021-12", trough: "2022-09", depth: -8.5, monthsToRecover: 24 },
    ] },
    afterDeepDecline: "כשהמסלול היה 6% ומעלה מתחת לשיא (23 חודשים), 12 החודשים הבאים הניבו בממוצע 14% לעומת 6.7% בכל התקופה, אך ההבדל אינו מובהק סטטיסטית (4 אירועים בלבד) ואינו משמש לתחזית.",
    note: "לפי נתוני סוף חודש; בתוך החודש הירידות היו עמוקות יותר.",
  },
  note: "מה שקרה בפועל למסלול כללי חציוני בקופות גמל ובקרנות השתלמות, לפני דמי ניהול. תיאור העבר, לא תחזית.",
};

const round = (x, d = 1) => (Number.isFinite(x) ? Number(x.toFixed(d)) : null);
const annualise = (monthlyPct) => ((1 + monthlyPct / 100) ** 12 - 1) * 100;
const cumulate = (annualPct, months) => ((1 + Math.max(annualPct, -99) / 100) ** (months / 12) - 1) * 100;

/** Standard normal CDF (Abramowitz–Stegun 7.1.26). */
function normalCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** Mean and covariance of the monthly factor history ({ periods, factors: { name: [..] } }). */
function factorStats(history) {
  if (!history || !history.factors || !Array.isArray(history.periods)) throw new TrackModelError("היסטוריית גורמי השוק חסרה");
  const n = history.periods.length;
  if (n < 60) throw new TrackModelError("נדרשים לפחות 60 חודשים של גורמי שוק");
  const cols = FACTOR_NAMES.map((f) => {
    const c = history.factors[f];
    if (!Array.isArray(c) || c.length !== n || !c.every(Number.isFinite)) throw new TrackModelError(`היסטוריית הגורם ${f} חסרה או פגומה`);
    return c;
  });
  const mean = cols.map((c) => c.reduce((s, v) => s + v, 0) / n);
  const cov = cols.map((a, i) => cols.map((b, j) => a.reduce((s, v, t) => s + (v - mean[i]) * (b[t] - mean[j]), 0) / (n - 1)));
  return { n, from: history.periods[0], to: history.periods[n - 1], mean: Object.fromEntries(FACTOR_NAMES.map((f, i) => [f, mean[i]])), cov };
}

/**
 * Forecast for one track.
 *   model:   { alpha, betas, residualSd } (monthly, percent)
 *   history: monthly factor history
 *   yields:  { y5, y10, inflation?, asOf, source } — government zero-coupon yields, percent
 *   categoryAlpha: optional; the track's own alpha is averaged with it
 *                  (past out-performance of a single track persists only weakly)
 *   annualFee: optional yearly management fee to subtract (percent)
 */
function forecastTrack({ model, history, yields, assumptions = {}, categoryAlpha = null, annualFee = 0, horizons = HORIZONS, valuation = null, inflationLinked = null } = {}) {
  if (!model || !model.betas) throw new TrackModelError("model.betas חובה");
  const missing = FACTOR_NAMES.filter((f) => typeof model.betas[f] !== "number");
  if (missing.length) throw new TrackModelError(`חסרות רגישויות: ${missing.join(", ")}`);
  if (!yields || !Number.isFinite(yields.y5) || !Number.isFinite(yields.y10)) throw new TrackModelError("yields.y5 ו־yields.y10 חובה (תשואות אג\"ח ממשלתיות, באחוזים)");
  if (!(annualFee >= 0 && annualFee < 5)) throw new TrackModelError("annualFee: אחוז שנתי בין 0 ל־5");
  assumptions = assumptions || {};
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  for (const k of Object.keys(DEFAULT_ASSUMPTIONS)) if (!Number.isFinite(a[k])) throw new TrackModelError(`הנחה לא מספרית: ${k}`);

  const stats = factorStats(history);
  const beta = FACTOR_NAMES.map((f) => model.betas[f]);
  // The unexplained monthly return is averaged with the category's (weak persistence) and then
  // bounded: a large "alpha" in a 60-month fit is mostly noise or a change in the track's
  // character, and compounding it for ten years would dominate the forecast.
  const rawAlpha = Number.isFinite(categoryAlpha) ? OWN_ALPHA_WEIGHT * (model.alpha || 0) + (1 - OWN_ALPHA_WEIGHT) * categoryAlpha : model.alpha || 0;
  const alpha = Math.min(ALPHA_BOUNDS.high / 12, Math.max(ALPHA_BOUNDS.low / 12, rawAlpha));
  const alphaClamped = alpha !== rawAlpha;

  const userDividend = Number.isFinite(assumptions.spxDividendYield) && assumptions.spxDividendYield >= 0 && assumptions.spxDividendYield < 6 ? assumptions.spxDividendYield : null;
  const storedDividend = valuation && Number.isFinite(valuation.dividendYield) && valuation.dividendYield >= 0 && valuation.dividendYield < 6 ? valuation.dividendYield : null;
  const spxDividend = userDividend != null ? userDividend : storedDividend != null ? storedDividend : DEFAULT_ASSUMPTIONS.spxDividendYield;
  a.spxDividendYield = spxDividend;
  const yieldMonthly = { ta125: (yields.y10 + a.equityPremium) / 12, spx: (yields.y10 + a.equityPremium - spxDividend) / 12, usd: a.usdDrift / 12, gov: yields.y5 / 12, corp: (yields.y5 + a.corporateSpread) / 12 };
  const dot = (mu) => FACTOR_NAMES.reduce((s, f, i) => s + beta[i] * mu[f], 0);
  // Prudence cap: an equity index's historical average is not carried forward above
  // the government yield plus twice the equity premium (2012–2026 was an unusually good period).
  const equityCap = (yields.y10 + 2 * a.equityPremium) / 12;
  const histMean = { ...stats.mean, ta125: Math.min(stats.mean.ta125, equityCap), spx: Math.min(stats.mean.spx, equityCap) };
  const capped = ["ta125", "spx"].filter((f) => stats.mean[f] > equityCap);
  const historical = annualise(alpha + dot(histMean));
  const yieldBased = annualise(alpha + dot(yieldMonthly));

  const equitySensitivity = model.betas.ta125 + model.betas.spx;
  const bondLike = equitySensitivity < 0.15;
  // Third anchor, for the S&P 500 only: what its current valuation has implied historically.
  // It replaces a third of the weight of the two other S&P anchors.
  let valuationAnchor = null;
  let valuationEffect = 0;
  if (!bondLike && valuation && Number.isFinite(valuation.cape) && valuation.cape >= 5 && valuation.cape <= 80) {
    const spxValuationTotal = VALUATION_FIT.intercept + VALUATION_FIT.slope * (100 / valuation.cape);
    const spxValuation = spxValuationTotal - spxDividend; // price-index basis, like the factor
    const twoAnchor = ((histMean.spx + yieldMonthly.spx) / 2) * 12;
    const threeAnchor = (histMean.spx * 12 + yieldMonthly.spx * 12 + spxValuation) / 3;
    valuationEffect = model.betas.spx * (threeAnchor - twoAnchor);
    valuationAnchor = { cape: valuation.cape, asOf: valuation.asOf || null, source: valuation.source || null, impliedSpxAnnual: round(spxValuationTotal), impliedSpxPriceAnnual: round(spxValuation), dividendYield: round(spxDividend, 2), spxAnchorBefore: round(twoAnchor), spxAnchorAfter: round(threeAnchor), effectOnCentre: round(valuationEffect, 2) };
  }
  // Comprehensive pension funds: 30% of assets earn a CPI-linked guaranteed return, so the
  // track's fitted "alpha" carries the inflation of the fitting window. Going forward that
  // share earns expected inflation instead. In a backtest (2017–2023 origins) this lowered
  // the forecast error in every pension category at 3 and 5 years.
  let inflationAnchor = null;
  let inflationEffect = 0;
  if (inflationLinked && inflationLinked.share > 0 && inflationLinked.share <= 1 && Number.isFinite(inflationLinked.trailingInflation) && Number.isFinite(inflationLinked.expectedInflation)) {
    inflationEffect = Math.max(-1, Math.min(1, -inflationLinked.share * (inflationLinked.trailingInflation - inflationLinked.expectedInflation)));
    inflationAnchor = { share: inflationLinked.share, trailingInflation: round(inflationLinked.trailingInflation, 2), expectedInflation: round(inflationLinked.expectedInflation, 2), effectOnCentre: round(inflationEffect, 2), note: `כ-${Math.round(inflationLinked.share * 100)}% מנכסי המסלול נהנים מתשואה מובטחת צמודה למדד. הרכיב הזה חושב לפי האינפלציה הצפויה ולא לפי האינפלציה של השנים האחרונות.` };
  }
  const rawGross = (bondLike ? yieldBased : (historical + yieldBased) / 2) + valuationEffect + inflationEffect;
  // Plausibility bounds on the centre. No track is forecast above what a pure equity
  // position would be forecast to earn plus 1.5 points, or below the 5-year government
  // yield minus 2.5 points. A centre outside these bounds means the track's fitted
  // sensitivities are not a sound basis for a long-run forecast, and the result says so.
  const equityCentre = (annualise(Math.max(histMean.ta125, histMean.spx)) + yields.y10 + a.equityPremium) / 2;
  const bounds = { low: yields.y5 - 2.5, high: equityCentre + 1.5 };
  const gross = Math.min(bounds.high, Math.max(bounds.low, rawGross));
  const centreBounded = gross !== rawGross;
  const centre = gross - annualFee;

  const factorVar = beta.reduce((s, bi, i) => s + beta.reduce((t, bj, j) => t + bi * bj * stats.cov[i][j], 0), 0);
  const resid = Number.isFinite(model.residualSd) ? model.residualSd : 0.45;
  const longRunVol = Math.sqrt(factorVar + resid * resid) * Math.sqrt(12);
  // recent volatility: exponentially weighted variance of the track's factor-implied monthly returns
  const implied = history.periods.map((_, t) => FACTOR_NAMES.reduce((acc, f, i) => acc + beta[i] * history.factors[f][t], 0));
  const impliedMean = implied.reduce((acc, v) => acc + v, 0) / implied.length;
  let wSum = 0;
  let wVar = 0;
  for (let t = 0; t < implied.length; t++) {
    const w = EWMA_LAMBDA ** (implied.length - 1 - t);
    wSum += w;
    wVar += w * (implied[t] - impliedMean) ** 2;
  }
  const recentVol = Math.sqrt(wVar / wSum + resid * resid) * Math.sqrt(12);
  // one year ahead leans half on recent volatility; longer horizons a third
  const blended = (months) => (months <= 12 ? Math.sqrt((longRunVol ** 2 + recentVol ** 2) / 2) : Math.sqrt((2 * longRunVol ** 2 + recentVol ** 2) / 3));
  const annualVolatility = longRunVol;

  // Short horizons: an 80% range for the cumulative return of the next 1, 3 and 6 months.
  // One month uses recent volatility alone, three and six months the blend. Walk-forward on
  // 7 series since 1999/2008: 84%, 87% and 82% of outcomes fell inside. The centre is the
  // forecast's own yearly centre pro rata; no direction is being predicted.
  const monthlyCentre = ((1 + Math.max(centre, -99) / 100) ** (1 / 12) - 1) * 100;
  const shortTerm = [{ key: "1m", label: "החודש הבא", months: 1, tested: 0.84 }, { key: "3m", label: "3 החודשים הבאים", months: 3, tested: 0.87 }, { key: "6m", label: "חצי השנה הבאה", months: 6, tested: 0.82 }].map((h) => {
    const sdMonthly = (h.months === 1 ? recentVol : blended(h.months)) / Math.sqrt(12);
    const mid = ((1 + monthlyCentre / 100) ** h.months - 1) * 100;
    const half = 1.2816 * sdMonthly * Math.sqrt(h.months);
    return { key: h.key, label: h.label, months: h.months, cumulative: { low: round(mid - half), high: round(mid + half) }, coverage: 0.8, insideShareInBacktest: h.tested };
  });

  const rows = horizons.map((h) => {
    const half = h.k * blended(h.months);
    const low = centre - half;
    const high = centre + half;
    return {
      months: h.months, key: h.key, label: h.label,
      annualized: { low: round(low), central: round(centre), high: round(high) },
      cumulative: { low: round(cumulate(low, h.months)), central: round(cumulate(centre, h.months)), high: round(cumulate(high, h.months)) },
      lossProbability: round(normalCdf(-centre / (half / 1.2816)), 2),
      backtested: h.backtested,
    };
  });

  const inflation = Number.isFinite(yields.inflation) ? yields.inflation : null;
  return {
    ok: true,
    central: round(centre),
    centralReal: inflation == null ? null : round(centre - inflation),
    annualVolatility: round(annualVolatility),
    recentVolatility: round(recentVol),
    volatilityState: recentVol > longRunVol * 1.15 ? "elevated" : recentVol < longRunVol * 0.85 ? "calm" : "normal",
    anchors: {
      historical: { annual: round(historical - annualFee), basis: `ממוצע גורמי השוק ${stats.from.slice(0, 4)}–${stats.to.slice(0, 4)} (${stats.n} חודשים)` },
      yieldBased: { annual: round(yieldBased - annualFee), basis: "תשואות אג\"ח ממשלתיות נוכחיות בתוספת פרמיות שנקבעו בהנחה" },
      historicalCap: capped.length ? `הממוצע ההיסטורי של ${capped.map((f) => (f === "spx" ? "S&P 500" : 'ת"א 125')).join(" ושל ")} הוגבל ל-${round(equityCap * 12)}% בשנה (תשואת אג"ח + פעמיים פרמיית המניות), כדי לא להשליך תקופה חריגה קדימה` : null,
      valuation: valuationAnchor,
      inflationLinked: inflationAnchor,
      centreRule: bondLike ? "מסלול כמעט ללא רגישות למניות — המרכז הוא העוגן מבוסס התשואות בלבד" : "המרכז הוא ממוצע שני העוגנים",
    },
    horizons: rows,
    shortTerm,
    shortTermNote: "טווח סביר (80%) לתשואה המצטברת בטווח הקצר, לפי התנודתיות של המסלול. בבדיקה היסטורית 82% עד 87% מהתוצאות נפלו בטווח. אין כאן תחזית לכיוון.",
    inputs: {
      yields: { y5: round(yields.y5, 2), y10: round(yields.y10, 2), inflationExpectation: inflation == null ? null : round(inflation, 2), asOf: yields.asOf || null, source: yields.source || null },
      assumptions: { ...a, basis: "פרמיות ארוכות טווח שנקבעו בשיקול דעת — לא נאמדו מהנתונים" },
      alphaUsed: round(alpha * 12, 2),
      alphaClamped,
      centreBounded,
      centreBounds: { low: round(bounds.low), high: round(bounds.high) },
      alphaNote: Number.isFinite(categoryAlpha) ? "הרכיב שאינו מוסבר בשוק: רבע מהמסלול עצמו ושלושה רבעים מסוג המסלול (הצטיינות של מסלול בודד כמעט אינה נמשכת)" : "הרכיב שאינו מוסבר בשוק: של המסלול עצמו",
      annualFee,
      equitySensitivity: round(equitySensitivity, 2),
      bondLike,
    },
    calibration: BACKTEST,
    generalTrackRecord: GENERAL_TRACK_RECORD,
    caveats: [
      "זו הערכה מחקרית ולא הבטחה. תשואת עבר אינה מבטיחה תשואה בעתיד.",
      "תחזית לשנה אחת רחבה מאוד; הטווח הוא התחזית, לא המספר המרכזי.",
      "הטווח ל-10 שנים לא נבדק היסטורית (אין מספיק שנים) והוא לפי המודל בלבד.",
      "התחזית ברמת המסלול. התשואה בחשבון האישי תלויה בדמי הניהול ובמועדי ההפקדה.",
      "התאמת מסלול לאדם מסוים היא החלטה של בעלת הרישיון, לפי גילו, הטווח ורמת הסיכון המתאימה לו.",
    ],
  };
}

/**
 * Past market episodes. `moves` = cumulative factor moves (percent) over the
 * episode; `actual` = what the median track of a category actually returned
 * (official monthly data), where the category existed.
 */
const HISTORICAL_EPISODES = [
  { key: "crisis_2008", he: "משבר 2008 (יוני 2008 עד פברואר 2009)", from: "200806", to: "200902", moves: { ta125: -41.7, spx: -47.5, usd: 28.7, gov: 6.6, corp: -11.0 },
    actual: { "גמל/השתלמות · כללי": -15.2, "ביטוח · כללי": -11.4, "גמל/השתלמות · אשראי ואג\"ח": -1.2 } },
  { key: "summer_2011", he: "קיץ 2011 (מאי עד ספטמבר 2011)", from: "201105", to: "201109", moves: { ta125: -18.9, spx: -17.0, usd: 9.3, gov: 4.2, corp: -0.8 },
    actual: { "גמל/השתלמות · כללי": -6.5, "ביטוח · כללי": -7.3, "גמל/השתלמות · מניות": -17.8, "ביטוח · מניות": -21.5, "גמל/השתלמות · אשראי ואג\"ח": 0.2 } },
  { key: "covid_2020", he: "קורונה (פברואר עד מרץ 2020)", from: "202002", to: "202003", moves: { ta125: -21.9, spx: -19.9, usd: 3.4, gov: -2.4, corp: -6.5 },
    actual: { "גמל/השתלמות · כללי": -10.8, "ביטוח · כללי": -11.0, "גמל/השתלמות · מניות": -22.0, "ביטוח · מניות": -21.5, "גמל/השתלמות · אשראי ואג\"ח": -5.5, "פנסיה מקיפה · כללי": -9.3 } },
  { key: "rates_2022", he: "עליית הריבית (ינואר עד ספטמבר 2022)", from: "202201", to: "202209", moves: { ta125: -8.4, spx: -24.8, usd: 13.9, gov: -8.8, corp: -8.0 },
    actual: { "גמל/השתלמות · כללי": -8.5, "ביטוח · כללי": -9.5, "ביטוח · מניות": -16.8, "גמל/השתלמות · אשראי ואג\"ח": -6.0, "פנסיה מקיפה · כללי": -5.3 } },
  { key: "recovery_2009", he: "התאוששות 2009 (מרץ עד דצמבר 2009)", from: "200903", to: "200912", moves: { ta125: 76.4, spx: 51.7, usd: -9.3, gov: 4.4, corp: 23.0 },
    actual: { "גמל/השתלמות · כללי": 25.5, "ביטוח · כללי": 25.7, "גמל/השתלמות · אשראי ואג\"ח": 13.9 } },
];

/**
 * What each past episode would mean for a track with TODAY's sensitivities:
 * the model's monthly return is compounded over the episode's actual monthly
 * market moves. Without the monthly history it falls back to sensitivity ×
 * cumulative move. It answers "what if those markets repeated", not "what
 * will happen": exposures change, and illiquid assets are marked late.
 */
function stressTests(model, history = null) {
  if (!model || !model.betas) throw new TrackModelError("model.betas חובה");
  const index = history && Array.isArray(history.periods) ? new Map(history.periods.map((p, i) => [String(p), i])) : null;
  return HISTORICAL_EPISODES.map((e) => {
    const months = index ? [...index.keys()].filter((p) => p >= e.from && p <= e.to) : [];
    const expected = (Number(e.to.slice(0, 4)) - Number(e.from.slice(0, 4))) * 12 + Number(e.to.slice(4)) - Number(e.from.slice(4)) + 1;
    let impact;
    let method;
    if (months.length === expected) {
      const growth = months.reduce((g, p) => g * (1 + ((model.alpha || 0) + FACTOR_NAMES.reduce((t, f) => t + (model.betas[f] || 0) * history.factors[f][index.get(p)], 0)) / 100), 1);
      impact = (growth - 1) * 100;
      method = "monthly_compounded";
    } else {
      impact = FACTOR_NAMES.reduce((t, f) => t + (model.betas[f] || 0) * e.moves[f], 0) + (model.alpha || 0) * expected;
      method = "cumulative_approximation";
    }
    return { key: e.key, description: e.he, from: e.from, to: e.to, months: expected, marketMoves: e.moves, impact: round(impact), method, actualByCategory: e.actual };
  });
}

/** Seeded uniform generator (same algorithm as metrics.mulberry32) and a standard normal draw. */
function rng32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (u) => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());

// Uncertainty about the long-run centre itself, as a share of the track's annual volatility.
// Chosen so that a simulated lump sum reproduces the 5- and 10-year ranges of forecastTrack.
const CENTRE_UNCERTAINTY = 0.21;

/**
 * Savings projection on top of a track forecast: the range of the final
 * balance for an opening balance and/or a fixed monthly deposit.
 *   forecast: result of forecastTrack (its centre is already net of annualFee)
 *   years: 1–40; balance, monthlyDeposit: in ₪ (nominal, not indexed)
 *   depositFee: percent taken from each deposit
 * Monte Carlo with a fixed seed: each path draws its own long-run centre
 * (parameter uncertainty) and monthly returns around it.
 */
function projectSavings(forecast, { years, balance = 0, monthlyDeposit = 0, depositFee = 0, simulations = 4000, seed = 20261127 } = {}) {
  if (!forecast || !Number.isFinite(forecast.central) || !Number.isFinite(forecast.annualVolatility)) throw new TrackModelError("נדרשת תחזית מסלול (forecastTrack)");
  if (!(Number.isInteger(years) && years >= 1 && years <= 40)) throw new TrackModelError("years: מספר שנים שלם בין 1 ל־40");
  if (!(balance >= 0) || !(monthlyDeposit >= 0) || balance + monthlyDeposit <= 0) throw new TrackModelError("נדרש סכום פתיחה או הפקדה חודשית (מספרים חיוביים)");
  if (!(depositFee >= 0 && depositFee < 10)) throw new TrackModelError("depositFee: אחוז בין 0 ל־10");
  if (!(Number.isInteger(simulations) && simulations >= 500 && simulations <= 20000)) throw new TrackModelError("simulations: בין 500 ל־20000");
  const u = rng32(seed);
  const months = years * 12;
  const vol = forecast.annualVolatility;
  const monthlySd = vol / Math.sqrt(12);
  const netDeposit = monthlyDeposit * (1 - depositFee / 100);
  const finals = new Array(simulations);
  for (let sIdx = 0; sIdx < simulations; sIdx++) {
    const centre = forecast.central + CENTRE_UNCERTAINTY * vol * gauss(u);
    const mean = ((1 + centre / 100) ** (1 / 12) - 1) * 100;
    let b = balance;
    for (let m = 0; m < months; m++) {
      b += netDeposit; // deposit at the start of the month
      b *= 1 + Math.max(-60, mean + monthlySd * gauss(u)) / 100;
    }
    finals[sIdx] = b;
  }
  finals.sort((x, y) => x - y);
  const q = (p) => finals[Math.min(simulations - 1, Math.floor(p * simulations))];
  const paidIn = balance + monthlyDeposit * months;
  const r0 = (x) => Math.round(x / 100) * 100;
  // the balance if every year earned exactly the centre
  const m0 = (1 + forecast.central / 100) ** (1 / 12) - 1;
  let straight = balance;
  for (let m = 0; m < months; m++) straight = (straight + netDeposit) * (1 + m0);
  const inflation = forecast.inputs && Number.isFinite(forecast.inputs.yields && forecast.inputs.yields.inflationExpectation) ? forecast.inputs.yields.inflationExpectation : null;
  const deflator = inflation == null ? null : (1 + inflation / 100) ** years;
  return {
    ok: true,
    years, balance, monthlyDeposit, depositFee, paidIn: r0(paidIn),
    finalBalance: { low: r0(q(0.1)), central: r0(q(0.5)), high: r0(q(0.9)), atCentreEveryYear: r0(straight) },
    finalBalanceTodayPrices: deflator == null ? null : { low: r0(q(0.1) / deflator), central: r0(q(0.5) / deflator), high: r0(q(0.9) / deflator), inflationAssumed: inflation },
    belowPaidInProbability: round(finals.filter((x) => x < paidIn).length / simulations, 2),
    basis: { annualReturnCentre: forecast.central, annualVolatility: vol, annualFee: forecast.inputs ? forecast.inputs.annualFee : null, simulations, seed },
    note: "טווח של 80% מהסימולציות (עשירון תחתון עד עליון), בשקלים נומינליים ומעוגל למאות. ההפקדה קבועה ואינה צמודה. זו המחשה לפי התחזית וההנחות שלה — לא הבטחה, ולא במקום תכנון אישי.",
  };
}

/** A forecast-card draft (forecast-card.js shape) for one horizon of a forecast. */
function toForecastCard(forecast, { asset, key = "5y", dataAsOf, modelVersion = "track-forecast-1.0" } = {}) {
  const h = forecast.horizons.find((x) => x.key === key);
  if (!h) throw new TrackModelError(`אופק לא קיים: ${key}`);
  if (!asset || !dataAsOf) throw new TrackModelError("asset ו־dataAsOf חובה לכרטיס תחזית");
  const pct = (x) => Number((x / 100).toFixed(4));
  return {
    asset, horizon: key, method: "quantitative", modelVersion,
    dataSource: { name: "רשות שוק ההון (data.gov.il), בנק ישראל (עקום תשואות), שערי סגירה של מדדים", asOf: dataAsOf },
    pointForecast: pct(h.cumulative.central),
    interval: { low: pct(h.cumulative.low), high: pct(h.cumulative.high), coverage: BACKTEST.insideShare, method: h.backtested ? "empirical_quantiles" : "model_untested" },
    scenarios: {
      bull: { description: "שווקים טובים מהצפוי (הגבול העליון של הטווח)", return: pct(h.cumulative.high) },
      base: { description: "מרכז התחזית", return: pct(h.cumulative.central) },
      bear: { description: "שווקים חלשים מהצפוי (הגבול התחתון של הטווח)", return: pct(h.cumulative.low) },
    },
    risks: ["ירידות חדות בשוקי המניות", "עליית תשואות האג\"ח", "שינוי בהרכב ההשקעות של המסלול", "שינוי בשער החליפין"],
    assumptions: [
      `פרמיית מניות ${forecast.inputs.assumptions.equityPremium}% מעל תשואת אג"ח ממשלתית ל-10 שנים (${forecast.inputs.yields.y10}%)`,
      `מרווח אג"ח חברות ${forecast.inputs.assumptions.corporateSpread}% מעל תשואת אג"ח ממשלתית ל-5 שנים (${forecast.inputs.yields.y5}%)`,
      "הרגישות של המסלול לגורמי השוק נשארת כפי שנמדדה ב-60 החודשים האחרונים",
    ],
    changeTriggers: ["שינוי מהותי בתשואות האג\"ח הממשלתיות", "שינוי במדיניות ההשקעה או בחשיפות של המסלול", "עדכון שנתי של המודל"],
  };
}

module.exports = { HORIZONS, DEFAULT_ASSUMPTIONS, ALPHA_BOUNDS, OWN_ALPHA_WEIGHT, VALUATION_FIT, BACKTEST, GENERAL_TRACK_RECORD, HISTORICAL_EPISODES, forecastTrack, stressTests, projectSavings, toForecastCard, factorStats, normalCdf };
