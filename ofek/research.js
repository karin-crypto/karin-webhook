"use strict";

/**
 * Ofek research reports via Claude with server-side web search/fetch.
 *
 * Only figures computed by OFEK's own modules (signals, metrics, simulations)
 * and passed in `context` count as "a quantitative model was run"; the report
 * is told so explicitly. Forecasts are never auto-recorded — a human records
 * them through the ledger endpoint after review.
 */

const Anthropic = require("@anthropic-ai/sdk");
const { SYSTEM_PROMPT } = require("./prompt");

const { ANTHROPIC_API_KEY, OFEK_MODEL = "claude-opus-5-5", OFEK_EFFORT = "high" } = process.env;
const MAX_CONTINUATIONS = 5;

const client = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

function buildUserMessage({ question, horizons, context, now }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
  const parts = [
    `תאריך היום (ישראל): ${today}`,
    `שאלת המחקר: ${question}`,
    horizons && horizons.length ? `אופקי חיזוי מבוקשים: ${horizons.join(", ")}` : null,
  ];
  if (context && Object.keys(context).length) {
    parts.push(
      "תוצאות שחושבו בפועל על ידי מודולי OFEK (מותר להסתמך עליהן כ'מודל כמותי שהורץ'):",
      "```json\n" + JSON.stringify(context, null, 2) + "\n```"
    );
  } else {
    parts.push("לא סופקו תוצאות של מודל כמותי שהורץ — הניתוח יהיה איכותני, וציין זאת במפורש.");
  }
  parts.push("השתמש בחיפוש רשת לאיסוף נתונים עדכניים וציין מקור ותאריך לכל נתון. כתוב את הדוח במבנה הדוח המקצועי.");
  return parts.filter(Boolean).join("\n\n");
}

async function runResearch({ question, horizons = [], context = null, now = new Date() }) {
  if (!client) {
    const err = new Error("ANTHROPIC_API_KEY לא מוגדר — מנוע המחקר אינו פעיל");
    err.status = 503;
    throw err;
  }
  const messages = [{ role: "user", content: buildUserMessage({ question, horizons, context, now }) }];
  let response;
  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const stream = client.beta.messages.stream({
      model: OFEK_MODEL,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: OFEK_EFFORT },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 15 },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 10 },
      ],
      messages,
    });
    response = await stream.finalMessage();
    // Long server-tool turns may pause; resend to let the model continue.
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }

  if (response.stop_reason === "refusal") {
    const err = new Error("הבקשה נדחתה על ידי המודל");
    err.status = 422;
    throw err;
  }

  const textBlocks = response.content.filter((b) => b.type === "text");
  const report = textBlocks.map((b) => b.text).join("").trim();
  const sources = new Map();
  for (const b of textBlocks) {
    for (const c of b.citations || []) if (c.url && !sources.has(c.url)) sources.set(c.url, { url: c.url, title: c.title || null });
  }
  return {
    report,
    sources: [...sources.values()],
    quantitativeModelRun: !!(context && Object.keys(context).length),
    model: response.model,
    stopReason: response.stop_reason,
    truncated: response.stop_reason === "max_tokens" || response.stop_reason === "pause_turn",
    generatedAt: now.toISOString(),
    notice: "טיוטת מחקר — מחייבת בקרה מקצועית לפני הפצה. אינה ייעוץ השקעות.",
  };
}

module.exports = { runResearch, buildUserMessage, researchEnabled: !!client, OFEK_MODEL };
