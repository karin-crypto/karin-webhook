"use strict";

/**
 * Aria — AI companion web app.
 *
 * Self-contained Express server: registration/login with 18+ age gate, a chat
 * interface backed by Claude, a credit/token system, a monthly subscription,
 * Stripe payments (with a keyless sandbox mode), per-user chat history, and an
 * admin panel. Runs with zero configuration for local demos; set env vars for
 * production (see .env.example).
 */

const express = require("express");
const path = require("path");

const config = require("./config");
const { createStore } = require("./db");
const auth = require("./auth");
const ai = require("./ai");
const payments = require("./payments");

const app = express();
const store = createStore();

/* ---- Stripe webhook needs the raw body; mount it BEFORE express.json(). ---- */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => payments.handleWebhook(store, req, res)
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const requireAuth = auth.requireAuth(store);
const requireAdmin = auth.requireAdmin(store);

/* ============================================================
   PUBLIC CONFIG
   ============================================================ */
app.get("/api/config", (req, res) => {
  res.json({
    characterName: config.CHARACTER_NAME,
    minAge: config.MIN_AGE,
    signupBonus: config.SIGNUP_BONUS_CREDITS,
    creditPacks: config.CREDIT_PACKS,
    subscription: {
      id: config.SUBSCRIPTION.id,
      label: config.SUBSCRIPTION.label,
      amountCents: config.SUBSCRIPTION.amountCents,
    },
    billingMode: config.billingMode,
    aiEnabled: config.aiEnabled,
    stripePublishableKey: config.STRIPE_PUBLISHABLE_KEY,
  });
});

/* ============================================================
   AUTH
   ============================================================ */
app.post("/api/auth/register", auth.register(store));
app.post("/api/auth/login", auth.login(store));

app.get("/api/me", requireAuth, async (req, res) => {
  const subscribed = await store.isSubscribed(req.user.id);
  res.json({ user: auth.safeUser(req.user), subscribed });
});

/* ============================================================
   CHAT
   ============================================================ */
app.get("/api/chat/history", requireAuth, async (req, res) => {
  const history = await store.getHistory(req.user.id);
  res.json({ history });
});

app.post("/api/chat", requireAuth, async (req, res) => {
  const message = String(req.body.message || "").trim();
  if (!message) return res.status(400).json({ error: "Say something first 🙂" });
  if (message.length > 2000) return res.status(400).json({ error: "That message is a bit too long." });

  const subscribed = await store.isSubscribed(req.user.id);
  let credits = req.user.credits;

  if (!subscribed) {
    const remaining = await store.spendCredit(req.user.id);
    if (remaining === null) {
      return res.status(402).json({
        error: "You're out of credits. Grab a pack or go unlimited to keep chatting.",
        outOfCredits: true,
      });
    }
    credits = remaining;
  }

  try {
    await store.addMessage(req.user.id, "user", message);
    const history = await store.getHistory(req.user.id);
    const reply = await ai.generateReply(history, message);
    await store.addMessage(req.user.id, "assistant", reply);
    res.json({ reply, credits, subscribed });
  } catch (err) {
    // Refund the credit if generation failed after we spent it.
    if (!subscribed) await store.adjustCredits(req.user.id, 1);
    console.error("chat:", err.message);
    res.status(500).json({ error: "Something went wrong sending that. Please try again." });
  }
});

app.post("/api/chat/reset", requireAuth, async (req, res) => {
  await store.clearHistory(req.user.id);
  res.json({ ok: true });
});

/* ============================================================
   PAYMENTS
   ============================================================ */
app.post("/api/checkout/credits", requireAuth, (req, res) =>
  payments.createCreditCheckout(store, req, res));
app.post("/api/checkout/subscription", requireAuth, (req, res) =>
  payments.createSubscriptionCheckout(store, req, res));

/* ============================================================
   ADMIN
   ============================================================ */
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  const [users, revenueCents, activeSubs] = await Promise.all([
    store.countUsers(),
    store.totalRevenueCents(),
    store.countActiveSubscriptions(),
  ]);
  res.json({
    users,
    revenueCents,
    revenue: (revenueCents / 100).toFixed(2),
    activeSubscriptions: activeSubs,
    billingMode: config.billingMode,
  });
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = parseInt(req.query.offset) || 0;
  const users = await store.listUsers({ limit, offset });
  // Enrich with subscription status.
  const enriched = await Promise.all(
    users.map(async (u) => ({
      id: u.id, email: u.email, displayName: u.displayName,
      credits: u.credits, isAdmin: u.isAdmin, createdAt: u.createdAt,
      subscribed: await store.isSubscribed(u.id),
      messages: await store.countMessages(u.id),
    }))
  );
  res.json({ users: enriched });
});

app.get("/api/admin/transactions", requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const transactions = await store.listTransactions({ limit });
  res.json({ transactions });
});

/* ============================================================
   HEALTH + PAGES
   ============================================================ */
app.get("/health", (req, res) => res.json({
  status: "ok",
  character: config.CHARACTER_NAME,
  store: store.kind,
  ai: config.aiEnabled ? "claude" : "fallback",
  billing: config.billingMode,
}));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

/* ============================================================
   START
   ============================================================ */
const server = app.listen(config.PORT, "0.0.0.0", async () => {
  try { await store.init(); } catch (e) { console.error("store init:", e.message); }
  console.log(`Companion app "${config.CHARACTER_NAME}" on port ${config.PORT}`);
  console.log(
    `store: ${store.kind} | ai: ${config.aiEnabled ? "claude" : "scripted fallback"} | ` +
    `billing: ${config.billingMode}`
  );
  if (config.billingMode === "sandbox") console.warn("⚠  STRIPE_SECRET_KEY not set — payments run in sandbox mode (no real charges).");
  if (!config.aiEnabled) console.warn("⚠  ANTHROPIC_API_KEY not set — using scripted companion replies.");
  if (store.kind === "memory") console.warn("⚠  DATABASE_URL not set — data is in-memory and resets on restart.");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(async () => { await store.close(); process.exit(0); });
  });
}
