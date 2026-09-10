"use strict";

/**
 * Google Calendar integration for Mia — dependency-free.
 *
 * Uses a Google service account (JWT bearer flow) to create events, signed
 * with Node's crypto and sent with fetch — the same lightweight style the rest
 * of the app uses for Roeto and WhatsApp. No googleapis package required.
 *
 * Configure (see .env.example):
 *   GOOGLE_SA_EMAIL        service account email
 *   GOOGLE_SA_PRIVATE_KEY  the service account's PEM private key
 *                          (literal "\n" sequences are converted to newlines)
 *   GOOGLE_CALENDAR_ID     target calendar id (e.g. karin@... or "primary")
 * Optional:
 *   GOOGLE_CALENDAR_TZ     IANA timezone for events (default Asia/Jerusalem)
 *
 * Share the target calendar with the service account email (make-changes
 * permission) so it can create events on it.
 *
 * When not configured, calendarConfigured is false and callers fall back to
 * saving a pending meeting request instead of creating a real event.
 */

const crypto = require("crypto");

const {
  GOOGLE_SA_EMAIL,
  GOOGLE_SA_PRIVATE_KEY,
  GOOGLE_CALENDAR_ID,
  GOOGLE_CALENDAR_TZ = "Asia/Jerusalem",
} = process.env;

const calendarConfigured = Boolean(
  GOOGLE_SA_EMAIL && GOOGLE_SA_PRIVATE_KEY && GOOGLE_CALENDAR_ID
);

const TOKEN_URI = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function privateKey() {
  // Env vars commonly store the PEM with escaped newlines.
  return GOOGLE_SA_PRIVATE_KEY.replace(/\\n/g, "\n");
}

let _token = null; // { value, expiresAt }

async function getAccessToken() {
  if (_token && Date.now() < _token.expiresAt - 60000) return _token.value;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: GOOGLE_SA_EMAIL,
      scope: SCOPE,
      aud: TOKEN_URI,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claim}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(signingInput), privateKey())
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`);
  const json = await res.json();
  _token = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in || 3600) * 1000,
  };
  return _token.value;
}

// Normalize "YYYY-MM-DDTHH:MM[:SS]" to seconds precision.
function normalizeNaive(dt) {
  const m = String(dt).match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?/);
  if (!m) return null;
  return m[1] + (m[2] || ":00");
}

/**
 * Create a calendar event.
 *
 * @param {object} p
 * @param {string} p.summary      event title
 * @param {string} p.description  event body
 * @param {string} p.start        local wall-clock start "YYYY-MM-DDTHH:MM"
 *                                 (interpreted in GOOGLE_CALENDAR_TZ)
 * @param {number} [p.durationMinutes=30]
 * @returns {Promise<{id:string, htmlLink:string, start:string, end:string}>}
 */
async function createCalendarEvent({ summary, description, start, durationMinutes = 30 }) {
  const startNaive = normalizeNaive(start);
  if (!startNaive) throw new Error(`Invalid start datetime: ${start}`);

  // Both start and end are sent as naive local times with the same timeZone,
  // so the offset cancels and the wall-clock duration is preserved.
  const base = new Date(startNaive + "Z"); // treat as UTC purely for arithmetic
  const endNaive = new Date(base.getTime() + durationMinutes * 60000)
    .toISOString()
    .slice(0, 19);

  const token = await getAccessToken();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    GOOGLE_CALENDAR_ID
  )}/events`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary,
      description,
      start: { dateTime: startNaive, timeZone: GOOGLE_CALENDAR_TZ },
      end: { dateTime: endNaive, timeZone: GOOGLE_CALENDAR_TZ },
    }),
  });
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);

  const ev = await res.json();
  return { id: ev.id, htmlLink: ev.htmlLink, start: startNaive, end: endNaive };
}

module.exports = { calendarConfigured, createCalendarEvent, CALENDAR_TZ: GOOGLE_CALENDAR_TZ };
