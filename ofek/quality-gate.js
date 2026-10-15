"use strict";

/**
 * OFEK QUALITY GATE (Module 9.6.13) — pre-publication control for videos,
 * posts, market reviews and client reports.
 *
 * Ten checks. Outcome:
 *   pass            — all checks passed
 *   pass_with_notes — only non-blocking checks (4, 5, 7, 9) failed; each is listed
 *   blocked         — any of checks 1, 2, 3, 6, 8, 10 failed
 * Videos additionally run the full video fact check, which must pass.
 */

const {
  checkVideo, findPii, FORECAST_WORDS, RESEARCH_DISCLAIMER, GENERAL_DISCLAIMER,
} = require("./video-check");

const CONTENT_TYPES = { video: "סרטון", post: "פוסט", market_review: "סקירת שוק", client_report: "דוח ללקוח" };
const BLOCKING = new Set([1, 2, 3, 6, 8, 10]);

// Statements of future market direction (9.6.13 check 3).
const DIRECTION_PATTERNS = [
  /השוק\s+(?:יעלה|ירד|יתאושש|יקרוס)/, /המדד\s+(?:יעלה|ירד|יתאושש)/,
  /צפוי(?:ה|ים)?\s+(?:עלייה|ירידה|התאוששות|ראלי|תיקון)/, /ימשיך\s+(?:לעלות|לרדת)/,
  /(?:עכשיו|זה)\s+הזמן\s+(?:לקנות|למכור|לנייד)/, /הכיוון\s+(?:ברור|הבא)/,
];
// Return guarantees (check 6). Negated forms ("אינה תשואה מובטחת") are allowed.
const GUARANTEE = /(תשואה\s+מובטחת|רווח\s+מובטח|הכנסה\s+מובטחת|ללא\s+סיכון|בלי\s+סיכון|בטוח\s+ב־?100%|מובטח)/g;
const NEGATIONS = ["אינה", "אינו", "אין", "לא", "איננה", "ללא"];
// Fear / hype language (check 7).
const SENSATIONAL = ["קריסה", "מפולת", "פאניקה", "אסון", "הזדמנות של פעם בחיים", "אל תפספסו", "חייבים לפעול עכשיו", "מטורף", "ירידות דרמטיות", "בהלה"];
const UNCERTAINTY_WORDS = ["טווח", "תרחיש", "אי־ודאות", "אי ודאות", "הסתברות", "ייתכן"];

function guaranteeHits(text) {
  const hits = [];
  for (const m of text.matchAll(GUARANTEE)) {
    const before = text.slice(Math.max(0, m.index - 14), m.index);
    if (!NEGATIONS.some((n) => before.includes(n))) hits.push(m[0]);
  }
  return hits;
}

function validDate(d) {
  return typeof d === "string" && !Number.isNaN(Date.parse(d));
}

/**
 * input: {
 *   contentType: 'video' | 'post' | 'market_review' | 'client_report',
 *   text,                                              // full script / post / report text
 *   sources:    [{ claim, source, verifiedAt }],       // every factual claim
 *   dataPoints: [{ label, measuredAt, publishedAt }],  // dates used in the content
 *   forecastIds: [],                                   // ledger forecasts backing any direction claim
 *   manual: { regulatoryDisclosures: true },
 *   approval: { approvedBy, approvedAt },
 *   notes,                                             // documentation for pass_with_notes
 *   video: { ...checkVideo input }                     // required when contentType = video
 * }
 * context: { now, approvers, knownForecastIds: Set }
 */
function runQualityGate(input = {}, { now = new Date(), approvers, knownForecastIds = null } = {}) {
  const allowed = (approvers || (process.env.OFEK_APPROVERS || process.env.OFEK_VIDEO_APPROVERS || "karin").split(","))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!CONTENT_TYPES[input.contentType]) {
    return { ok: false, errors: [`contentType: ${Object.keys(CONTENT_TYPES).join(" | ")}`] };
  }
  const text = String(input.text || "");
  if (!text.trim()) return { ok: false, errors: ["text: תוכן לבדיקה חובה"] };

  const checks = [];
  const add = (n, label, pass, detail) => checks.push({ n, label, blocking: BLOCKING.has(n), pass, detail: detail || null });

  // 1. Data and sources verified.
  const sources = input.sources || [];
  const unverified = sources.filter((s) => !s.source || !validDate(s.verifiedAt));
  const hasNumbers = /\d/.test(text);
  add(1, "נתונים ומקורות אומתו",
    unverified.length === 0 && (!hasNumbers || sources.length > 0),
    unverified.length ? `ללא מקור או תאריך אימות: ${unverified.map((s) => s.claim || "?").join(", ")}`
      : hasNumbers && !sources.length ? "התוכן כולל נתונים מספריים ללא רשימת מקורות" : null);

  // 2. Measurement and publication dates are valid.
  const badDates = (input.dataPoints || []).filter((d) =>
    !validDate(d.measuredAt) || !validDate(d.publishedAt) ||
    new Date(d.publishedAt) < new Date(d.measuredAt) || new Date(d.publishedAt) > now);
  add(2, "תאריכי מדידה ופרסום נכונים", badDates.length === 0,
    badDates.length ? `תאריכים שגויים או חסרים: ${badDates.map((d) => d.label).join(", ")}` : null);

  // 3. No market direction without evidence.
  const direction = DIRECTION_PATTERNS.filter((re) => re.test(text)).map((re) => text.match(re)[0]);
  const fIds = input.forecastIds || [];
  const unknownIds = knownForecastIds ? fIds.filter((id) => !knownForecastIds.has(id)) : [];
  const directionOk = direction.length === 0 || (fIds.length > 0 && unknownIds.length === 0);
  add(3, "לא הוסק כיוון שוק ללא ראיות", directionOk,
    directionOk ? null : unknownIds.length
      ? `תחזיות לא נמצאו ביומן: ${unknownIds.join(", ")}`
      : `קביעת כיוון ללא תחזית מתועדת: ${direction.join(" / ")}`);

  // 4. Uncertainty shown (when the content looks forward).
  const forwardLooking = direction.length > 0 || FORECAST_WORDS.some((w) => text.includes(w));
  const hasUncertainty = UNCERTAINTY_WORDS.some((w) => text.includes(w));
  add(4, "אי־הוודאות מוצגת", !forwardLooking || hasUncertainty, forwardLooking && !hasUncertainty ? "תוכן צופה פני עתיד ללא טווח, תרחישים או הסתברות" : null);

  // 5. Research vs estimate vs forecast clearly separated.
  const labelled = RESEARCH_DISCLAIMER.every((p) => text.includes(p));
  add(5, "הבחנה בין מחקר, הערכה ותחזית", !forwardLooking || labelled,
    forwardLooking && !labelled ? `חסר: ${RESEARCH_DISCLAIMER.filter((p) => !text.includes(p)).join(" / ")}` : null);

  // 6. No return guarantee.
  const guarantees = guaranteeHits(text);
  add(6, "אין הבטחת תשואה", guarantees.length === 0, guarantees.length ? `ביטויים: ${guarantees.join(", ")}` : null);

  // 7. No fear / hype narrative.
  const sensational = SENSATIONAL.filter((w) => text.includes(w));
  add(7, "אין נרטיב מפחיד או מלהיב", sensational.length === 0, sensational.length ? `ביטויים: ${sensational.join(", ")}` : null);

  // 8. No identifying client details.
  const pii = findPii(text);
  add(8, "אין פרטים מזהים של לקוחות", pii.length === 0, pii.length ? pii.map((p) => `${p.type}: ${p.match}`).join(", ") : null);

  // 9. Disclosure and regulatory requirements.
  const general = GENERAL_DISCLAIMER.some((p) => text.includes(p));
  const confirmed = (input.manual || {}).regulatoryDisclosures === true;
  add(9, "דרישות גילוי ורגולציה נבדקו", general && confirmed,
    [!general && "חסרה הסתייגות 'אינו מהווה ייעוץ'", !confirmed && "חסר אישור ידני לגילויים רגולטוריים"].filter(Boolean).join("; ") || null);

  // 10. Approval by Karin or an authorised delegate.
  const ap = input.approval || {};
  const approved = !!ap.approvedBy && allowed.includes(String(ap.approvedBy).toLowerCase()) && validDate(ap.approvedAt);
  add(10, "אישור קארין או גורם מוסמך", approved, approved ? `${ap.approvedBy} · ${ap.approvedAt}` : `נדרש אישור של: ${allowed.join(", ")}`);

  // Videos: the full video fact check is part of the gate.
  let video = null;
  if (input.contentType === "video") {
    video = checkVideo({ ...(input.video || {}), scriptText: text, approval: input.approval }, { now, approvers: allowed });
  }

  const failed = checks.filter((c) => !c.pass);
  const blockingFailed = failed.filter((c) => c.blocking);
  const videoBlocked = video && !video.publishable;
  const notesDocumented = typeof input.notes === "string" && input.notes.trim().length > 0;

  let outcome;
  const reasons = [];
  if (blockingFailed.length || videoBlocked) {
    outcome = "blocked";
    if (blockingFailed.length) reasons.push(`בדיקות חוסמות שנכשלו: ${blockingFailed.map((c) => c.n).join(", ")}`);
    if (videoBlocked) reasons.push(`בקרת הסרטון נכשלה: ${video.failed.join(", ")}`);
  } else if (failed.length) {
    // Non-blocking failures pass only when the fix is documented.
    outcome = notesDocumented ? "pass_with_notes" : "blocked";
    reasons.push(notesDocumented
      ? `עבר בהערות — בדיקות ${failed.map((c) => c.n).join(", ")}; תיעוד: ${input.notes.trim()}`
      : `בדיקות ${failed.map((c) => c.n).join(", ")} נכשלו ולא צורף תיעוד (notes) — נחסם עד תיעוד או תיקון`);
  } else {
    outcome = "pass";
  }

  const LABEL = { pass: "עבר", pass_with_notes: "עבר בהערות", blocked: "נחסם" };
  return {
    ok: true,
    contentType: input.contentType,
    contentTypeLabel: CONTENT_TYPES[input.contentType],
    outcome,
    outcomeLabel: LABEL[outcome],
    publishable: outcome !== "blocked",
    reasons,
    checks,
    video,
    checkedAt: now.toISOString(),
    notice: outcome === "blocked" ? "תוכן חסום אינו מתפרסם עד לתיקון ובדיקה חוזרת." : null,
  };
}

module.exports = { runQualityGate, CONTENT_TYPES, guaranteeHits };
