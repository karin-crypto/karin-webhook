"use strict";

/**
 * WhatsApp Cloud API (Meta) channel for Mia.
 *
 * Routes (registered on the Express app):
 *   GET  /webhook/whatsapp   webhook verification handshake (Meta calls once)
 *   POST /webhook/whatsapp   inbound messages -> Mia -> reply via Graph API
 *
 * Setup (Meta App > WhatsApp > Configuration):
 *   - Callback URL: https://<your-host>/webhook/whatsapp
 *   - Verify token: must match WHATSAPP_VERIFY_TOKEN
 *   - Subscribe to the "messages" webhook field
 *
 * Required env to actually send replies:
 *   WHATSAPP_VERIFY_TOKEN      any string you choose (used in the handshake)
 *   WHATSAPP_TOKEN             access token for the Graph API
 *   WHATSAPP_PHONE_NUMBER_ID   the sending phone number's ID
 * Optional:
 *   WHATSAPP_APP_SECRET        enables X-Hub-Signature-256 verification
 *   WHATSAPP_API_VERSION       Graph API version (default v21.0)
 */

const crypto = require("crypto");
const { generateReply, autoReplyEnabled } = require("./agent");

const {
  WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_APP_SECRET,
  WHATSAPP_API_VERSION = "v21.0",
} = process.env;

const whatsappConfigured = Boolean(
  WHATSAPP_VERIFY_TOKEN && WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID
);

// Dedupe message IDs — Meta retries deliveries and may resend the same message.
const seenMessages = new Set();
function alreadyProcessed(id) {
  if (!id) return false;
  if (seenMessages.has(id)) return true;
  seenMessages.add(id);
  if (seenMessages.size > 1000) {
    seenMessages.delete(seenMessages.values().next().value);
  }
  return false;
}

function verifySignature(req) {
  if (!WHATSAPP_APP_SECRET) return true; // verification not configured -> allow
  const sig = req.get("x-hub-signature-256");
  if (!sig || !req.rawBody) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", WHATSAPP_APP_SECRET).update(req.rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function sendWhatsAppText(to, text) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn(
      "WhatsApp send skipped: WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set"
    );
    return;
  }
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!res.ok) {
    console.error(`WhatsApp send failed ${res.status}: ${await res.text()}`);
  }
}

function registerWhatsApp(app, store) {
  // 1. Verification handshake
  app.get("/webhook/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  });

  // 2. Inbound messages
  app.post("/webhook/whatsapp", async (req, res) => {
    if (!verifySignature(req)) return res.sendStatus(403);
    res.sendStatus(200); // ack fast so Meta doesn't retry

    try {
      const value = req.body?.entry?.[0]?.changes?.[0]?.value;
      const msg = value?.messages?.[0];
      if (!msg || msg.type !== "text") return; // ignore statuses / non-text
      if (alreadyProcessed(msg.id)) return;

      const from = msg.from; // customer's phone number
      const text = msg.text?.body;
      if (!from || !text) return;

      // Automatic replies are disabled — receive the message but don't respond.
      if (!autoReplyEnabled) return;

      const reply = await generateReply(store, `wa_${from}`, text);
      await sendWhatsAppText(from, reply);
    } catch (err) {
      console.error("WhatsApp handler error:", err);
    }
  });
}

module.exports = { registerWhatsApp, sendWhatsAppText, whatsappConfigured };
