"use strict";

// Run with: npm test  (node --test, no extra dependencies)
//
// Exercises the WhatsApp voice-note flow end to end with a stubbed fetch:
// Graph media lookup -> media download -> transcription -> Mia reply -> sends.

const test = require("node:test");
const assert = require("node:assert/strict");

process.env.WHATSAPP_VERIFY_TOKEN = "verify";
process.env.WHATSAPP_TOKEN = "wa-token";
process.env.WHATSAPP_PHONE_NUMBER_ID = "12345";
process.env.OPENAI_API_KEY = "sk-test";
delete process.env.ANTHROPIC_API_KEY; // use Mia's rule-based fallback
delete process.env.DATABASE_URL; // in-memory store

const express = require("express");
const { createStore } = require("../store");
const { registerWhatsApp, handleMessage } = require("../whatsapp");
const { fileNameFor } = require("../transcribe");

const AUDIO_BYTES = Buffer.from("OggS-fake-opus-voice-note");
const TRANSCRIPT =
  "מה שאני רואה זה שהטרסה הראשונה יושבת מעל שביל הגישה, והכביש שעולה מגיע עד הבית.";

// Records every outbound fetch and answers by URL.
function installFetchStub({ transcript = TRANSCRIPT, transcribeStatus = 200 } = {}) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const u = String(url);
    if (u === "https://graph.facebook.com/v21.0/12345/messages") {
      return new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 });
    }
    if (/^https:\/\/graph\.facebook\.com\/v21\.0\/media-\d+$/.test(u)) {
      return new Response(
        JSON.stringify({ url: "https://lookaside.example/dl", mime_type: "audio/ogg" }),
        { status: 200 }
      );
    }
    if (u === "https://lookaside.example/dl") {
      return new Response(AUDIO_BYTES, {
        status: 200,
        headers: { "content-type": "audio/ogg; codecs=opus" },
      });
    }
    if (u === "https://api.openai.com/v1/audio/transcriptions") {
      if (transcribeStatus !== 200) {
        return new Response(JSON.stringify({ error: { message: "boom" } }), {
          status: transcribeStatus,
        });
      }
      return new Response(JSON.stringify({ text: transcript }), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  };
  return calls;
}

const sentTexts = (calls) =>
  calls
    .filter((c) => c.url.endsWith("/12345/messages"))
    .map((c) => JSON.parse(c.init.body).text.body);

const audioMessage = (id, mediaId) => ({
  id,
  from: "972501234567",
  type: "audio",
  timestamp: "1700000000",
  audio: { id: mediaId, mime_type: "audio/ogg; codecs=opus", voice: true },
});

const textMessage = (id, body) => ({
  id,
  from: "972501234567",
  type: "text",
  timestamp: "1700000000",
  text: { body },
});

test("voice note is downloaded, transcribed in Hebrew, echoed and answered", async () => {
  const calls = installFetchStub();
  const store = createStore();

  await handleMessage(store, audioMessage("wamid.voice1", "media-1"));

  // Media lookup + download both carry the WhatsApp bearer token.
  const lookup = calls.find((c) => c.url.endsWith("/media-1"));
  const download = calls.find((c) => c.url === "https://lookaside.example/dl");
  assert.ok(lookup && download, "media lookup and download happened");
  assert.equal(lookup.init.headers.Authorization, "Bearer wa-token");
  assert.equal(download.init.headers.Authorization, "Bearer wa-token");

  // Transcription request: correct auth, whole file, Hebrew hint, vocabulary prompt.
  const tx = calls.find((c) => c.url.includes("audio/transcriptions"));
  assert.ok(tx, "transcription was requested");
  assert.equal(tx.init.headers.Authorization, "Bearer sk-test");
  const form = tx.init.body;
  assert.ok(form instanceof FormData);
  assert.equal(form.get("model"), "gpt-4o-transcribe");
  assert.equal(form.get("language"), "he");
  assert.equal(form.get("temperature"), "0");
  assert.match(form.get("prompt"), /פנסיה/);
  const file = form.get("file");
  assert.equal(file.name, "voice.ogg");
  assert.equal(file.size, AUDIO_BYTES.length);

  // Customer sees what was heard, then Mia's reply.
  const texts = sentTexts(calls);
  assert.equal(texts.length, 2);
  assert.equal(texts[0], `🎤 שמעתי: «${TRANSCRIPT}»`);
  assert.ok(texts[1].length > 0);

  // The transcript, not the audio, went into Mia's history.
  const history = await store.getHistory("wa_972501234567");
  assert.equal(history[0].role, "user");
  assert.equal(history[0].content, TRANSCRIPT);
});

test("empty transcript tells the customer instead of answering fragments", async () => {
  const calls = installFetchStub({ transcript: "   " });
  const store = createStore();

  await handleMessage(store, audioMessage("wamid.voice2", "media-2"));

  const texts = sentTexts(calls);
  assert.equal(texts.length, 1);
  assert.match(texts[0], /לא הצלחתי להבין/);
  assert.equal((await store.getHistory("wa_972501234567")).length, 0);
});

test("transcription provider error is reported to the customer, not swallowed", async () => {
  const calls = installFetchStub({ transcribeStatus: 500 });
  const store = createStore();

  await handleMessage(store, audioMessage("wamid.voice3", "media-3"));

  const texts = sentTexts(calls);
  assert.equal(texts.length, 1);
  assert.match(texts[0], /לא הצלחתי לעבד/);
});

test("webhook handles every message in a batched delivery", async () => {
  const calls = installFetchStub();
  const store = createStore();
  const app = express();
  app.use(express.json());
  registerWhatsApp(app, store);
  const server = app.listen(0);
  const port = server.address().port;

  const realFetch = global.fetch;
  const body = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                textMessage("wamid.t1", "שלום"),
                audioMessage("wamid.a1", "media-4"),
                textMessage("wamid.t2", "תודה"),
              ],
            },
          },
        ],
      },
    ],
  };

  // Use the real HTTP client for the webhook call itself; the handler's
  // outbound calls still hit the stub because it runs in the same process.
  const http = require("node:http");
  await new Promise((resolve, reject) => {
    const req = http.request(
      { port, path: "/webhook/whatsapp", method: "POST", headers: { "content-type": "application/json" } },
      (res) => {
        assert.equal(res.statusCode, 200);
        res.resume();
        res.on("end", resolve);
      }
    );
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });

  // The webhook acks before processing; wait for the async work to drain.
  const deadline = Date.now() + 5000;
  while (sentTexts(calls).length < 4 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 20));
  }
  server.close();
  global.fetch = realFetch;

  const texts = sentTexts(calls);
  // text -> 1 reply, audio -> echo + reply, text -> 1 reply
  assert.equal(texts.length, 4);
  assert.equal(texts[1], `🎤 שמעתי: «${TRANSCRIPT}»`);
  assert.equal((await store.getHistory("wa_972501234567")).length, 6);
});

test("duplicate deliveries of the same voice note are processed once", async () => {
  const calls = installFetchStub();
  const store = createStore();

  await handleMessage(store, audioMessage("wamid.dup", "media-5"));
  await handleMessage(store, audioMessage("wamid.dup", "media-5"));

  assert.equal(calls.filter((c) => c.url.includes("audio/transcriptions")).length, 1);
});

test("fileNameFor maps WhatsApp media types to transcription file names", () => {
  assert.deepEqual(fileNameFor("audio/ogg; codecs=opus"), { name: "voice.ogg", type: "audio/ogg" });
  assert.deepEqual(fileNameFor("audio/mpeg"), { name: "voice.mp3", type: "audio/mpeg" });
  assert.deepEqual(fileNameFor("audio/mp4"), { name: "voice.m4a", type: "audio/mp4" });
  assert.deepEqual(fileNameFor(undefined), { name: "voice.ogg", type: "audio/ogg" });
});
