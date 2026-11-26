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
 *      volatility. k was calibrated on a walk-forward backtest (2015–2026).
 *
 * What the backtest showed (19 track categories, overlapping forecasts):
 * about 73% of realised returns fell inside the range, about 8% below it
 * and about 19% above it. One-year outcomes are wide — a single number for
 * one year is not reliable; the range is the forecast.
 *
 * Units: percent. Nothing here fetches data, and nothing here is a promise
 * of return.
 */

const { FACTOR_NAMES, TrackModelError } = require("./track-model");

const HORIZONS = [
  { months: 12, key: "1y", label: "שנה", k: 1.5, backtested: true },
  { months: 36, key: "3y", label: "3 שנים", k: 0.9, backtested: true },
  { months: 60, key: "5y", label: "5 שנים", k: 0.7, backtested: true },
  { months: 120, key: "10y", label: "10 שנים", k: 0.5, backtested: false },
];

// Judgmental long-run premiums (percent per year). Stated, not estimated.
const DEFAULT_ASSUMPTIONS = {
  equityPremium: 4, // equities over the 10-year government yield
  corporateSpread: 1, // corporate bonds over the 5-year government yield
  usdDrift: 0, // expected yearly change of USD/ILS
};

const BACKTEST = {
  period: "2015–2026",
  categories: 19,
  forecasts: { "1y": 1729, "3y": 1273, "5y": 817 },
  insideShare: 0.73,
  belowShare: 0.08,
  aboveShare: 0.19,
  meanAbsErrorGeneralTrack: { "1y": 4.7, "3y": 2.1, "5y": 1.6 }, // percentage points per year
  note: "בדיקה חודש-חודש: בכל נקודה המודל ראה רק את העבר. התחזיות חופפות בזמן ולכן אינן בלתי תלויות. התקופה הייתה טובה לשווקים, ורוב החריגות היו כלפי מעלה.",
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
function forecastTrack({ model, history, yields, assumptions = {}, categoryAlpha = null, annualFee = 0, horizons = HORIZONS } = {}) {
  if (!model || !model.betas) throw new TrackModelError("model.betas חובה");
  const missing = FACTOR_NAMES.filter((f) => typeof model.betas[f] !== "number");
  if (missing.length) throw new TrackModelError(`חסרות רגישויות: ${missing.join(", ")}`);
  if (!yields || !Number.isFinite(yields.y5) || !Number.isFinite(yields.y10)) throw new TrackModelError("yields.y5 ו־yields.y10 חובה (תשואות אג\"ח ממשלתיות, באחוזים)");
  if (!(annualFee >= 0 && annualFee < 5)) throw new TrackModelError("annualFee: אחוז שנתי בין 0 ל־5");
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  for (const k of Object.keys(DEFAULT_ASSUMPTIONS)) if (!Number.isFinite(a[k])) throw new TrackModelError(`הנחה לא מספרית: ${k}`);

  const stats = factorStats(history);
  const beta = FACTOR_NAMES.map((f) => model.betas[f]);
  const alpha = Number.isFinite(categoryAlpha) ? ((model.alpha || 0) + categoryAlpha) / 2 : model.alpha || 0;

  const yieldMonthly = { ta125: (yields.y10 + a.equityPremium) / 12, spx: (yields.y10 + a.equityPremium) / 12, usd: a.usdDrift / 12, gov: yields.y5 / 12, corp: (yields.y5 + a.corporateSpread) / 12 };
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
  const gross = bondLike ? yieldBased : (historical + yieldBased) / 2;
  const centre = gross - annualFee;

  const factorVar = beta.reduce((s, bi, i) => s + beta.reduce((t, bj, j) => t + bi * bj * stats.cov[i][j], 0), 0);
  const resid = Number.isFinite(model.residualSd) ? model.residualSd : 0.45;
  const annualVolatility = Math.sqrt(factorVar + resid * resid) * Math.sqrt(12);

  const rows = horizons.map((h) => {
    const half = h.k * annualVolatility;
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
    anchors: {
      historical: { annual: round(historical - annualFee), basis: `ממוצע גורמי השוק ${stats.from.slice(0, 4)}–${stats.to.slice(0, 4)} (${stats.n} חודשים)` },
      yieldBased: { annual: round(yieldBased - annualFee), basis: "תשואות אג\"ח ממשלתיות נוכחיות בתוספת פרמיות שנקבעו בהנחה" },
      historicalCap: capped.length ? `הממוצע ההיסטורי של ${capped.map((f) => (f === "spx" ? "S&P 500" : 'ת"א 125')).join(" ושל ")} הוגבל ל-${round(equityCap * 12)}% בשנה (תשואת אג"ח + פעמיים פרמיית המניות), כדי לא להשליך תקופה חריגה קדימה` : null,
      centreRule: bondLike ? "מסלול כמעט ללא רגישות למניות — המרכז הוא העוגן מבוסס התשואות בלבד" : "המרכז הוא ממוצע שני העוגנים",
    },
    horizons: rows,
    inputs: {
      yields: { y5: round(yields.y5, 2), y10: round(yields.y10, 2), inflationExpectation: inflation == null ? null : round(inflation, 2), asOf: yields.asOf || null, source: yields.source || null },
      assumptions: { ...a, basis: "פרמיות ארוכות טווח שנקבעו בשיקול דעת — לא נאמדו מהנתונים" },
      alphaUsed: round(alpha * 12, 2),
      alphaNote: Number.isFinite(categoryAlpha) ? "הרכיב שאינו מוסבר בשוק: ממוצע בין המסלול לסוג המסלול" : "הרכיב שאינו מוסבר בשוק: של המסלול עצמו",
      annualFee,
      equitySensitivity: round(equitySensitivity, 2),
    },
    calibration: BACKTEST,
    caveats: [
      "זו הערכה מחקרית ולא הבטחה. תשואת עבר אינה מבטיחה תשואה בעתיד.",
      "תחזית לשנה אחת רחבה מאוד; הטווח הוא התחזית, לא המספר המרכזי.",
      "הטווח ל-10 שנים לא נבדק היסטורית (אין מספיק שנים) והוא לפי המודל בלבד.",
      "התחזית ברמת המסלול. התשואה בחשבון האישי תלויה בדמי הניהול ובמועדי ההפקדה.",
      "התאמת מסלול לאדם מסוים היא החלטה של בעלת הרישיון, לפי גילו, הטווח ורמת הסיכון המתאימה לו.",
    ],
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

module.exports = { HORIZONS, DEFAULT_ASSUMPTIONS, BACKTEST, forecastTrack, toForecastCard, factorStats, normalCdf };
