# קרין קרן – אתר, פורטל לקוחות ומיה 🤖

This app serves the **Karin Keren financial agency** website and client portal
(Roeto + Twilio OTP), plus **Mia (מיה)** — a Hebrew AI customer-service agent
powered by Claude. Mia answers customers in Hebrew, keeps per-session
conversation context, and speaks both a generic JSON webhook and WhatsApp.

When no `ANTHROPIC_API_KEY` is configured Mia falls back to a built-in
rule-based Hebrew responder, so the service still runs out of the box.

## הרצה מהירה (Quick start)

```bash
npm install

# Optional: enable Claude / WhatsApp / Postgres
cp .env.example .env
# then edit .env (ANTHROPIC_API_KEY etc.)

npm start
```

- <http://localhost:3000> — the business website (client portal at `/portal.html`)
- <http://localhost:3000/mia.html> — Mia's chat page

## ה־API

### `POST /webhook`

Request body:

```json
{ "message": "מתי תגיע ההזמנה שלי?", "sessionId": "optional-id" }
```

Response:

```json
{ "reply": "כדי לבדוק סטטוס הזמנה אצטרך את מספר ההזמנה שלך...", "sessionId": "sess_..." }
```

- `message` (required) – the customer's message.
- `sessionId` (optional) – pass it back on each turn to preserve conversation
  context. If omitted, the server generates one and returns it.

Example:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":"שלום, אשמח לבטל הזמנה"}'
```

### `GET /health`

Liveness probe (used by Railway) — includes Mia's status: active model,
whether Claude is enabled, the conversation store, and WhatsApp configuration.

### `GET /mia.html`

A minimal RTL Hebrew chat widget for testing Mia in the browser. The website
itself is served at `GET /` and the client portal at `/portal.html`.

## חיבור לווצאפ (WhatsApp Cloud API)

Mia speaks WhatsApp via Meta's Cloud API.

1. In the [Meta App dashboard](https://developers.facebook.com/) add the
   **WhatsApp** product and grab your **Phone number ID** and an access token.
2. Set these env vars (see `.env.example`):
   - `WHATSAPP_VERIFY_TOKEN` — any string you choose
   - `WHATSAPP_TOKEN` — Graph API access token
   - `WHATSAPP_PHONE_NUMBER_ID` — the sending number's ID
   - `WHATSAPP_APP_SECRET` *(optional)* — enables request signature verification
3. Under **WhatsApp → Configuration**, set the webhook:
   - **Callback URL:** `https://<your-host>/webhook/whatsapp`
   - **Verify token:** same value as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the **`messages`** field.

Meta calls `GET /webhook/whatsapp` once to verify, then POSTs incoming messages
to the same path. Mia replies through the Graph API, keyed by the customer's
phone number so each contact keeps its own conversation context.

> During local development, expose your server with a tunnel (e.g. `ngrok http 3000`)
> and use the HTTPS URL it gives you as the callback URL.

## הגדרות (Configuration)

| Env var                    | Default            | Description                                                    |
| -------------------------- | ------------------ | -------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`        | _(none)_           | Enables Claude-powered replies.                                |
| `MIA_MODEL`                | `claude-opus-4-8`  | Model that powers Mia (`claude-haiku-4-5` is cheaper/faster).  |
| `MIA_BUSINESS`             | `החברה`            | Business name Mia represents (used in her prompt).             |
| `PORT`                     | `3000`             | Port the server listens on.                                    |
| `DATABASE_URL`             | _(none)_           | Postgres connection string. Set → persistent history; unset → in-memory. |
| `PGSSL`                    | _(none)_           | `true` for managed Postgres that requires SSL.                 |
| `WHATSAPP_VERIFY_TOKEN`    | _(none)_           | Matches the verify token in Meta's webhook config.             |
| `WHATSAPP_TOKEN`           | _(none)_           | Graph API access token for sending messages.                   |
| `WHATSAPP_PHONE_NUMBER_ID` | _(none)_           | The sending phone number's ID.                                 |
| `WHATSAPP_APP_SECRET`      | _(none)_           | Optional — enables `X-Hub-Signature-256` verification.         |
| `WHATSAPP_API_VERSION`     | `v21.0`            | Graph API version.                                             |

## אחסון שיחות (Conversation storage)

Conversation history (last 20 messages per session) is stored in:

- **Postgres** when `DATABASE_URL` is set — survives restarts and scales across
  instances. The `mia_messages` table is created automatically on startup.
- **In-memory** otherwise — zero config, but lost on restart.

For a hosted WhatsApp bot, set `DATABASE_URL` so context isn't lost when the
process recycles.

## חיבור לערוצים נוספים (Other channels)

The `/webhook` endpoint is channel-agnostic — `{ message, sessionId }` in,
`{ reply }` out. To add Telegram or another channel, translate inbound messages
into that shape, call `generateReply(store, sessionId, message)` from `agent.js`,
and send the reply back — exactly as `whatsapp.js` does.

## הערות (Notes)

- Mia is instructed never to invent prices, policies, or order statuses. To give
  her real account/order data, extend `agent.js` with tool use or a lookup step.

## אופק – OFEK AI 4.0 (מחקר השקעות, פנימי)

מודול מחקר השקעות פנימי לצוות. כל הנתיבים תחת `/api/ofek` דורשים
`Authorization: Bearer $OFEK_ADMIN_TOKEN` (בלי הטוקן ה־API כבוי).

| נתיב | מה עושה |
|---|---|
| `GET /api/ofek/status` | גרסה, מצב מנוע המחקר, סוג היומן ובדיקת שלמות |
| `POST /api/ofek/research` | דוח מחקר (Claude + חיפוש רשת) במבנה הדוח המקצועי. `context` = תוצאות כמותיות שחושבו בפועל |
| `POST /api/ofek/forecast-card/validate` | בדיקת כרטיס תחזית (שדות חובה, עיגול נגד דיוק מדומה, טווח סטטיסטי מול שיפוטי) |
| `POST /api/ofek/forecasts` | רישום תחזית ביומן |
| `POST /api/ofek/forecasts/:id/revise` | גרסה חדשה (המקור נשמר כפי שהיה) |
| `POST /api/ofek/forecasts/:id/outcome` | רישום תוצאה בפועל + שגיאת חיזוי |
| `GET /api/ofek/forecasts`, `/forecasts/:id/history`, `/ledger/verify` | עיון ביומן ובדיקת שרשרת ה־hash |
| `GET /api/ofek/evaluate` | MAE / RMSE / Bias / כיוון / כיסוי טווח בתקופת פעילות אמיתית, מול מודל ייחוס נאיבי |
| `POST /api/ofek/evaluate/walk-forward` | בדיקת Walk-Forward היסטורית למודלי הייחוס |
| `POST /api/ofek/evaluate/compare` | מבחן פרמוטציה — "שיפור" רק אם מובהק |
| `POST /api/ofek/signals` | Early Market Signal Engine — 3 רמות לפי מדדים שסופקו |
| `POST /api/ofek/retirement/simulate` | צבירה, דמי ניהול, מונטה קרלו, סיכון רצף ואריכות ימים |
| `POST /api/ofek/pension/compare` | השוואת מסלולים באותה רמת סיכון ובאותה תקופה |
| `POST /api/ofek/video/check` | בקרת איכות לסרטון לפני פרסום (כולל אישור קארין) |

יומן התחזיות מאפשר רק הוספה (append-only) ושרשרת hash; ב־Postgres טריגר חוסם
UPDATE/DELETE. בלי `DATABASE_URL` היומן נשמר בזיכרון בלבד וכל תגובה מציינת זאת.
אין במודול מסחר, ניוד או העברת כספים. נתוני האתר (compare-app) הם נתוני דמו ואין להזין אותם למחקר.

בדיקות: `npm test`.
