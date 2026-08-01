# Aria — AI Companion Web App

A self-contained web app for an AI companion chat service (18+). Users register
with age verification, chat with an AI character, spend credits per message or
subscribe monthly for unlimited chat, and pay via Stripe. Includes per-user
chat history and an admin dashboard for users and revenue.

Built with Node.js + Express and a vanilla-JS dark-theme frontend (no build
step). Runs with **zero configuration** for local demos and layers in real
services (Postgres, Anthropic Claude, Stripe) via environment variables.

## Features

- **Auth + 18+ age gate** — email/password registration with date-of-birth age
  verification (must be ≥ 18) and an explicit confirmation checkbox. Passwords
  are bcrypt-hashed; sessions are JWTs.
- **Chat** — a warm, tasteful AI companion powered by Claude, with a scripted
  fallback when no API key is set. Conversation history is persisted per user.
- **Credits / tokens** — 1 credit = 1 message. New users get a free bonus.
  Buy credit packs via Stripe Checkout.
- **Subscription** — monthly membership for unlimited messages.
- **Stripe payments** — Checkout Sessions + webhook fulfillment. Without a key,
  a **sandbox** mode fulfills purchases instantly so the flow is fully testable.
- **Admin panel** — total users, total revenue, active subscriptions, a user
  table and a transactions table. Restricted to admin accounts.
- **Dark, modern, mobile-friendly** UI.

## Quick start

```bash
cd companion
npm install
npm start
# → http://localhost:4000
```

With no env vars set you get: in-memory data, sandbox payments (no real
charges), and scripted companion replies — enough to click through the entire
product. To become an admin, set `ADMIN_EMAIL` before registering that account.

## Production configuration

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Stable session-signing secret (required so logins survive restarts) |
| `DATABASE_URL` | Postgres connection string — persistent users, chat, transactions |
| `ANTHROPIC_API_KEY` | Enables real Claude-powered replies |
| `STRIPE_SECRET_KEY` | Enables real Stripe Checkout |
| `STRIPE_WEBHOOK_SECRET` | Verifies incoming Stripe webhooks |
| `PUBLIC_URL` | Base URL for Stripe success/cancel redirects |
| `ADMIN_EMAIL` | Account granted admin access |

Point a Stripe webhook at `POST /api/stripe/webhook` for the events
`checkout.session.completed`, `invoice.paid`, and
`customer.subscription.deleted`.

## API overview

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/config` | — | Public config (character, packs, pricing, mode) |
| `POST /api/auth/register` | — | Register (age-verified) |
| `POST /api/auth/login` | — | Log in |
| `GET /api/me` | user | Current user + subscription status |
| `GET /api/chat/history` | user | Saved conversation |
| `POST /api/chat` | user | Send a message, get a reply (spends a credit) |
| `POST /api/chat/reset` | user | Clear chat history |
| `POST /api/checkout/credits` | user | Buy a credit pack |
| `POST /api/checkout/subscription` | user | Start the monthly subscription |
| `POST /api/stripe/webhook` | Stripe | Payment fulfillment |
| `GET /api/admin/stats` | admin | Users, revenue, active subs |
| `GET /api/admin/users` | admin | User list |
| `GET /api/admin/transactions` | admin | Transaction list |

Pages: `/` (landing + auth), `/app.html` (chat + store), `/admin.html` (admin).

## Deployment

Any Node host works (Railway, Render, Fly, a VPS). Start command: `node server.js`.
Health check: `GET /health`. Provision a Postgres database and set the env vars
above.

## Notes & responsible use

Aria is an AI companion for entertainment and emotional support — not a real
person, and not a source of medical, legal, or financial advice. The persona is
intentionally kept tasteful (PG-13); the system prompt steers away from explicit
sexual content and encourages users in crisis to seek real-world support. The
service is restricted to users 18 and older.
