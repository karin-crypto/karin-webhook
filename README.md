# מיה – סוכנת שירות לקוחות 🤖

Mia is a ready-to-use **Hebrew customer-service agent**, served over a small
Express webhook and powered by Claude. She answers customers in Hebrew, keeps
per-session conversation context, and ships with a minimal embeddable web chat
page so you can talk to her immediately.

When no `ANTHROPIC_API_KEY` is configured she falls back to a built-in
rule-based Hebrew responder, so the service still runs out of the box.

## הרצה מהירה (Quick start)

```bash
npm install

# Optional: enable Claude
cp .env.example .env
# then edit .env and set ANTHROPIC_API_KEY

npm start
```

Open <http://localhost:3000> to chat with Mia, or call the webhook directly.

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

Liveness probe — returns the active model and whether Claude is enabled.

### `GET /`

A minimal RTL Hebrew chat widget for testing Mia in the browser.

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
