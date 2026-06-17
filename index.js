"use strict";

/**
 * Mia – AI customer service agent (Hebrew), served over a simple Express webhook.
 *
 * Endpoints:
 *   POST /webhook   { message, sessionId? }  ->  { reply, sessionId }
 *   GET  /          minimal embeddable Hebrew (RTL) chat page for testing Mia
 *   GET  /health    liveness probe
 *
 * Mia answers in Hebrew. When ANTHROPIC_API_KEY is set she is powered by Claude;
 * otherwise she falls back to a small rule-based Hebrew responder so the service
 * still runs out of the box.
 */

const path = require("path");
const express = require("express");

const Anthropic = require("@anthropic-ai/sdk");

const {
  PORT = 3000,
  ANTHROPIC_API_KEY,
  // The customer-service agent defaults to Anthropic's most capable model.
  // Override with e.g. claude-haiku-4-5 for cheaper/faster replies.
  MIA_MODEL = "claude-opus-4-8",
  // Business name Mia represents. Customize for your own deployment.
  MIA_BUSINESS = "החברה",
} = process.env;

// ---------------------------------------------------------------------------
// Mia's persona / system prompt (Hebrew)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Conversation memory (in-process, per session)
// ---------------------------------------------------------------------------

const MAX_TURNS = 20; // keep the last N messages (user+assistant) per session
const conversations = new Map(); // sessionId -> [{ role, content }]

function getHistory(sessionId) {
  if (!conversations.has(sessionId)) conversations.set(sessionId, []);
  return conversations.get(sessionId);
}

function trim(history) {
  if (history.length > MAX_TURNS) {
    history.splice(0, history.length - MAX_TURNS);
  }
}

// ---------------------------------------------------------------------------
// Claude-backed reply
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Rule-based Hebrew fallback (used when no API key is configured)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", model: MIA_MODEL, claudeEnabled: Boolean(client) });
});

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body && req.body.message;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' (string) in request body." });
    }

    const sessionId =
      (req.body && req.body.sessionId) ||
      `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

    const history = getHistory(sessionId);
    history.push({ role: "user", content: message });
    trim(history);

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

    history.push({ role: "assistant", content: reply });
    trim(history);

    res.json({ reply, sessionId });
  } catch (err) {
    console.error("Unexpected error in /webhook:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.listen(PORT, () => {
  console.log(`Mia is listening on port ${PORT}`);
  console.log(`Claude ${client ? "enabled" : "disabled (using rule-based fallback)"} | model: ${MIA_MODEL}`);
});

module.exports = app;
