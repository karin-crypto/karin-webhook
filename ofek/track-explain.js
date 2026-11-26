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
// Negative numbers are written with the word "מינוס": a leading minus sign
// jumps to the wrong side of the number in right-to-left text.
const signed = (x, d = 1) => `${x < 0 ? "מינוס " : ""}${Math.abs(x).toFixed(d)}%`;
const between = (lo, hi) => `בין ${signed(lo)} ל${hi < 0 ? signed(hi) : `-${signed(hi)}`}`;
const heDate = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? `${iso.slice(8)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : iso);

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
    ? `אומדן מוקדם עבור ${trackLabel}: ${dirWord} של כ-${amount}${est.range ? ` (טווח סביר: ${between(est.range.low, est.range.high)})` : ""}${asOf ? `, לפי נתוני שוק עד ${heDate(asOf)}` : ""}.`
    : `${trackLabel}: ${dirWord} של ${amount} (נתון רשמי).`);
  if (drivers.length) summary.push(`הגורמים העיקריים: ${drivers.map(effect).join("; ")}.`);
  if (offsets.length) summary.push(`גורמים שפעלו בכיוון ההפוך: ${offsets.map(effect).join("; ")}.`);
  if (!drivers.length && !offsets.length) summary.push("לא נרשמה תנועת שוק בולטת; השינוי קטן ונובע מתנודה שוטפת.");
  if (!isEstimate) {
    const gap = Number((actual - est.estimate).toFixed(2));
    if (Math.abs(gap) >= 0.5) summary.push(`הפער בין הנתון הרשמי לאומדן המודל (${signed(est.estimate)}) הוא ${Math.abs(gap).toFixed(1)} נק' אחוז ${gap > 0 ? "לטובה" : "לרעה"} — חלק שאינו מוסבר בתנועות השוק (בחירת נכסים, נכסים לא סחירים, שינוי חשיפות).`);
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

const MONTHS_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

// How each factor is described when two periods are compared (Hebrew verb agrees with the subject).
const YOY_SUBJECT = {
  ta125: { he: 'הבורסה בתל אביב (מדד ת"א 125)', up: "עלתה", down: "ירדה" },
  spx: { he: 'המניות בארה"ב (מדד S&P 500)', up: "עלו", down: "ירדו" },
  usd: { he: "הדולר מול השקל", up: "עלה", down: "ירד" },
  gov: { he: "אגרות החוב הממשלתיות", up: "עלו", down: "ירדו" },
  corp: { he: "אגרות החוב של החברות", up: "עלו", down: "ירדו" },
};
const pctAbs = (x) => `${Math.abs(x).toFixed(Math.abs(x) >= 10 ? 0 : 1)}%`;
function yoySentence(f, a, b, ya, yb) {
  const sub = YOY_SUBJECT[f];
  const verb = (x) => (x >= 0 ? sub.up : sub.down);
  return Math.sign(a || 1) === Math.sign(b || 1)
    ? `${sub.he} ${verb(a)} ${pctAbs(a)} ב-${ya}, לעומת ${pctAbs(b)} ב-${yb}`
    : `${sub.he} ${verb(a)} ${pctAbs(a)} ב-${ya}, ו${verb(b)} ${pctAbs(b)} ב-${yb}`;
}
const YOY_WORDING = YOY_SUBJECT;

/**
 * "Why is this year weaker (or stronger) than last year?" in plain words.
 *   attribution: result of track-model attributeDifference (labels = the two years)
 *   factorMoves: { [year]: { ta125, spx, usd, gov, corp } } compounded moves over the same months
 */
function explainYearOverYear({ attribution, factorMoves, years, fromMonth, toMonth, trackLabel = "המסלול" } = {}) {
  const [ya, yb] = years.map(String);
  const a = attribution[ya];
  const b = attribution[yb];
  const span = fromMonth === toMonth ? MONTHS_HE[fromMonth - 1] : `${MONTHS_HE[fromMonth - 1]} עד ${MONTHS_HE[toMonth - 1]}`;
  const weaker = attribution.gap < 0;
  const sign = weaker ? -1 : 1;
  const ranked = Object.entries(attribution.byFactor)
    .filter(([f, v]) => YOY_WORDING[f] && Math.abs(v) >= 0.3)
    .map(([f, v]) => ({ factor: f, contribution: v, sentence: yoySentence(f, factorMoves[ya][f], factorMoves[yb][f], ya, yb) }))
    .sort((x, y) => Math.abs(y.contribution) - Math.abs(x.contribution));
  const drivers = ranked.filter((r) => Math.sign(r.contribution) === sign);
  const offsets = ranked.filter((r) => Math.sign(r.contribution) === -sign);
  const explainedShare = Math.abs(attribution.gap) > 0.1 ? 1 - Math.abs(attribution.unexplained) / Math.abs(attribution.gap) : null;

  const perf = (x) => `${x.actualReturn < 0 ? "ירד" : "עלה"} ${Math.abs(x.actualReturn).toFixed(1)}%`;
  const summary = [];
  summary.push(`${trackLabel}: ב${span} ${ya} ${perf(a)}, וב${span} ${yb} ${perf(b)} — פער של ${Math.abs(attribution.gap).toFixed(1)} נקודות אחוז ${weaker ? "לרעת" : "לטובת"} ${yb}.`);
  if (drivers.length) summary.push(`הגורמים העיקריים: ${drivers.map((d) => `${d.sentence} (כ-${Math.abs(d.contribution).toFixed(1)} נק' אחוז מהפער)`).join("; ")}.`);
  if (offsets.length) summary.push(`בכיוון ההפוך: ${offsets.map((d) => `${d.sentence} (קיזוז של כ-${Math.abs(d.contribution).toFixed(1)} נק' אחוז)`).join("; ")}.`);
  if (Math.abs(attribution.unexplained) >= 0.5) summary.push(`כ-${Math.abs(attribution.unexplained).toFixed(1)} נקודות אחוז מהפער אינן מוסברות בתנועות השוק (בחירת נכסים, נכסים לא סחירים, שינוי חשיפות, ריבית דריבית).`);
  if (attribution.warnings && attribution.warnings.length) summary.push(attribution.warnings.join(" "));

  const lines = [`היי, בדקתי. ב${span} ${ya} ${trackLabel} ${perf(a)}, ובאותם חודשים ב-${yb} ${perf(b)}.`];
  if (drivers.length) lines.push(`ההבדל נובע בעיקר מהשוק ולא מהמסלול: ${drivers.slice(0, 2).map((d) => d.sentence).join(", ו")}.`);
  else lines.push("ההבדל אינו נובע מתנועה בולטת אחת בשוק.");
  if (weaker && a.actualReturn >= 10) lines.push(`${ya} הייתה שנה חריגה לטובה.`);

  return {
    ok: true,
    years: [ya, yb], months: { from: fromMonth, to: toMonth, label: span },
    returns: { [ya]: a.actualReturn, [yb]: b.actualReturn }, gap: attribution.gap,
    factorMoves, byFactor: attribution.byFactor, unexplained: attribution.unexplained, explainedShare: explainedShare == null ? null : Number(explainedShare.toFixed(2)),
    drivers, offsets,
    summary: summary.join(" "),
    clientDraft: {
      status: "draft",
      requiresApproval: true,
      text: lines.join(" "),
      rules: "טיוטה בלבד. נשלחת ללקוח רק לאחר אישור קארין. אין בה שמות, חתימה או המלצה; \"מה כדאי לעשות\" נקבע על ידי בעלת הרישיון לפי מצב הלקוח.",
    },
  };
}

/**
 * A multi-year forecast (track-forecast.js) in plain words, with a short
 * client-message draft. The range is the message; the centre alone is never
 * presented as "the forecast".
 */
function explainForecast({ forecast, trackLabel = "המסלול", draftLabel = "המסלול", peerNote = true } = {}) {
  const h = Object.fromEntries(forecast.horizons.map((x) => [x.key, x]));
  const rangeYear = (x) => between(x.annualized.low, x.annualized.high);
  const summary = [];
  summary.push(`${trackLabel}: מרכז התחזית הוא תשואה של כ-${forecast.central}% בשנה בממוצע (נומינלי${forecast.centralReal == null ? "" : `; כ-${forecast.centralReal}% מעל האינפלציה הצפויה`}).`);
  summary.push(`הטווח הסביר: בשנה הקרובה ${rangeYear(h["1y"])}; בממוצע שנתי לאורך 3 שנים ${rangeYear(h["3y"])}; לאורך 5 שנים ${rangeYear(h["5y"])}; לאורך 10 שנים ${rangeYear(h["10y"])} (האחרון לא נבדק היסטורית).`);
  summary.push(`הסיכוי המשוער לסיים בהפסד: כ-${Math.round(h["1y"].lossProbability * 100)}% אחרי שנה, כ-${Math.round(h["3y"].lossProbability * 100)}% אחרי 3 שנים, כ-${Math.round(h["5y"].lossProbability * 100)}% אחרי 5 שנים.`);
  summary.push(`שני עוגנים: לפי ממוצע השווקים מאז 2012 — ${forecast.anchors.historical.annual}% בשנה; לפי תשואות האג"ח הנוכחיות והנחות הפרמיה — ${forecast.anchors.yieldBased.annual}% בשנה. ${forecast.anchors.centreRule}.`);
  summary.push(`בבדיקה היסטורית (${forecast.calibration.period}) כ-${Math.round(forecast.calibration.insideShare * 100)}% מהתוצאות בפועל נפלו בתוך טווח כזה, כ-${Math.round(forecast.calibration.belowShare * 100)}% מתחתיו וכ-${Math.round(forecast.calibration.aboveShare * 100)}% מעליו.`);
  if (peerNote) summary.push("בין חברות שונות באותו סוג מסלול הפער בעבר היה קטן יחסית (כ-2 נקודות אחוז לשנה בין הטובות לחלשות), והצטיינות בעבר חזתה את ההמשך רק במעט. סוג המסלול משפיע הרבה יותר מזהות החברה.");

  const lines = [
    // the client draft keeps a generic label: office rules ban the word "קרן" there, and many track names contain it
    `היי, בדקתי את ${draftLabel}. לפי המודל שלנו, לאורך 5 שנים התשואה השנתית הממוצעת הצפויה היא בסביבות ${forecast.central}%, בטווח סביר של ${rangeYear(h["5y"])} לשנה.`,
    `בשנה בודדת הטווח רחב הרבה יותר, ${rangeYear(h["1y"])}, ולכן אי אפשר להתחייב על שנה מסוימת.`,
    "זו הערכה מחקרית ואינה תשואה מובטחת, והיא לפני התאמה אישית של המסלול לטווח ולרמת הסיכון שלך.",
  ];
  return {
    summary: summary.join(" "),
    clientDraft: {
      status: "draft", requiresApproval: true, text: lines.join(" "),
      rules: "טיוטה בלבד. נשלחת ללקוח רק לאחר אישור קארין. תחזית אינה המלצה: התאמת המסלול ללקוח נקבעת על ידי בעלת הרישיון.",
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

module.exports = { explainMonth, explainYearOverYear, explainForecast, classifyEnvironment, scenarioPlaybook, PLAYBOOK_TEXT, MONTHS_HE };
