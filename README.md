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

## הכלים של מיה (Mia's tools)

When Claude is enabled, Mia runs as an **agent** — she can call tools mid-reply
instead of only generating text. Tools live in `tools.js` (schema + executor)
and Mia loops through them automatically via `agent.js`:

| Tool                | What it does                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `get_business_info` | Returns grounded facts (services, contact, portal) so Mia answers factually instead of guessing. |
| `save_inquiry`      | Captures a lead (name + phone + topic) into the shared inquiries store — the same one the website contact form writes to. Karin sees it at `GET /api/inquiries`. |

So a WhatsApp customer who says *"רוצה לפתוח קרן השתלמות, תחזרו אליי 052…"* gets
her details saved as a real inquiry, not just a polite reply. Inquiries carry a
`source` field (`"website"` or `"mia"`).

The tool loop is capped at `MAX_TOOL_STEPS` (in `agent.js`) so it can't spin
against the API. Intermediate `tool_use`/`tool_result` blocks live only within a
single turn — the persisted conversation history stays plain text.

**Adding a tool:** add a `{ name, description, input_schema }` entry to `TOOLS`
and an executor in `EXECUTORS` in `tools.js`. Executors must never throw (return
an error payload instead) so Mia can recover in-conversation.

> **Security:** client lookup by ID (Roeto) is intentionally *not* a Mia tool.
> That data is PII gated behind the portal's OTP flow; exposing it to an
> unauthenticated chat would be a disclosure risk. Gate any such tool on a
> verified session before adding it.

## חיבור לערוצים נוספים (Other channels)

The `/webhook` endpoint is channel-agnostic — `{ message, sessionId }` in,
`{ reply }` out. To add Telegram or another channel, translate inbound messages
into that shape, call `generateReply(store, sessionId, message)` from `agent.js`,
and send the reply back — exactly as `whatsapp.js` does.

## הערות (Notes)

- Mia is instructed never to invent prices, policies, or order statuses — and
  now backs that up with tools (see *Mia's tools* above): she grounds factual
  answers in `get_business_info` and turns real intent into leads via
  `save_inquiry`.
