"use strict";

/**
 * OFEK EARLY MARKET SIGNAL ENGINE (spec §6).
 *
 * Transparent rule-based screen. Thresholds below are JUDGMENTAL DEFAULTS —
 * they have not been statistically calibrated on historical data, and the
 * output says so. Data must be supplied by the caller with an as-of date;
 * nothing is fetched or invented here.
 */

const MAX_STALENESS_DAYS = 45;
const MIN_INDICATORS = 6;

// test(value) === true means the indicator is flashing.
const INDICATORS = {
  rateShock: {
    label: "זעזוע ריבית — שינוי בתשואת אג\"ח לשנתיים ב־3 חודשים (נ\"ב)",
    rule: "> +75",
    test: (v) => v > 75,
  },
  inflationExpectations: {
    label: "שינוי בציפיות האינפלציה (breakeven) ב־3 חודשים (נ\"ב)",
    rule: "> +50",
    test: (v) => v > 50,
  },
  yieldCurve: {
    label: "שיפוע עקום — 10 שנים פחות שנתיים (נקודות אחוז)",
    rule: "< 0 (עקום הפוך)",
    test: (v) => v < 0,
  },
  creditSpreads: {
    label: "שינוי בפער אשראי High Yield ב־3 חודשים (נ\"ב)",
    rule: "> +100",
    test: (v) => v > 100,
  },
  earningsRevisions: {
    label: "שינוי בתחזיות רווח למניה 12 חודשים קדימה ב־3 חודשים (%)",
    rule: "< -3",
    test: (v) => v < -3,
  },
  volatility: {
    label: "מדד תנודתיות (VIX / מקבילה מקומית)",
    rule: "> 25",
    test: (v) => v > 25,
  },
  breadth: {
    label: "רוחב שוק — % מניות מעל ממוצע 200 יום",
    rule: "< 40",
    test: (v) => v < 40,
  },
  concentration: {
    label: "ריכוזיות — משקל 10 המניות הגדולות במדד (%)",
    rule: "> 40",
    test: (v) => v > 40,
  },
  capitalFlows: {
    label: "זרימות הון — ציון תקן של פדיונות/הפקדות נטו (z)",
    rule: "< -2",
    test: (v) => v < -2,
  },
  employment: {
    label: "תעסוקה — מדד כלל סאהם (נקודות אחוז)",
    rule: ">= 0.5",
    test: (v) => v >= 0.5,
  },
  geopolitical: {
    label: "סיכון גיאופוליטי — ציון תקן של מדד GPR (z)",
    rule: "> 2",
    test: (v) => v > 2,
  },
};

const LEVELS = {
  stable: { code: "stable", label: "סביבה יציבה יחסית", text: "אין סימני שינוי משמעותיים על בסיס המדדים שנבחרו." },
  emerging: { code: "emerging", label: "שינוי מתהווה", text: "מספר מדדים מצביעים על שינוי אפשרי בסביבת השוק." },
  elevated: { code: "elevated", label: "סיכון מוגבר", text: "קיים צירוף משמעותי של גורמי סיכון שנבדק במודל." },
  insufficient: { code: "insufficient", label: "אין מספיק נתונים", text: "לא סופקו מספיק מדדים עדכניים לאבחון." },
};

/**
 * inputs: { [indicatorKey]: { value: number, asOf: 'YYYY-MM-DD', source: string } }
 */
function evaluateSignals(inputs = {}, { now = new Date() } = {}) {
  const used = [];
  const flagged = [];
  const missing = [];
  const stale = [];
  const invalid = [];

  for (const [key, def] of Object.entries(INDICATORS)) {
    const x = inputs[key];
    if (!x) { missing.push(key); continue; }
    if (!Number.isFinite(x.value) || !x.asOf || !x.source || Number.isNaN(Date.parse(x.asOf))) {
      invalid.push(key);
      continue;
    }
    const ageDays = (now - new Date(x.asOf)) / 86400000;
    if (ageDays > MAX_STALENESS_DAYS) { stale.push({ key, asOf: x.asOf }); continue; }
    const on = def.test(x.value);
    const row = { key, label: def.label, value: x.value, rule: def.rule, flagged: on, asOf: x.asOf, source: x.source };
    used.push(row);
    if (on) flagged.push(row);
  }
  const unknown = Object.keys(inputs).filter((k) => !INDICATORS[k]);

  let level;
  if (used.length < MIN_INDICATORS) level = LEVELS.insufficient;
  else if (flagged.length >= 4) level = LEVELS.elevated;
  else if (flagged.length >= 2) level = LEVELS.emerging;
  else level = LEVELS.stable;

  return {
    level,
    flaggedCount: flagged.length,
    evaluatedCount: used.length,
    indicators: used,
    missing,
    stale,
    invalid,
    unknown,
    method:
      "סינון מבוסס כללים: 0–1 מדדים חריגים = יציב, 2–3 = שינוי מתהווה, 4+ = סיכון מוגבר. " +
      "הספים הם ברירת מחדל שיפוטית ולא כוילו סטטיסטית; האבחון אינו חיזוי משבר או התאוששות.",
  };
}

module.exports = { evaluateSignals, INDICATORS, LEVELS, MIN_INDICATORS, MAX_STALENESS_DAYS };
