"use strict";

/**
 * Plain-language explanations for a track's month: which market moves drove
 * the return, what offset them, and a short client-message DRAFT.
 *
 * The draft follows the office rules for client messages: no names, no
 * signature, short and plain. It is always a draft — nothing here sends
 * anything, and a client message goes out only after Karin approves it.
 */

const tm = require("./track-model");

const fmt = (x, d = 1) => `${Math.abs(x).toFixed(d)}%`;

// Wording per factor and direction. `up`/`down` refer to the factor's move.
const WORDING = {
  ta125: {
    down: (m) => `המניות בישראל ירדו (מדד ת"א 125 ירד ${fmt(m)})`,
    up: (m) => `המניות בישראל עלו (מדד ת"א 125 עלה ${fmt(m)})`,
  },
  spx: {
    down: (m) => `המניות בארה"ב ירדו (מדד S&P 500 ירד ${fmt(m)})`,
    up: (m) => `המניות בארה"ב עלו (מדד S&P 500 עלה ${fmt(m)})`,
  },
  usd: {
    down: (m) => `השקל התחזק מול הדולר ב-${fmt(m)}, מה שמקטין את שווי ההשקעות בחו"ל כשמתרגמים אותן לשקלים`,
    up: (m) => `הדולר התחזק מול השקל ב-${fmt(m)}, מה שמגדיל את שווי ההשקעות בחו"ל כשמתרגמים אותן לשקלים`,
  },
  gov: {
    down: (m) => `אגרות החוב הממשלתיות ירדו ${fmt(m)}`,
    up: (m) => `אגרות החוב הממשלתיות עלו ${fmt(m)}`,
  },
  corp: {
    down: (m) => `אגרות החוב של החברות ירדו ${fmt(m)}`,
    up: (m) => `אגרות החוב של החברות עלו ${fmt(m)}`,
  },
};

// Judgmental thresholds (percent move within the period) for naming the environment.
const TAG_RULES = [
  { tag: "israel_equities_down", he: "ירידה במניות בישראל", test: (f) => f.ta125 <= -3 },
  { tag: "israel_equities_up", he: "עלייה במניות בישראל", test: (f) => f.ta125 >= 3 },
  { tag: "global_equities_down", he: "ירידה במניות בעולם", test: (f) => f.spx <= -3 },
  { tag: "global_equities_up", he: "עלייה במניות בעולם", test: (f) => f.spx >= 3 },
  { tag: "shekel_weaker", he: "היחלשות השקל", test: (f) => f.usd >= 2 },
  { tag: "shekel_stronger", he: "התחזקות השקל", test: (f) => f.usd <= -2 },
  { tag: "bonds_down", he: "ירידה באגרות החוב", test: (f) => f.gov <= -1 || f.corp <= -1 },
  { tag: "bonds_up", he: "עלייה באגרות החוב", test: (f) => f.gov >= 1 || f.corp >= 1 },
];

/** Which market environment the period's moves describe (may be several, or 'calm'). */
function classifyEnvironment(factors) {
  const f = Object.fromEntries(tm.FACTOR_NAMES.map((n) => [n, typeof (factors || {})[n] === "number" ? factors[n] : 0]));
  const tags = TAG_RULES.filter((r) => r.test(f)).map((r) => ({ tag: r.tag, he: r.he }));
  return { tags: tags.length ? tags : [{ tag: "calm", he: "חודש רגוע יחסית בשווקים" }], thresholds: "ספים שיפוטיים: מניות ±3%, דולר ±2%, אג\"ח ±1%" };
}

/**
 * Explain a period.
 *   model:   { alpha, betas, accuracy? }
 *   factors: market moves in the period (percent)
 *   actual:  the official return if already published (percent), else null
 *   partial: true when the month is not over (the text says "so far")
 */
function explainMonth({ model, factors, actual = null, partial = false, asOf = null, trackLabel = "המסלול", elapsedShare = 1 } = {}) {
  const est = tm.nowcast(model, factors, { elapsedShare });
  const value = typeof actual === "number" ? actual : est.estimate;
  const isEstimate = typeof actual !== "number";

  const parts = Object.keys(model.betas)
    .filter((f) => WORDING[f])
    .map((f) => ({ factor: f, move: Number(factors[f].toFixed(2)), contribution: est.contributions[f], sentence: WORDING[f][factors[f] < 0 ? "down" : "up"](factors[f]) }))
    .filter((p) => Math.abs(p.contribution) >= 0.1)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const sign = value < 0 ? -1 : 1;
  const drivers = parts.filter((p) => Math.sign(p.contribution) === sign);
  const offsets = parts.filter((p) => Math.sign(p.contribution) === -sign);
  const environment = classifyEnvironment(factors);

  const when = partial ? "מתחילת החודש" : "בחודש שהסתיים";
  const dirWord = value < 0 ? "ירידה" : "עלייה";
  const amount = `${Math.abs(value).toFixed(1)}%`;
  const join = (list) => list.map((p) => p.sentence).join(", ו");

  const effect = (p) => `${p.sentence} — ${p.contribution > 0 ? "תרם" : "גרע"} כ-${Math.abs(p.contribution).toFixed(1)} נק' אחוז`;

  // professional summary (for Karin / internal report)
  const summary = [];
  summary.push(isEstimate
    ? `אומדן מוקדם עבור ${trackLabel}: ${dirWord} של כ-${amount}${est.range ? ` (טווח סביר: ${est.range.low}% עד ${est.range.high}%)` : ""}${asOf ? `, לפי נתוני שוק עד ${asOf}` : ""}.`
    : `${trackLabel}: ${dirWord} של ${amount} (נתון רשמי).`);
  if (drivers.length) summary.push(`הגורמים העיקריים: ${drivers.map(effect).join("; ")}.`);
  if (offsets.length) summary.push(`גורמים שפעלו בכיוון ההפוך: ${offsets.map(effect).join("; ")}.`);
  if (!drivers.length && !offsets.length) summary.push("לא נרשמה תנועת שוק בולטת; השינוי קטן ונובע מתנודה שוטפת.");
  if (!isEstimate) {
    const gap = Number((actual - est.estimate).toFixed(2));
    if (Math.abs(gap) >= 0.5) summary.push(`הפער בין הנתון הרשמי לאומדן המודל (${est.estimate}%) הוא ${Math.abs(gap).toFixed(1)} נק' אחוז ${gap > 0 ? "לטובה" : "לרעה"} — חלק שאינו מוסבר בתנועות השוק (בחירת נכסים, נכסים לא סחירים, שינוי חשיפות).`);
  }

  // client draft — short, plain, no names, no signature
  const lines = [];
  if (drivers.length) lines.push(`היי, עדכון קצר על ${trackLabel}. ${when} ${join(drivers.slice(0, 2))}.`);
  else lines.push(`היי, עדכון קצר על ${trackLabel}. ${when} לא היו תנועות חריגות בשווקים.`);
  if (offsets.length) lines.push(`מנגד, ${offsets[0].sentence}, וזה קיזז חלק מה${value < 0 ? "ירידה" : "עלייה"}.`);
  lines.push(isEstimate
    ? `לפי הערכה מוקדמת שלנו, המסלול ב${dirWord} של בערך ${amount} ${partial ? "מתחילת החודש" : "בחודש הזה"}. זה עדיין לא הנתון הרשמי, והוא יכול להשתנות עד שיתפרסם.`
    : `בסיכום החודש המסלול רשם ${dirWord} של ${amount}.`);
  if (value < 0) lines.push("מדובר בתנודה של חודש; בחיסכון לטווח ארוך היו חודשים כאלה גם בעבר.");

  return {
    ok: true,
    value: Number(value.toFixed(2)),
    isEstimate,
    partialMonth: partial,
    asOf,
    range: isEstimate ? est.range : null,
    modelEstimate: est.estimate,
    environment,
    drivers,
    offsets,
    summary: summary.join(" "),
    clientDraft: {
      status: "draft",
      requiresApproval: true,
      text: lines.join(" "),
      rules: "טיוטה בלבד. נשלחת ללקוח רק לאחר אישור קארין. אין בה שמות, חתימה או המלצה אישית; \"מה כדאי לעשות\" נקבע על ידי בעלת הרישיון לפי מצב הלקוח.",
    },
  };
}

/**
 * Scenario playbook: for each named scenario, what happens, which track
 * types are hit most, and talking points — with the computed impact for the
 * models supplied (e.g. main categories from the baseline).
 */
const PLAYBOOK_TEXT = {
  ta125_down_10: {
    what: "ירידה חדה במניות בישראל (אירוע ביטחוני, פוליטי או כלכלי מקומי).",
    talking: "המסלולים הכלליים נפגעים חלקית: היסטורית, ירידה של 10% במניות בישראל תורגמה לירידה של בערך 1.5%–2% במסלול כללי. מסלולי מניות נפגעים יותר; מסלולי אג\"ח ומסלולים שעוקבים אחרי מדדים בחו\"ל כמעט שאינם מושפעים.",
  },
  spx_down_10: {
    what: "ירידה חדה במניות בארה\"ב (למשל ירידה במניות הטכנולוגיה, חשש ממיתון או מריבית).",
    talking: "זה הגורם המשפיע ביותר על רוב המסלולים בשנים האחרונות, כי החשיפה לחו\"ל גדלה. במסלולים שעוקבים אחרי S&P 500 הירידה כמעט מלאה. לעיתים הדולר מתחזק באותו זמן ומקזז חלק מהירידה.",
  },
  shekel_stronger_5: {
    what: "השקל מתחזק מול הדולר.",
    talking: "ההשקעות בחו\"ל שוות פחות בשקלים. במסלול כללי ההשפעה מתונה (היסטורית בערך חצי אחוז על כל 5% במטבע); במסלולים שעוקבים אחרי S&P 500 ההשפעה כמעט מלאה. זו הסיבה שמסלולי S&P נראו חלשים ב-2025 למרות שהמדד עצמו עלה.",
  },
  shekel_weaker_5: {
    what: "השקל נחלש מול הדולר (לרוב בתקופות של אי-ודאות מקומית).",
    talking: "ההשקעות בחו\"ל שוות יותר בשקלים, וזה מקזז חלק מירידות בשוק המקומי. במסלולים שעוקבים אחרי S&P 500 זו תוספת כמעט מלאה.",
  },
  gov_bonds_down_2: {
    what: "ירידה באגרות החוב הממשלתיות (עליית תשואות, חשש מאינפלציה או מגירעון).",
    talking: "משפיע בעיקר על מסלולי אג\"ח ועל מסלולים לגילאי 60 ומעלה. במסלולים הכלליים ההשפעה קטנה.",
  },
  corp_bonds_down_3: {
    what: "ירידה באגרות החוב של החברות (חשש מקשיי החזר, משיכות מקרנות נאמנות).",
    talking: "משפיע על מסלולי אשראי ואג\"ח וגם על המסלולים הכלליים: היסטורית, ירידה של 3% באג\"ח החברות תורגמה לירידה של בערך 0.5%–1% במסלול כללי.",
  },
  local_shock: {
    what: "זעזוע מקומי: המניות בישראל יורדות, אג\"ח החברות נחלשות והשקל נחלש.",
    talking: "המסלולים הכלליים נפגעים, אבל היחלשות השקל מעלה את שווי ההשקעות בחו\"ל ומרככת את הירידה. מסלולים שעוקבים אחרי מדדים בחו\"ל עשויים אף לעלות.",
  },
  global_selloff: {
    what: "ירידה עולמית: המניות בארה\"ב ובישראל יורדות יחד.",
    talking: "זה התרחיש הקשה ביותר לרוב המסלולים, כי אין שוק שמקזז. היחלשות השקל, אם מתרחשת, מרככת מעט.",
  },
  yields_up: {
    what: "עליית תשואות: אגרות החוב יורדות והמניות נחלשות מעט.",
    talking: "פוגע גם במסלולים הסולידיים, שבדרך כלל יציבים. כדאי להסביר שירידת מחיר באג\"ח פירושה תשואה לפדיון גבוהה יותר מכאן והלאה.",
  },
};

function scenarioPlaybook(models) {
  return Object.keys(tm.SCENARIOS).map((key) => ({
    scenario: key,
    description: tm.SCENARIOS[key].he,
    shocks: tm.SCENARIOS[key].shocks,
    what: PLAYBOOK_TEXT[key].what,
    talkingPoints: PLAYBOOK_TEXT[key].talking,
    impacts: (models || []).map((m) => ({ track: m.label, impact: tm.scenarioImpact(m.model, key).impact })),
  }));
}

module.exports = { explainMonth, classifyEnvironment, scenarioPlaybook, PLAYBOOK_TEXT };
