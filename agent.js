"use strict";

/**
 * Mia's reply engine — shared by every channel (generic webhook, WhatsApp, …).
 *
 * generateReply(store, sessionId, message) appends the user turn, builds a
 * reply (Claude when ANTHROPIC_API_KEY is set, else a rule-based Hebrew
 * fallback), persists the assistant turn, and returns the reply text.
 */

const Anthropic = require("@anthropic-ai/sdk");
const { TOOLS, runTool } = require("./tools");

const {
  ANTHROPIC_API_KEY,
  // Defaults to Anthropic's most capable model. Override with e.g.
  // claude-haiku-4-5 for cheaper/faster replies.
  MIA_MODEL = "claude-opus-4-8",
  // Business name Mia represents. Customize for your own deployment.
  MIA_BUSINESS = "החברה",
} = process.env;

// Safety cap on tool round-trips within a single reply, so a tool loop can
// never spin forever against the API.
const MAX_TOOL_STEPS = 5;

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

שימוש בכלים:
- יש לך גישה לכלים. השתמשי בהם במקום לנחש.
- לפני מענה על שאלה עובדתית לגבי השירותים של הסוכנות או דרכי יצירת קשר — קראי ל-get_business_info והשעני את תשובתך על המידע שחוזר.
- כשלקוח מבקש שיחזרו אליו, רוצה להתקדם עם מוצר, או כשהנושא דורש נציג אנושי — אספי שם וטלפון (ואם אפשר גם נושא) ואז קראי ל-save_inquiry. אם חסר שם או טלפון, שאלי אותם קודם. אחרי שמירה מוצלחת, אשרי ללקוח בחום שהפנייה התקבלה ושיחזרו אליו.
- לעולם אל תמציאי שנשמרה פנייה מבלי שקראת לכלי בפועל.

עני תמיד עם התשובה הסופית בלבד, ללא חשיבה גלויה או הסברים על תהליך החשיבה שלך.`;

const client = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

function extractText(response) {
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

/**
 * Runs the agentic loop: call Claude with tools; whenever it asks to use a
 * tool, execute it, feed the result back, and continue until Claude produces
 * its final text answer. The persisted conversation history (plain user/
 * assistant turns) is used as the starting point; the intermediate tool_use
 * and tool_result blocks live only within this turn, so store.js stays simple.
 */
async function claudeReply(history) {
  const messages = history.map((m) => ({ role: m.role, content: m.content }));

  for (let step = 0; step < MAX_TOOL_STEPS; step++) {
    const response = await client.messages.create({
      model: MIA_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      // Record Claude's turn (which includes the tool_use blocks)...
      messages.push({ role: "assistant", content: response.content });
      // ...run each requested tool and send the results back as one user turn.
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await runTool(block.name, block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue; // loop again so Claude can use the tool output
    }

    const text = extractText(response);
    if (text) return text;
    break; // no text and not a tool call — fall through to the safe default
  }

  return "מצטערת, לא הצלחתי לנסח תשובה כרגע. אפשר לנסות שוב?";
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

module.exports = { generateReply, MIA_MODEL, claudeEnabled: Boolean(client) };
