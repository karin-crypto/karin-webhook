"use strict";

/**
 * Module 9.6 (v4.0) — sentiment reading (say / do / price).
 *
 * Implements 9.6.2 (point-in-time percentiles), 9.6.3 (scores, family
 * states, extremes, within-family dispersion) and 9.6.7 (descriptive and
 * predictive confidence kept separate). Thresholds are descriptive defaults
 * with no proven predictive value, and are reported as such.
 *
 * indicator: {
 *   name, family: 'say' | 'do' | 'price', source,
 *   market?, population?,
 *   orientation: 'higher_is_bullish' | 'higher_is_bearish',
 *   maxAgeDays,                                   // freshness limit
 *   history: [{ date: 'YYYY-MM-DD', value }],     // as originally published
 *   current: { date: 'YYYY-MM-DD', value }        // date = publication date
 * }
 */

const METHODOLOGY_VERSION = "9.6-v4.1";
const FAMILIES = { say: "אומרים", do: "עושים", price: "מתמחרים" };
const MIN_HISTORY = 24;
const T = { optimistic: 70, pessimistic: 30, extremeHigh: 90, extremeLow: 10 };
const PREDICTIVE_LEVELS = ["high", "medium", "low", "not_tested"];

const median = (xs) => {
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function stateOf(score) {
  if (score >= T.optimistic) return "optimistic";
  if (score <= T.pessimistic) return "pessimistic";
  return "neutral";
}

/** Percentile (0–100) of value within history, ties counted half. */
function percentileRank(history, value) {
  const below = history.filter((v) => v < value).length;
  const equal = history.filter((v) => v === value).length;
  return (100 * (below + equal / 2)) / history.length;
}

function readSentiment({ indicators = [], predictiveConfidence = "not_tested", now = new Date() } = {}) {
  const errors = [];
  indicators.forEach((x, i) => {
    if (!x || !x.name || !FAMILIES[x.family]) errors.push(`indicators[${i}]: name ו־family (say/do/price) חובה`);
    else if (!["higher_is_bullish", "higher_is_bearish"].includes(x.orientation)) errors.push(`${x.name}: orientation חובה`);
    else if (!x.source) errors.push(`${x.name}: source חובה`);
    else if (!x.current || !Number.isFinite(x.current.value) || Number.isNaN(Date.parse(x.current.date))) errors.push(`${x.name}: current {date, value} חובה`);
    else if (!Number.isFinite(x.maxAgeDays)) errors.push(`${x.name}: maxAgeDays (סף עדכניות) חובה`);
  });
  if (!PREDICTIVE_LEVELS.includes(predictiveConfidence)) errors.push(`predictiveConfidence: ${PREDICTIVE_LEVELS.join(" | ")}`);
  if (errors.length) return { ok: false, errors };

  const rows = indicators.map((x) => {
    const asOf = new Date(x.current.date);
    // Point-in-time: only observations published before the current reading.
    const hist = (x.history || [])
      .filter((h) => Number.isFinite(h.value) && new Date(h.date) < asOf)
      .map((h) => h.value);
    const base = {
      name: x.name, family: x.family, familyLabel: FAMILIES[x.family], source: x.source,
      market: x.market || null, population: x.population || null, value: x.current.value, date: x.current.date,
    };
    if (asOf > now) return { ...base, status: "future_dated" };
    if ((now - asOf) / 86400000 > x.maxAgeDays) return { ...base, status: "stale" };
    if (hist.length < MIN_HISTORY) return { ...base, status: "insufficient_history", historyN: hist.length };
    const pct = percentileRank(hist, x.current.value);
    const score = x.orientation === "higher_is_bullish" ? pct : 100 - pct;
    return {
      ...base, status: "ok", historyN: hist.length,
      percentile: Math.round(pct), score: Math.round(score),
      extreme: score >= T.extremeHigh ? "optimistic" : score <= T.extremeLow ? "pessimistic" : null,
    };
  });

  const families = {};
  for (const f of Object.keys(FAMILIES)) {
    const ok = rows.filter((r) => r.family === f && r.status === "ok");
    if (!ok.length) { families[f] = { label: FAMILIES[f], available: false }; continue; }
    const scores = ok.map((r) => r.score);
    const score = Math.round(median(scores));
    const states = scores.map(stateOf);
    families[f] = {
      label: FAMILIES[f], available: true, indicators: ok.length, score, state: stateOf(score),
      // 9.6.3: show dispersion, not just the median.
      dispersion: { min: Math.min(...scores), max: Math.max(...scores), range: Math.max(...scores) - Math.min(...scores) },
      internalConflict: states.includes("optimistic") && states.includes("pessimistic"),
    };
  }

  const available = Object.values(families).filter((f) => f.available);
  const complete = available.length === 3;
  const states = available.map((f) => f.state);
  const contradiction = states.includes("optimistic") && states.includes("pessimistic");
  const agreeing = ["optimistic", "pessimistic"].find((s) => states.filter((x) => x === s).length >= 2) || null;
  const overall = complete ? (contradiction ? "mixed" : agreeing || "neutral") : null;

  // 9.6.7 DESCRIPTIVE CONFIDENCE — how reliably the data describe sentiment.
  const excluded = rows.filter((r) => r.status !== "ok");
  const conflicted = available.filter((f) => f.internalConflict).map((f) => f.label);
  const thin = available.filter((f) => f.indicators < 2).map((f) => f.label);
  const markets = [...new Set(rows.filter((r) => r.status === "ok" && r.market).map((r) => r.market))];
  const dReasons = [];
  let descriptive;
  if (!complete) {
    descriptive = "low";
    dReasons.push("קריאה חלקית — משפחה חסרה, לא עדכנית או ללא היסטוריה מספקת");
  } else {
    if (excluded.length) dReasons.push(`אינדיקטורים שהוצאו: ${excluded.map((r) => `${r.name} (${r.status})`).join(", ")}`);
    if (conflicted.length) dReasons.push(`סתירה פנימית במשפחה: ${conflicted.join(", ")}`);
    if (thin.length) dReasons.push(`משפחה עם אינדיקטור יחיד: ${thin.join(", ")}`);
    if (markets.length > 1) dReasons.push(`האינדיקטורים מתייחסים לשווקים שונים: ${markets.join(", ")}`);
    descriptive = dReasons.length ? "medium" : "high";
    if (!dReasons.length) dReasons.push("שלוש משפחות עדכניות, לפחות שני אינדיקטורים בכל משפחה, ללא סתירה פנימית");
  }

  const STATE_HE = { optimistic: "אופטימי", pessimistic: "פסימי", neutral: "ניטרלי", mixed: "מעורב (סתירה בין משפחות)" };
  return {
    ok: true,
    methodologyVersion: METHODOLOGY_VERSION,
    readingAt: now.toISOString(),
    complete,
    overall: overall && { code: overall, label: STATE_HE[overall] },
    families,
    indicators: rows,
    contradiction,
    extremes: rows.filter((r) => r.extreme).map((r) => ({ name: r.name, side: r.extreme })),
    descriptiveConfidence: { level: descriptive, reasons: dReasons },
    // 9.6.7 PREDICTIVE CONFIDENCE comes only from a documented 9.6.6 test, never from the reading itself.
    predictiveConfidence: {
      level: predictiveConfidence,
      basis: predictiveConfidence === "not_tested" ? "לא נבדק — אין לתת לקריאה משקל חיזויי" : "לפי בדיקת ערך חיזויי מתועדת (9.6.6)",
    },
    excluded: excluded.map((r) => ({ name: r.name, status: r.status })),
    method:
      `אחוזון Point-in-Time מול היסטוריה של ${MIN_HISTORY}+ תצפיות; ציון משפחה = חציון, עם פיזור; ` +
      `פסימי ≤${T.pessimistic}, אופטימי ≥${T.optimistic}, קיצון ≤${T.extremeLow} / ≥${T.extremeHigh}. ` +
      "ספים תפעוליים לתיאור בלבד, ללא ערך חיזויי מוכח. סנטימנט אינו אות עצמאי לפעולה.",
    notice: complete ? null : "קריאה חלקית — ללא ציון סנטימנט כולל.",
  };
}

module.exports = { readSentiment, percentileRank, FAMILIES, MIN_HISTORY, METHODOLOGY_VERSION };
