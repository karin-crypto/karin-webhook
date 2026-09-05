"use strict";

/**
 * Speech-to-text for Mia's voice messages.
 *
 * Claude's Messages API has no audio input, so voice notes are transcribed
 * with OpenAI's audio transcription endpoint and the resulting Hebrew text is
 * handed to Mia like any typed message.
 *
 * Env:
 *   OPENAI_API_KEY        enables transcription (unset -> voice notes are declined politely)
 *   TRANSCRIBE_MODEL      default gpt-4o-transcribe (whisper-1 also works)
 *   TRANSCRIBE_LANGUAGE   ISO-639-1 hint, default "he". Without it the model
 *                         auto-detects the language and tends to drop Hebrew
 *                         segments, which is what produces fragmentary output.
 *   TRANSCRIBE_PROMPT     domain vocabulary that steers spelling of names/terms.
 */

const {
  OPENAI_API_KEY,
  TRANSCRIBE_MODEL = "gpt-4o-transcribe",
  TRANSCRIBE_LANGUAGE = "he",
  TRANSCRIBE_PROMPT,
  TRANSCRIBE_TIMEOUT_MS = "60000",
} = process.env;

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";

// Domain vocabulary. The transcription model uses this as a style/spelling
// hint, so the terms clients actually say come back spelled consistently.
const DEFAULT_PROMPT =
  "שיחה בעברית עם סוכנות לביטוח ופיננסים: פנסיה, קרן פנסיה, קרן השתלמות, קופת גמל, " +
  "ביטוח מנהלים, פוליסה, טופס 161, פיצויים, פדיון, ניוד, דמי ניהול, מסלול, " +
  "פנסיית גישור, נמל חיפה, פרישה, זכאות, קצבה.";

const transcriptionEnabled = Boolean(OPENAI_API_KEY);

// Map the media type WhatsApp reports to a file name the transcription
// endpoint recognises. Voice notes arrive as "audio/ogg; codecs=opus".
function fileNameFor(mimeType = "") {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  const ext =
    {
      "audio/ogg": "ogg",
      "audio/opus": "ogg",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/mp4": "m4a",
      "audio/m4a": "m4a",
      "audio/x-m4a": "m4a",
      "audio/aac": "aac",
      "audio/amr": "amr",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/webm": "webm",
    }[base] || "ogg";
  return { name: `voice.${ext}`, type: base || "audio/ogg" };
}

/**
 * Transcribe an audio buffer. Resolves to { text, model }.
 * Throws an Error with `.status` / `.body` when the provider rejects the call.
 */
async function transcribeAudio(buffer, mimeType) {
  if (!transcriptionEnabled) {
    throw new Error("Transcription not configured: OPENAI_API_KEY is not set");
  }
  if (!buffer || buffer.length === 0) {
    throw new Error("Transcription called with an empty audio buffer");
  }

  const { name, type } = fileNameFor(mimeType);
  const form = new FormData();
  form.append("file", new Blob([buffer], { type }), name);
  form.append("model", TRANSCRIBE_MODEL);
  form.append("response_format", "json");
  form.append("temperature", "0");
  if (TRANSCRIBE_LANGUAGE) form.append("language", TRANSCRIBE_LANGUAGE);
  form.append("prompt", TRANSCRIBE_PROMPT || DEFAULT_PROMPT);

  const res = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(Number(TRANSCRIBE_TIMEOUT_MS) || 60000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Transcription failed ${res.status}: ${body.slice(0, 500)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  const data = await res.json();
  const text = typeof data.text === "string" ? data.text.trim() : "";
  return { text, model: TRANSCRIBE_MODEL };
}

module.exports = { transcribeAudio, transcriptionEnabled, TRANSCRIBE_MODEL, fileNameFor };
