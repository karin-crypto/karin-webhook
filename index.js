"use strict";

/**
 * Mia – AI customer service agent (Hebrew).
 *
 * Endpoints:
 *   POST /webhook            { message, sessionId? }  ->  { reply, sessionId }   (channel-agnostic)
 *   GET  /webhook/whatsapp   WhatsApp Cloud API verification handshake
 *   POST /webhook/whatsapp   WhatsApp Cloud API inbound messages
 *   GET  /                   minimal embeddable Hebrew (RTL) chat page for testing
 *   GET  /health             liveness probe
 *
 * Mia answers in Hebrew. When ANTHROPIC_API_KEY is set she is powered by Claude;
 * otherwise she falls back to a small rule-based Hebrew responder so the service
 * still runs out of the box. Conversation history is kept in Postgres when
 * DATABASE_URL is set, otherwise in memory (see store.js).
 */

const path = require("path");
const express = require("express");

const { createStore } = require("./store");
const { generateReply, MIA_MODEL, claudeEnabled } = require("./agent");
const { registerWhatsApp, whatsappConfigured } = require("./whatsapp");

const { PORT = 3000 } = process.env;

const store = createStore();

const app = express();
// Capture the raw body so the WhatsApp channel can verify X-Hub-Signature-256.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    model: MIA_MODEL,
    claudeEnabled,
    store: store.kind,
    whatsapp: whatsappConfigured,
  });
});

// Channel-agnostic webhook (web widget, custom integrations).
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body && req.body.message;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' (string) in request body." });
    }

    const sessionId =
      (req.body && req.body.sessionId) ||
      `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

    const reply = await generateReply(store, sessionId, message);
    res.json({ reply, sessionId });
  } catch (err) {
    console.error("Unexpected error in /webhook:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// WhatsApp Cloud API channel.
registerWhatsApp(app, store);

const server = app.listen(PORT, () => {
  console.log(`Mia is listening on port ${PORT}`);
  console.log(
    `Claude ${claudeEnabled ? "enabled" : "disabled (rule-based fallback)"} | ` +
      `model: ${MIA_MODEL} | store: ${store.kind} | ` +
      `whatsapp: ${whatsappConfigured ? "configured" : "not configured"}`
  );
});

// Graceful shutdown so DB connections close cleanly.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(async () => {
      await store.close();
      process.exit(0);
    });
  });
}

module.exports = app;
