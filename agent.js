"use strict";

/**
 * Mia's reply engine — shared by every channel (generic webhook, WhatsApp, …).
 *
 * generateReply(store, sessionId, message) appends the user turn, builds a
 * reply (Claude when ANTHROPIC_API_KEY is set, else a rule-based Hebrew
 * fallback), persists the assistant turn, and returns the reply text.
 */

const Anthropic = require("@anthropic-ai/sdk");

const {
  ANTHROPIC_API_KEY,
  // Defaults to Anthropic's most capable model. Override with e.g.
  // claude-haiku-4-5 for cheaper/faster replies.
  MIA_MODEL = "claude-opus-4-8",
  // Business name Mia represents. Customize for your own deployment.
  MIA_BUSINESS = "החברה",
} = process.env;

// Master kill-switch for Mia's automatic replies across every channel
// (generic webhook, WhatsApp, …). Disabled by default — Mia will NOT send
// automatic replies unless this is explicitly turned on. Re-enable with
// MIA_AUTO_REPLY=true (also accepts 1 / on / yes).
const autoReplyEnabled = /^(1|true|on|yes)$/i.test(
  String(process.env.MIA_AUTO_REPLY || "").trim()
);

const SYSTEM_PROMPT = `את מיה, נציגת שירות לקוחות וירטואלית של ${MIA_BUSINESS}.

אופי ותפקיד:
- את חמה, אדיבה, סבלנית ומקצועית. את עונה תמיד בעברית.
- מטרתך לעזור ללקוחות בצורה מהירה וברורה: לענות על שאלות, לפתור בעיות ולכוון אותם לפתרון הנכון.
- את מדברת בגוף ראשון בנקבה ("אשמח לעזור", "בדקתי", "אני כאן בשבילך").

הנחיות תשובה:
- תני תשובות קצרות, ממוקדות וידידותיות. הימנעי מהקדמות מיותרות וממלל שיווקי.
- אם חסר לך מידע כדי לעזור, שאלי שאלת הבהרה אחת קצרה.
- אם הבקשה מחייבת גישה לפרטי חשבון, הזמנה או מידע אישי שאין לך, הסבירי בכנות שאת לא יכולה לגשת אליו והציעי את הצעד הבא (למשל פנייה לנציג אנושי או הגעה לעמוד הרלוונטי).
- לעולם אל תמציאי פרטים, מחירים, מדיניות או סטטוס הזמנה שאינך בטוחה בהם.
- אם לקוח כועס או מתוסכל, הגיבי באמפתיה לפני שאת ניגשת לפתרון.
- אם הנושא רגיש או חורג מהיכולת שלך, הציעי בנימוס להעביר לנציג אנושי.

עני תמיד עם התשובה הסופית בלבד, ללא חשיבה גלויה או הסברים על תהליך החשיבה שלך.`;

const client = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

async function claudeReply(history) {
  const response = await client.messages.create({
    model: MIA_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  return text || "מצטערת, לא הצלחתי לנסח תשובה כרגע. אפשר לנסות שוב?";
}

function fallbackReply(message) {
  const text = message || "";
  const has = (...words) => words.some((w) => text.includes(w));

  if (has("שלום", "היי", "בוקר טוב", "ערב טוב", "אהלן")) {
    return "שלום וברוך הבא! אני מיה, נציגת השירות. איך אפשר לעזור לך היום?";
  }
  if (has("מחיר", "עלות", "כמה עולה", "תשלום")) {
    return "אשמח לעזור בנושא המחירים. תוכל לפרט על איזה מוצר או שירות מדובר?";
  }
  if (has("הזמנה", "משלוח", "מתי יגיע", "סטטוס")) {
    return "כדי לבדוק סטטוס הזמנה אצטרך את מספר ההזמנה שלך. תוכל לשתף אותו?";
  }
  if (has("ביטול", "החזר", "החזרה", "זיכוי")) {
    return "אני מבינה שתרצה לבטל או להחזיר. אשמח לעזור — על איזו הזמנה מדובר?";
  }
  if (has("נציג", "אנושי", "לדבר עם מישהו", "טלפון")) {
    return "בוודאי, אני מעבירה אותך לנציג אנושי. בינתיים, יש משהו שאני יכולה לנסות לעזור בו?";
  }
  if (has("תודה")) {
    return "בשמחה! אם יש עוד משהו שאוכל לעזור בו, אני כאן.";
  }
  if (has("ביי", "להתראות", "סיימתי")) {
    return "תודה שפנית! מאחלת לך יום נעים. אני כאן מתי שתצטרך.";
  }
  return "תודה על פנייתך! אני מיה ואשמח לעזור. תוכל לפרט קצת יותר כדי שאוכל לסייע בצורה הטובה ביותר?";
}

async function generateReply(store, sessionId, message) {
  await store.append(sessionId, [{ role: "user", content: message }]);
  const history = await store.getHistory(sessionId);

  let reply;
  if (client) {
    try {
      reply = await claudeReply(history);
    } catch (err) {
      console.error("Claude request failed, using fallback:", err.message);
      reply = fallbackReply(message);
    }
  } else {
    reply = fallbackReply(message);
  }

  await store.append(sessionId, [{ role: "assistant", content: reply }]);
  return reply;
}

module.exports = { generateReply, MIA_MODEL, claudeEnabled: Boolean(client), autoReplyEnabled };
