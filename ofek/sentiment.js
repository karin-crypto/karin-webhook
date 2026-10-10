"use strict";

/**
 * Module 9.6 — sentiment reading (say / do / price).
 *
 * Implements 9.6.2 (point-in-time percentiles), 9.6.3 (scores, family states,
 * extremes, agreement, contradictions) and 9.6.9 (confidence scale). The
 * thresholds are judgmental defaults and are reported as such.
 *
 * indicator: {
 *   name, family: 'say' | 'do' | 'price', source,
 *   orientation: 'higher_is_bullish' | 'higher_is_bearish',
 *   maxAgeDays,                                   // freshness limit
 *   history: [{ date: 'YYYY-MM-DD', value }],     // as originally published
 *   current: { date: 'YYYY-MM-DD', value }
 * }
 */

const FAMILIES = { say: "אומרים", do: "עושים", price: "מתמחרים" };
const MIN_HISTORY = 24;
const T = { optimistic: 70, pessimistic: 30, extremeHigh: 90, extremeLow: 10 };

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

function readSentiment({ indicators = [], predictiveValue = "not_tested", now = new Date() } = {}) {
  const errors = [];
  indicators.forEach((x, i) => {
    if (!x || !x.name || !FAMILIES[x.family]) errors.push(`indicators[${i}]: name ו־family (say/do/price) חובה`);
    else if (!["higher_is_bullish", "higher_is_bearish"].includes(x.orientation)) errors.push(`${x.name}: orientation חובה`);
    else if (!x.source) errors.push(`${x.name}: source חובה`);
    else if (!x.current || !Number.isFinite(x.current.value) || Number.isNaN(Date.parse(x.current.date))) errors.push(`${x.name}: current {date, value} חובה`);
    else if (!Number.isFinite(x.maxAgeDays)) errors.push(`${x.name}: maxAgeDays (סף עדכניות) חובה`);
  });
  if (!["proven", "not_proven", "not_tested"].includes(predictiveValue)) errors.push("predictiveValue: proven | not_proven | not_tested");
  if (errors.length) return { ok: false, errors };

  const rows = indicators.map((x) => {
    const asOf = new Date(x.current.date);
    // Point-in-time: only observations published before the current reading.
    const hist = (x.history || [])
      .filter((h) => Number.isFinite(h.value) && new Date(h.date) < asOf)
      .map((h) => h.value);
    const base = { name: x.name, family: x.family, familyLabel: FAMILIES[x.family], source: x.source, value: x.current.value, date: x.current.date };
    if ((now - asOf) / 86400000 > x.maxAgeDays) return { ...base, status: "stale" };
    if (hist.length < MIN_HISTORY) return { ...base, status: "insufficient_history", historyN: hist.length };
    const pct = percentileRank(hist, x.current.value);
    const score = x.orientation === "higher_is_bullish" ? pct : 100 - pct;
    return {
      ...base, status: "ok", historyN: hist.length,
      percentile: Math.round(pct), score: Math.round(score),
      extreme: score >= T.extremeHigh || score <= T.extremeLow,
    };
  });

  const families = {};
  for (const f of Object.keys(FAMILIES)) {
    const ok = rows.filter((r) => r.family === f && r.status === "ok");
    if (!ok.length) { families[f] = { label: FAMILIES[f], available: false }; continue; }
    const score = Math.round(median(ok.map((r) => r.score)));
    families[f] = { label: FAMILIES[f], available: true, indicators: ok.length, score, state: stateOf(score) };
  }

  const available = Object.values(families).filter((f) => f.available);
  const complete = available.length === 3;
  const states = available.map((f) => f.state);
  const contradiction = states.includes("optimistic") && states.includes("pessimistic");
  const agreeing = ["optimistic", "pessimistic"].find((s) => states.filter((x) => x === s).length >= 2) || null;

  let overall = null;
  if (complete) overall = contradiction ? "mixed" : agreeing || "neutral";

  // 9.6.9 — never above "medium" without proven predictive value.
  let confidence = "low";
  const reasons = [];
  if (!complete) reasons.push("קריאה חלקית — משפחה חסרה, לא עדכנית או ללא היסטוריה מספקת");
  else if (contradiction) reasons.push("סתירה בין משפחות — נדרש הסבר לפי 9.6.5 לפני העלאת הביטחון");
  else if (!agreeing) reasons.push("אין הסכמה בין שתי משפחות לפחות");
  else if (predictiveValue === "proven") { confidence = "high"; reasons.push("קריאה מלאה, הסכמה, ללא סתירה, וערך חיזויי מוכח"); }
  else { confidence = "medium"; reasons.push("קריאה מלאה והסכמה, אך ערך חיזויי לא הוכח"); }

  const STATE_HE = { optimistic: "אופטימי", pessimistic: "פסימי", neutral: "ניטרלי", mixed: "מעורב (סתירה)" };
  return {
    ok: true,
    readingAt: now.toISOString(),
    complete,
    overall: overall && { code: overall, label: STATE_HE[overall] },
    families,
    indicators: rows,
    contradiction,
    extremes: rows.filter((r) => r.extreme).map((r) => r.name),
    predictiveValue,
    confidence: { level: confidence, reasons },
    excluded: rows.filter((r) => r.status !== "ok").map((r) => ({ name: r.name, status: r.status })),
    method:
      `אחוזון Point-in-Time מול היסטוריה של ${MIN_HISTORY}+ תצפיות; ציון משפחה = חציון; ` +
      `אופטימי ≥${T.optimistic}, פסימי ≤${T.pessimistic}, קיצון ≥${T.extremeHigh} / ≤${T.extremeLow}. ` +
      "הספים הם ברירות מחדל שיפוטיות שלא כוילו. סנטימנט אינו אות עצמאי לפעולה.",
    notice: complete ? null : "קריאה חלקית — אין להסיק מסקנת סנטימנט כוללת.",
  };
}

module.exports = { readSentiment, percentileRank, FAMILIES, MIN_HISTORY };
