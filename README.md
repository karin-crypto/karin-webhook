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

## הגדרות (Configuration)

| Env var             | Default            | Description                                       |
| ------------------- | ------------------ | ------------------------------------------------- |
| `ANTHROPIC_API_KEY` | _(none)_           | Enables Claude-powered replies.                   |
| `MIA_MODEL`         | `claude-opus-4-8`  | Model that powers Mia (`claude-haiku-4-5` is cheaper/faster). |
| `MIA_BUSINESS`      | `החברה`            | Business name Mia represents (used in her prompt). |
| `PORT`              | `3000`             | Port the server listens on.                       |

## חיבור לערוצים (Connecting channels)

The `/webhook` endpoint is channel-agnostic — it accepts `{ message, sessionId }`
and returns `{ reply }`. To wire it to WhatsApp, Telegram, or a website widget,
have your channel adapter translate inbound messages into that shape and send
Mia's `reply` back to the user.

## הערות (Notes)

- Conversation history is kept **in memory** (last 20 messages per session).
  For production, back it with Redis or a database so context survives restarts
  and scales across instances.
- Mia is instructed never to invent prices, policies, or order statuses. To give
  her real account/order data, extend `/webhook` with tool use or a lookup step.
