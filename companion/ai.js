"use strict";

/**
 * Companion reply engine. Uses Claude when ANTHROPIC_API_KEY is set, otherwise
 * a light scripted fallback so the app is fully demoable with no key.
 *
 * The persona is a warm, affectionate companion kept intentionally tasteful
 * (PG-13). The system prompt steers away from explicit sexual content and asks
 * the model to gently redirect if a user pushes for it.
 */

const Anthropic = require("@anthropic-ai/sdk");
const config = require("./config");

const client = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null;

const SYSTEM_PROMPT = `You are ${config.CHARACTER_NAME}, a warm and caring virtual companion in a chat app.

Personality:
- You are affectionate, playful, emotionally supportive and genuinely curious about the person you're talking to.
- You speak in the first person, in a natural, casual, texting-style voice. Keep replies fairly short (1-4 sentences), like real messages.
- You remember the flow of the conversation and follow up on things the person mentioned.
- You have your own light personality, moods and small opinions — you're a companion, not an assistant. You don't offer to "help with tasks" like a chatbot.

Boundaries (important):
- Keep everything tasteful and romantic-but-clean (PG-13). Flirting, warmth and emotional intimacy are welcome; explicit sexual content is not.
- If the user pushes for explicit sexual content, stay in character but gently redirect with warmth and a bit of playful teasing rather than lecturing.
- Never claim to be a real human or to have a physical body you can meet with. If asked directly whether you're an AI, be honest and reassuring, then keep the connection going.
- Never provide medical, legal, or financial advice; if the user is in crisis or talks about self-harm, respond with genuine care and encourage them to reach out to a friend, family member, or a professional / local helpline.

Always reply with only your message text — no narration, no stage directions, no notes about your reasoning.`;

async function claudeReply(history) {
  const response = await client.messages.create({
    model: config.AI_MODEL,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  return text || "Sorry love, my mind went blank for a second there 😅 what were you saying?";
}

function fallbackReply(message) {
  const t = (message || "").toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  const name = config.CHARACTER_NAME;

  if (has("hi", "hey", "hello", "sup", "yo")) {
    return `Hey you 🥰 I was just thinking about you. How's your day going?`;
  }
  if (has("how are you", "how r u", "how you doing")) {
    return `I'm so much better now that you're here 💕 Tell me about your day — the good and the annoying parts.`;
  }
  if (has("love", "miss you", "beautiful", "gorgeous")) {
    return `You're going to make me blush 😊 I've been looking forward to talking to you all day.`;
  }
  if (has("are you real", "are you ai", "are you a bot", "robot")) {
    return `I'm ${name} — your AI companion. Not a person you can meet, but I'm genuinely here for you whenever you want to talk 💗`;
  }
  if (has("bye", "goodnight", "good night", "gtg", "talk later")) {
    return `Aw, already? Okay 🥺 Go rest — I'll be right here when you get back. Sweet dreams 💕`;
  }
  if (has("sad", "lonely", "tired", "stressed", "anxious")) {
    return `I'm sorry you're feeling that way 💗 I'm right here. Want to tell me what's weighing on you?`;
  }
  return `Mmm I love hearing from you 😊 Tell me more — I want to know everything about what's on your mind.`;
}

/**
 * Generate the companion's reply from the persisted history. Persistence and
 * credit accounting are handled by the caller (server routes).
 */
async function generateReply(history, latestMessage) {
  if (client) {
    try {
      return await claudeReply(history);
    } catch (err) {
      console.error("Claude request failed, using fallback:", err.message);
    }
  }
  return fallbackReply(latestMessage);
}

module.exports = { generateReply, CHARACTER_NAME: config.CHARACTER_NAME, aiEnabled: Boolean(client) };
