"use strict";

/**
 * Central configuration for the companion app.
 *
 * Everything reads from environment variables with sensible dev defaults so
 * the app boots and is fully usable with zero configuration (in-memory data,
 * simulated payments, scripted AI replies). Set the real keys in production.
 */

const crypto = require("crypto");

const config = {
  PORT: process.env.PORT || 4000,

  // Session signing. A stable secret keeps sessions valid across restarts.
  // In dev we generate an ephemeral one (sessions reset on restart).
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex"),
  SESSION_TTL_DAYS: parseInt(process.env.SESSION_TTL_DAYS) || 30,

  // The companion character. Rename/re-persona for your own deployment.
  CHARACTER_NAME: process.env.CHARACTER_NAME || "Aria",

  // AI model. Falls back to scripted replies when ANTHROPIC_API_KEY is unset.
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  AI_MODEL: process.env.AI_MODEL || "claude-opus-4-8",

  // Credits: 1 credit = 1 message to the companion. Active subscribers chat
  // without spending credits.
  SIGNUP_BONUS_CREDITS: parseInt(process.env.SIGNUP_BONUS_CREDITS) || 20,

  // Credit packs shown in the store. amountCents is what Stripe charges.
  CREDIT_PACKS: [
    { id: "starter",  credits: 50,   amountCents: 499,  label: "Starter" },
    { id: "popular",  credits: 200,  amountCents: 1499, label: "Popular", highlight: true },
    { id: "premium",  credits: 500,  amountCents: 2999, label: "Premium" },
    { id: "ultimate", credits: 1500, amountCents: 6999, label: "Ultimate" },
  ],

  // Monthly subscription — unlimited messages.
  SUBSCRIPTION: {
    id: "monthly",
    amountCents: 1999,
    label: "Unlimited Monthly",
    // Optional pre-created Stripe Price ID. If unset, a price is created inline.
    stripePriceId: process.env.STRIPE_SUBSCRIPTION_PRICE_ID || "",
  },

  // Stripe. When STRIPE_SECRET_KEY is unset the app runs in "sandbox" billing
  // mode: purchases are fulfilled instantly for testing (no real charges).
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "",

  // Public base URL used to build Stripe success/cancel redirect links.
  PUBLIC_URL: process.env.PUBLIC_URL || "",

  // First user to register with this email is granted admin rights. You can
  // also promote an existing user by setting this and having them re-login is
  // not needed — admin is checked live from the DB flag.
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || "").toLowerCase().trim(),

  // Minimum age to use the service.
  MIN_AGE: 18,
};

config.billingMode = config.STRIPE_SECRET_KEY ? "stripe" : "sandbox";
config.aiEnabled = Boolean(config.ANTHROPIC_API_KEY);

module.exports = config;
