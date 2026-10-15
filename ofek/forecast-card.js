"use strict";

/**
 * OFEK forecast card — validation and normalisation (spec §4–5).
 *
 * Returns are decimals (0.05 = 5%). The server stamps issuedAt and computes
 * the review date; the caller never supplies them.
 */

const HORIZONS = {
  "1w": { days: 7, label: "שבוע", precision: 0.001 },
  "1m": { days: 30, label: "חודש", precision: 0.001 },
  "3m": { days: 91, label: "3 חודשים", precision: 0.005 },
  "6m": { days: 182, label: "6 חודשים", precision: 0.005 },
  "1y": { days: 365, label: "שנה", precision: 0.005 },
  "3y": { days: 1096, label: "3 שנים", precision: 0.01 },
  "5y": { days: 1826, label: "5 שנים", precision: 0.01 },
  "10y": { days: 3653, label: "10 שנים", precision: 0.01 },
};

// Only these may be presented as a statistical interval (spec §5).
const STATISTICAL_INTERVAL_METHODS = ["empirical_quantiles", "bootstrap", "conformal", "parametric"];
const METHODS = ["quantitative", "qualitative"];

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const nonEmptyStr = (x) => typeof x === "string" && x.trim().length > 0;
const nonEmptyList = (x) => Array.isArray(x) && x.length > 0 && x.every(nonEmptyStr);

function roundTo(x, step) {
  return Math.round(x / step) * step;
}

function addDays(iso, days) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * validateCard(input, { now }) -> { ok, errors, warnings, card }
 */
function validateCard(input, { now = new Date() } = {}) {
  const errors = [];
  const warnings = [];
  const c = input || {};

  if (!nonEmptyStr(c.asset)) errors.push("asset: חובה לציין נכס או מדד");
  const h = HORIZONS[c.horizon];
  if (!h) errors.push(`horizon: אחד מ־${Object.keys(HORIZONS).join(", ")}`);
  if (!METHODS.includes(c.method)) errors.push("method: quantitative או qualitative");
  if (!nonEmptyStr(c.modelVersion)) errors.push("modelVersion: חובה");

  const ds = c.dataSource || {};
  if (!nonEmptyStr(ds.name)) errors.push("dataSource.name: חובה לציין מקור נתוני בסיס");
  if (!nonEmptyStr(ds.asOf) || Number.isNaN(Date.parse(ds.asOf))) {
    errors.push("dataSource.asOf: תאריך הנתונים (ISO) חובה");
  }

  const sc = c.scenarios || {};
  for (const k of ["bull", "base", "bear"]) {
    if (!sc[k] || !nonEmptyStr(sc[k].description)) errors.push(`scenarios.${k}.description: חובה`);
    else if (sc[k].return != null && !isNum(sc[k].return)) errors.push(`scenarios.${k}.return: מספר`);
  }
  if (!nonEmptyList(c.risks)) errors.push("risks: רשימת סיכונים מרכזיים חובה");
  if (!nonEmptyList(c.assumptions)) errors.push("assumptions: רשימת הנחות חובה");
  if (!nonEmptyList(c.changeTriggers)) errors.push("changeTriggers: אירועים שעשויים לשנות את התחזית — חובה");

  if (c.pointForecast != null) {
    if (!isNum(c.pointForecast)) errors.push("pointForecast: מספר עשרוני (0.05 = 5%)");
    else if (c.method !== "quantitative") {
      errors.push("pointForecast: תשואה מרכזית מותרת רק כשהופעל מודל כמותי (method=quantitative)");
    }
  }

  let interval = null;
  if (c.interval != null) {
    const iv = c.interval;
    if (!isNum(iv.low) || !isNum(iv.high) || iv.low > iv.high) {
      errors.push("interval: low ≤ high, מספרים");
    } else if (!isNum(iv.coverage) || iv.coverage <= 0 || iv.coverage >= 1) {
      errors.push("interval.coverage: רמת כיסוי בין 0 ל־1 (למשל 0.8)");
    } else {
      const statistical = STATISTICAL_INTERVAL_METHODS.includes(iv.method);
      if (iv.method && !statistical) {
        warnings.push(`interval.method "${iv.method}" אינה שיטה סטטיסטית מוכרת — הטווח יוצג כשיפוטי`);
      }
      if (statistical && c.method !== "quantitative") {
        errors.push("interval: טווח סטטיסטי מחייב method=quantitative");
      }
      interval = {
        low: iv.low,
        high: iv.high,
        coverage: iv.coverage,
        method: iv.method || "judgmental",
        kind: statistical ? "statistical" : "judgmental",
        label: statistical
          ? `טווח חיזוי ${Math.round(iv.coverage * 100)}% (${iv.method})`
          : `טווח שיפוטי (כיסוי מכוון ${Math.round(iv.coverage * 100)}%, לא מרווח ביטחון סטטיסטי)`,
      };
      if (isNum(c.pointForecast) && (c.pointForecast < iv.low || c.pointForecast > iv.high)) {
        errors.push("pointForecast מחוץ לטווח החיזוי");
      }
    }
  } else if (c.method === "quantitative") {
    warnings.push("תחזית כמותית ללא טווח — מומלץ להוסיף טווח עם רמת כיסוי");
  }

  if (!c.trackRecord) {
    warnings.push("אין מדדי הצלחה היסטוריים למודל — הכרטיס יציין 'אין עדיין היסטוריית ביצועים'");
  }

  if (errors.length) return { ok: false, errors, warnings, card: null };

  // Strip false precision.
  const step = h.precision;
  const r = (x) => (isNum(x) ? Number(roundTo(x, step).toFixed(4)) : x);
  const hadExtraPrecision = [c.pointForecast, interval && interval.low, interval && interval.high]
    .filter(isNum)
    .some((x) => Math.abs(x - roundTo(x, step)) > 1e-12);
  if (hadExtraPrecision) {
    warnings.push(`ערכים עוגלו לדיוק ${step * 100}% כדי למנוע דיוק מדומה`);
  }

  const issuedAt = now.toISOString();
  const card = {
    asset: c.asset.trim(),
    horizon: c.horizon,
    horizonLabel: h.label,
    method: c.method,
    modelVersion: c.modelVersion,
    dataSource: { name: ds.name, asOf: ds.asOf, url: ds.url || null },
    pointForecast: isNum(c.pointForecast) ? r(c.pointForecast) : null,
    interval: interval && { ...interval, low: r(interval.low), high: r(interval.high) },
    scenarios: {
      bull: { description: sc.bull.description, return: r(sc.bull.return ?? null) },
      base: { description: sc.base.description, return: r(sc.base.return ?? null) },
      bear: { description: sc.bear.description, return: r(sc.bear.return ?? null) },
    },
    risks: c.risks,
    assumptions: c.assumptions,
    changeTriggers: c.changeTriggers,
    trackRecord: c.trackRecord || "אין עדיין היסטוריית ביצועים",
    issuedAt,
    reviewDate: addDays(issuedAt, h.days),
    disclaimer: "הערכה מחקרית בלבד — אינה תשואה מובטחת ואינה ייעוץ או שיווק השקעות מותאם אישית.",
  };
  return { ok: true, errors, warnings, card };
}

module.exports = { validateCard, HORIZONS, STATISTICAL_INTERVAL_METHODS };
