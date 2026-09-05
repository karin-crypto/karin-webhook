"use strict";

/**
 * WhatsApp Cloud API (Meta) channel for Mia.
 *
 * Routes (registered on the Express app):
 *   GET  /webhook/whatsapp   webhook verification handshake (Meta calls once)
 *   POST /webhook/whatsapp   inbound messages -> Mia -> reply via Graph API
 *
 * Handles text messages and voice notes. Voice notes are downloaded from the
 * Graph API, transcribed (see transcribe.js), echoed back to the customer so
 * they can see what was understood, and then answered by Mia.
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
 *   OPENAI_API_KEY             enables voice-note transcription (transcribe.js)
 */

const crypto = require("crypto");
const { generateReply } = require("./agent");
const { transcribeAudio, transcriptionEnabled } = require("./transcribe");

const {
  WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_APP_SECRET,
  WHATSAPP_API_VERSION = "v21.0",
} = process.env;

const GRAPH_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;
const MEDIA_TIMEOUT_MS = 30000;

const whatsappConfigured = Boolean(
  WHATSAPP_VERIFY_TOKEN && WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID
);

// Customer-facing messages for the voice-note flow.
const VOICE_MESSAGES = {
  notConfigured: "כרגע אני לא יכולה להאזין להודעות קוליות. אפשר לכתוב לי במקום?",
  empty:
    "לא הצלחתי להבין את ההודעה הקולית. אפשר לנסות להקליט שוב במקום שקט יותר, או פשוט לכתוב לי?",
  failed:
    "מצטערת, לא הצלחתי לעבד את ההודעה הקולית כרגע. אפשר לכתוב לי במקום, או לנסות שוב בעוד רגע?",
  heard: (text) => `🎤 שמעתי: «${text}»`,
};

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
  const url = `${GRAPH_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
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

/**
 * Download a media object (voice note, audio, …) from the Graph API.
 * Step 1 resolves the media ID to a short-lived URL; step 2 fetches the bytes.
 * Both calls need the bearer token. Resolves to { buffer, mimeType }.
 */
async function downloadWhatsAppMedia(mediaId) {
  if (!WHATSAPP_TOKEN) throw new Error("WHATSAPP_TOKEN not set; cannot download media");
  const headers = { Authorization: `Bearer ${WHATSAPP_TOKEN}` };

  const metaRes = await fetch(`${GRAPH_URL}/${mediaId}`, {
    headers,
    signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
  });
  if (!metaRes.ok) {
    throw new Error(`Media lookup failed ${metaRes.status}: ${await metaRes.text()}`);
  }
  const meta = await metaRes.json();
  if (!meta.url) throw new Error(`Media lookup returned no url for ${mediaId}`);

  const fileRes = await fetch(meta.url, {
    headers,
    signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
  });
  if (!fileRes.ok) {
    throw new Error(`Media download failed ${fileRes.status}: ${await fileRes.text()}`);
  }
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const mimeType = fileRes.headers.get("content-type") || meta.mime_type || "audio/ogg";
  return { buffer, mimeType };
}

async function handleTextMessage(store, msg) {
  const from = msg.from; // customer's phone number
  const text = msg.text?.body;
  if (!from || !text) return;

  const reply = await generateReply(store, `wa_${from}`, text);
  await sendWhatsAppText(from, reply);
}

async function handleAudioMessage(store, msg) {
  const from = msg.from;
  const mediaId = msg.audio?.id;
  if (!from || !mediaId) return;

  if (!transcriptionEnabled) {
    console.warn(`Voice note ${msg.id} from ${from} ignored: transcription not configured`);
    await sendWhatsAppText(from, VOICE_MESSAGES.notConfigured);
    return;
  }

  let transcript;
  try {
    const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);
    const started = Date.now();
    const result = await transcribeAudio(buffer, mimeType);
    transcript = result.text;
    console.log(
      `Voice note ${msg.id} from ${from}: ${buffer.length} bytes, ${mimeType}, ` +
        `${result.model}, ${Date.now() - started}ms, ${transcript.length} chars`
    );
  } catch (err) {
    console.error(`Voice note ${msg.id} from ${from} failed:`, err);
    await sendWhatsAppText(from, VOICE_MESSAGES.failed);
    return;
  }

  if (!transcript) {
    console.warn(`Voice note ${msg.id} from ${from}: empty transcript`);
    await sendWhatsAppText(from, VOICE_MESSAGES.empty);
    return;
  }

  console.log(`Voice note ${msg.id} transcript: ${transcript}`);
  await sendWhatsAppText(from, VOICE_MESSAGES.heard(transcript));
  const reply = await generateReply(store, `wa_${from}`, transcript);
  await sendWhatsAppText(from, reply);
}

async function handleMessage(store, msg) {
  if (!msg || alreadyProcessed(msg.id)) return;
  switch (msg.type) {
    case "text":
      return handleTextMessage(store, msg);
    case "audio":
      return handleAudioMessage(store, msg);
    default:
      return; // statuses, images, documents, … are ignored
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

    // Meta may batch several messages into one delivery; handle each one
    // independently so a failure in one doesn't drop the rest.
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
    for (const entry of entries) {
      for (const change of entry?.changes || []) {
        for (const msg of change?.value?.messages || []) {
          try {
            await handleMessage(store, msg);
          } catch (err) {
            console.error(`WhatsApp handler error (message ${msg?.id}):`, err);
          }
        }
      }
    }
  });
}

module.exports = {
  registerWhatsApp,
  sendWhatsAppText,
  downloadWhatsAppMedia,
  handleMessage,
  whatsappConfigured,
  VOICE_MESSAGES,
};
