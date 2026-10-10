"use strict";

/**
 * OFEK VIDEO FACT CHECK & FORECAST CONTROL (spec §12).
 *
 * Automates what can be checked mechanically and turns the rest into explicit
 * manual confirmations. A video is publishable only when every check passes
 * AND an authorised approver (OFEK_VIDEO_APPROVERS) signed off.
 */

const RATE_MAX_AGE_DAYS = 2;
const FORECAST_WORDS = ["תחזית", "צפוי", "צפויה", "צפויים", "נחזה", "מעריכים", "יעלה", "תעלה", "ירד", "תרד", "בשנה הבאה"];
const RESEARCH_DISCLAIMER = ["הערכה מחקרית", "אינה תשואה מובטחת"];
const GENERAL_DISCLAIMER = ["אינו מהווה ייעוץ", "אין לראות באמור ייעוץ", "אינה מהווה ייעוץ", "אין באמור ייעוץ"];
const MANUAL = {
  calculationsReviewed: "החישובים נבדקו ידנית",
  regulatoryDisclosures: "גילויים רגולטוריים נדרשים (כולל ניגודי עניינים) נכללו",
  factForecastSeparated: "בתסריט ובגרפיקה ברורה ההבחנה בין עובדה לתחזית",
};

function todayInIsrael(now) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
}

function validIsraeliId(id) {
  if (!/^\d{9}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(id[i]) * (i % 2 === 0 ? 1 : 2);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}

function findPii(text) {
  const hits = [];
  for (const m of text.matchAll(/(?<!\d)\d{9}(?!\d)/g)) if (validIsraeliId(m[0])) hits.push({ type: "תעודת זהות", match: m[0] });
  for (const m of text.matchAll(/(?<!\d)(?:\+972[-\s]?|0)5\d[-\s]?\d{3}[-\s]?\d{4}(?!\d)/g)) hits.push({ type: "טלפון", match: m[0] });
  for (const m of text.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)) hits.push({ type: "אימייל", match: m[0] });
  return hits;
}

const normNum = (s) => String(s).replace(/[,\s₪%]/g, "");

/**
 * input: {
 *   scriptText, videoDate: 'YYYY-MM-DD',
 *   graphics: [{ label, value }],                     // numbers shown on screen
 *   rates: [{ name, value, source, verifiedAt }],     // quoted market rates
 *   returnPeriods: [{ label, from, to }],
 *   calculations: [{ label, claimed, recomputed }],   // recomputed independently
 *   approval: { approvedBy, approvedAt },
 *   manual: { calculationsReviewed, regulatoryDisclosures, factForecastSeparated }
 * }
 */
function checkVideo(input = {}, { now = new Date(), approvers } = {}) {
  const allowed = (approvers || (process.env.OFEK_VIDEO_APPROVERS || "karin").split(","))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const script = String(input.scriptText || "");
  const checks = [];
  const add = (id, label, pass, detail) => checks.push({ id, label, pass, detail: detail || null });

  if (!script.trim()) add("script", "תסריט קיים", false, "לא סופק תסריט");

  const today = todayInIsrael(now);
  add("date", "תאריך נכון", input.videoDate === today, input.videoDate === today ? null : `בסרטון: ${input.videoDate || "חסר"}, היום: ${today}`);

  const badRates = (input.rates || []).filter((r) => {
    if (!r.source || !r.verifiedAt || Number.isNaN(Date.parse(r.verifiedAt))) return true;
    return (now - new Date(r.verifiedAt)) / 86400000 > RATE_MAX_AGE_DAYS;
  });
  add("rates", "שערים מאומתים ועדכניים", badRates.length === 0, badRates.length ? `לא מאומתים / ישנים: ${badRates.map((r) => r.name).join(", ")}` : null);

  const badPeriods = (input.returnPeriods || []).filter((p) => !(Date.parse(p.from) < Date.parse(p.to)) || Date.parse(p.to) > now);
  add("periods", "תקופות תשואה תקינות", badPeriods.length === 0, badPeriods.length ? badPeriods.map((p) => p.label).join(", ") : null);

  const badCalcs = (input.calculations || []).filter((c) => !Number.isFinite(c.claimed) || !Number.isFinite(c.recomputed) || Math.abs(c.claimed - c.recomputed) > Math.max(1e-6, Math.abs(c.recomputed) * 0.005));
  add("calculations", "חישובים תואמים לחישוב חוזר", badCalcs.length === 0, badCalcs.length ? badCalcs.map((c) => c.label).join(", ") : null);

  const scriptNums = normNum(script);
  const missingInScript = (input.graphics || []).filter((g) => !scriptNums.includes(normNum(g.value)));
  add("graphics", "התסריט תואם לגרפיקה", missingInScript.length === 0, missingInScript.length ? `מופיעים בגרפיקה ולא בתסריט: ${missingInScript.map((g) => `${g.label}=${g.value}`).join(", ")}` : null);

  const containsForecast = FORECAST_WORDS.some((w) => script.includes(w));
  if (containsForecast) {
    const ok = RESEARCH_DISCLAIMER.every((p) => script.includes(p));
    add("forecastDisclaimer", "הצהרה: הערכה מחקרית ולא תשואה מובטחת", ok, ok ? null : `חסר: ${RESEARCH_DISCLAIMER.filter((p) => !script.includes(p)).join(" / ")}`);
    const hasRange = /טווח|תרחיש/.test(script);
    add("uncertainty", "הצגת אי־ודאות (טווח / תרחישים)", hasRange, hasRange ? null : "תחזית ללא טווח או תרחישים");
  }
  const hasGeneral = GENERAL_DISCLAIMER.some((p) => script.includes(p));
  add("generalDisclaimer", "הסתייגות מקצועית (אינו ייעוץ)", hasGeneral);

  const pii = findPii(script + " " + (input.graphics || []).map((g) => `${g.label} ${g.value}`).join(" "));
  add("privacy", "אין פרטים חסויים / מזהים", pii.length === 0, pii.length ? pii.map((p) => `${p.type}: ${p.match}`).join(", ") : null);

  const manual = input.manual || {};
  for (const [key, label] of Object.entries(MANUAL)) add(`manual.${key}`, label, manual[key] === true, manual[key] === true ? null : "דורש אישור ידני");

  const ap = input.approval || {};
  const approved = !!ap.approvedBy && allowed.includes(String(ap.approvedBy).toLowerCase()) && !!ap.approvedAt;
  add("approval", "אישור קארין או גורם מוסמך", approved, approved ? `${ap.approvedBy} · ${ap.approvedAt}` : `נדרש אישור של: ${allowed.join(", ")}`);

  const failed = checks.filter((c) => !c.pass);
  return { publishable: failed.length === 0, containsForecast, failed: failed.map((c) => c.id), checks };
}

module.exports = { checkVideo, findPii, validIsraeliId };
