#!/usr/bin/env node
"use strict";

/**
 * ElevenLabs voiceover demo — turn text into a spoken MP3.
 *
 * A tiny, dependency-free example of the same capability the ElevenLabs MCP
 * server exposes to Claude (see .mcp.json). Handy for a quick CLI check that
 * your ELEVENLABS_API_KEY works, or for generating a Hebrew voiceover of one
 * of Mia's replies.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... node scripts/voiceover-demo.js
 *   ELEVENLABS_API_KEY=sk_... node scripts/voiceover-demo.js "טקסט לקריינות"
 *   ELEVENLABS_API_KEY=sk_... node scripts/voiceover-demo.js "Some text" --voice <voice_id> --out hello.mp3
 *
 * Options:
 *   --voice <id>   ElevenLabs voice id (default: ELEVENLABS_VOICE_ID or Rachel).
 *   --model <id>   Model id (default: eleven_multilingual_v2 — supports Hebrew).
 *   --out <path>   Output file (default: <ELEVENLABS_MCP_BASE_PATH>/voiceover-<ts>.mp3).
 *
 * Requires Node 18+ (uses the built-in fetch).
 */

const fs = require("fs");
const path = require("path");

const {
  ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID,
  ELEVENLABS_MCP_BASE_PATH = "./data/elevenlabs",
} = process.env;

// Default Mia line, in Hebrew, when no text is passed on the CLI.
const DEFAULT_TEXT =
  "שלום, אני מיה, נציגת השירות של קרין קרן. אשמח לעזור לך בכל שאלה.";

// "Rachel" — a stock ElevenLabs voice available on every account.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

function parseArgs(argv) {
  const opts = { text: "", voice: "", model: "", out: "" };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--voice") opts.voice = argv[++i];
    else if (arg === "--model") opts.model = argv[++i];
    else if (arg === "--out") opts.out = argv[++i];
    else positional.push(arg);
  }
  opts.text = positional.join(" ").trim();
  return opts;
}

async function main() {
  if (!ELEVENLABS_API_KEY) {
    console.error(
      "Missing ELEVENLABS_API_KEY. Get one at " +
        "https://elevenlabs.io/app/settings/api-keys and export it, e.g.:\n" +
        "  export ELEVENLABS_API_KEY=sk_...\n"
    );
    process.exit(1);
  }

  const opts = parseArgs(process.argv.slice(2));
  const text = opts.text || DEFAULT_TEXT;
  const voiceId = opts.voice || ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = opts.model || DEFAULT_MODEL_ID;

  const outPath =
    opts.out ||
    path.join(ELEVENLABS_MCP_BASE_PATH, `voiceover-${Date.now()}.mp3`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  console.log(`Generating voiceover (${modelId}, voice ${voiceId})…`);

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`ElevenLabs API error ${res.status}: ${detail}`);
    process.exit(1);
  }

  const audio = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, audio);

  console.log(`✓ Wrote ${audio.length} bytes to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
