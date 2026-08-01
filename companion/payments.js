"use strict";

/**
 * Payments: credit-pack purchases and the monthly subscription.
 *
 * Two modes:
 *   - "stripe"  (STRIPE_SECRET_KEY set): real Stripe Checkout Sessions +
 *     webhook fulfillment.
 *   - "sandbox" (no key): purchases are fulfilled instantly for testing, no
 *     real charge. Lets the whole app be exercised end-to-end with zero setup.
 *
 * Fulfillment (crediting the account / activating the sub) is centralized in
 * fulfillCredits / fulfillSubscription so both modes share one code path.
 */

const config = require("./config");

const stripe = config.STRIPE_SECRET_KEY
  ? require("stripe")(config.STRIPE_SECRET_KEY)
  : null;

function baseUrl(req) {
  if (config.PUBLIC_URL) return config.PUBLIC_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${proto}://${req.headers.host}`;
}

function findPack(packId) {
  return config.CREDIT_PACKS.find((p) => p.id === packId) || null;
}

/* ---- shared fulfillment ---- */
async function fulfillCredits(store, userId, pack, stripeRef) {
  await store.adjustCredits(userId, pack.credits);
  await store.addTransaction({
    userId, type: "credits", amountCents: pack.amountCents,
    credits: pack.credits, stripeRef: stripeRef || null, status: "complete",
  });
}

async function fulfillSubscription(store, userId, { stripeRef, customerId, subscriptionId, periodEnd } = {}) {
  await store.upsertSubscription({
    userId, status: "active",
    stripeCustomerId: customerId || null,
    stripeSubscriptionId: subscriptionId || null,
    currentPeriodEnd: periodEnd || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  });
  await store.addTransaction({
    userId, type: "subscription", amountCents: config.SUBSCRIPTION.amountCents,
    credits: 0, stripeRef: stripeRef || null, status: "complete",
  });
}

/* ---- checkout: credit pack ---- */
async function createCreditCheckout(store, req, res) {
  const pack = findPack(req.body.packId);
  if (!pack) return res.status(400).json({ error: "Unknown credit pack." });
  const user = req.user;

  if (!stripe) {
    // Sandbox: fulfill immediately.
    await fulfillCredits(store, user.id, pack, `sandbox_${Date.now()}`);
    const balance = (await store.getUserById(user.id)).credits;
    return res.json({ mode: "sandbox", ok: true, credits: balance });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: pack.amountCents,
        product_data: { name: `${pack.credits} credits — ${pack.label}` },
      },
    }],
    metadata: { kind: "credits", userId: String(user.id), packId: pack.id },
    success_url: `${baseUrl(req)}/app.html?checkout=success`,
    cancel_url: `${baseUrl(req)}/app.html?checkout=cancel`,
  });
  res.json({ mode: "stripe", url: session.url });
}

/* ---- checkout: subscription ---- */
async function createSubscriptionCheckout(store, req, res) {
  const user = req.user;

  if (!stripe) {
    await fulfillSubscription(store, user.id, { stripeRef: `sandbox_${Date.now()}` });
    return res.json({ mode: "sandbox", ok: true });
  }

  const line = config.SUBSCRIPTION.stripePriceId
    ? { price: config.SUBSCRIPTION.stripePriceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: config.SUBSCRIPTION.amountCents,
          recurring: { interval: "month" },
          product_data: { name: config.SUBSCRIPTION.label },
        },
      };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [line],
    metadata: { kind: "subscription", userId: String(user.id) },
    subscription_data: { metadata: { userId: String(user.id) } },
    success_url: `${baseUrl(req)}/app.html?checkout=success`,
    cancel_url: `${baseUrl(req)}/app.html?checkout=cancel`,
  });
  res.json({ mode: "stripe", url: session.url });
}

/* ---- Stripe webhook ---- */
// Mounted with express.raw() so req.body is the raw Buffer for signature check.
async function handleWebhook(store, req, res) {
  if (!stripe) return res.status(200).json({ received: true, mode: "sandbox" });

  let event;
  try {
    if (config.STRIPE_WEBHOOK_SECRET) {
      const sig = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(req.body, sig, config.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body.toString("utf8"));
    }
  } catch (err) {
    console.error("Stripe webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const meta = s.metadata || {};
      const userId = Number(meta.userId);
      if (userId && meta.kind === "credits") {
        const pack = findPack(meta.packId);
        if (pack) await fulfillCredits(store, userId, pack, s.id);
      } else if (userId && meta.kind === "subscription") {
        await fulfillSubscription(store, userId, {
          stripeRef: s.id, customerId: s.customer, subscriptionId: s.subscription,
        });
      }
    } else if (event.type === "invoice.paid") {
      // Recurring renewal — extend the period.
      const inv = event.data.object;
      const userId = Number(inv.subscription_details?.metadata?.userId || inv.lines?.data?.[0]?.metadata?.userId);
      const periodEnd = inv.lines?.data?.[0]?.period?.end;
      if (userId) {
        await fulfillSubscription(store, userId, {
          stripeRef: inv.id, customerId: inv.customer, subscriptionId: inv.subscription,
          periodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
        });
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const userId = Number(sub.metadata?.userId);
      if (userId) await store.upsertSubscription({ userId, status: "canceled", currentPeriodEnd: null });
    }
  } catch (err) {
    console.error("Stripe webhook handling error:", err.message);
    return res.status(500).send("handler error");
  }

  res.json({ received: true });
}

module.exports = {
  createCreditCheckout, createSubscriptionCheckout, handleWebhook,
  billingMode: config.billingMode,
};
