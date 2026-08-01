"use strict";

/**
 * Data layer for the companion app.
 *
 * Backends:
 *   - Postgres  (when DATABASE_URL is set) — persists across restarts.
 *   - In-memory (default)                  — zero config, lost on restart.
 *
 * Both backends expose the same async interface (see createMemoryStore for the
 * canonical shape). Entities: users, messages, transactions, subscriptions.
 */

const MAX_HISTORY = 40; // chat turns loaded into context per request

/* ============================================================
   IN-MEMORY STORE
   ============================================================ */
function createMemoryStore() {
  let seq = 1;
  const users = new Map();          // id -> user
  const emailIndex = new Map();     // email -> id
  const messages = [];              // { id, userId, role, content, createdAt }
  const transactions = [];          // { id, userId, type, amountCents, credits, stripeRef, status, createdAt }
  const subscriptions = new Map();  // userId -> subscription

  function publicUser(u) {
    if (!u) return null;
    const { passwordHash, ...rest } = u;
    return { ...rest };
  }

  return {
    kind: "memory",
    async init() {},
    async close() {},

    /* ---- users ---- */
    async createUser({ email, passwordHash, displayName, dob, credits = 0, isAdmin = false }) {
      const id = seq++;
      const user = {
        id, email, passwordHash, displayName, dob,
        credits, isAdmin, createdAt: new Date().toISOString(),
      };
      users.set(id, user);
      emailIndex.set(email, id);
      return publicUser(user);
    },
    async getUserByEmail(email) {
      const id = emailIndex.get(email);
      return id ? { ...users.get(id) } : null; // includes passwordHash for auth
    },
    async getUserById(id) {
      const u = users.get(Number(id));
      return u ? publicUser(u) : null;
    },
    async adjustCredits(userId, delta) {
      const u = users.get(Number(userId));
      if (!u) return null;
      u.credits = Math.max(0, u.credits + delta);
      return u.credits;
    },
    // Atomically spend one credit; returns new balance or null if insufficient.
    async spendCredit(userId) {
      const u = users.get(Number(userId));
      if (!u || u.credits < 1) return null;
      u.credits -= 1;
      return u.credits;
    },
    async setAdmin(userId, isAdmin) {
      const u = users.get(Number(userId));
      if (u) u.isAdmin = isAdmin;
    },
    async listUsers({ limit = 100, offset = 0 } = {}) {
      const all = [...users.values()].sort((a, b) => b.id - a.id);
      return all.slice(offset, offset + limit).map(publicUser);
    },
    async countUsers() {
      return users.size;
    },

    /* ---- messages ---- */
    async addMessage(userId, role, content) {
      messages.push({
        id: seq++, userId: Number(userId), role, content,
        createdAt: new Date().toISOString(),
      });
    },
    async getHistory(userId, limit = MAX_HISTORY) {
      const mine = messages.filter((m) => m.userId === Number(userId));
      return mine.slice(-limit).map(({ role, content }) => ({ role, content }));
    },
    async countMessages(userId) {
      return messages.filter((m) => m.userId === Number(userId)).length;
    },
    async clearHistory(userId) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].userId === Number(userId)) messages.splice(i, 1);
      }
    },

    /* ---- transactions ---- */
    async addTransaction(tx) {
      const row = {
        id: seq++, status: "complete", createdAt: new Date().toISOString(), ...tx,
      };
      transactions.push(row);
      return row;
    },
    async listTransactions({ limit = 100 } = {}) {
      return transactions.slice(-limit).reverse();
    },
    async totalRevenueCents() {
      return transactions
        .filter((t) => t.status === "complete")
        .reduce((s, t) => s + (t.amountCents || 0), 0);
    },

    /* ---- subscriptions ---- */
    async upsertSubscription(sub) {
      subscriptions.set(Number(sub.userId), { ...sub, userId: Number(sub.userId) });
    },
    async getSubscription(userId) {
      return subscriptions.get(Number(userId)) || null;
    },
    async isSubscribed(userId) {
      const s = subscriptions.get(Number(userId));
      if (!s || s.status !== "active") return false;
      if (!s.currentPeriodEnd) return true;
      return new Date(s.currentPeriodEnd).getTime() > Date.now();
    },
    async countActiveSubscriptions() {
      let n = 0;
      for (const s of subscriptions.values()) {
        if (s.status === "active" &&
            (!s.currentPeriodEnd || new Date(s.currentPeriodEnd).getTime() > Date.now())) n++;
      }
      return n;
    },
  };
}

/* ============================================================
   POSTGRES STORE
   ============================================================ */
function createPostgresStore(databaseUrl) {
  const { Pool } = require("pg");
  const useSsl = /sslmode=require/.test(databaseUrl) || process.env.PGSSL === "true";
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  const ready = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companion_users (
        id            BIGSERIAL PRIMARY KEY,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name  TEXT NOT NULL,
        dob           DATE NOT NULL,
        credits       INTEGER NOT NULL DEFAULT 0,
        is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companion_messages (
        id         BIGSERIAL PRIMARY KEY,
        user_id    BIGINT NOT NULL REFERENCES companion_users(id) ON DELETE CASCADE,
        role       TEXT NOT NULL,
        content    TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS companion_messages_user_idx
      ON companion_messages (user_id, id)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companion_transactions (
        id           BIGSERIAL PRIMARY KEY,
        user_id      BIGINT REFERENCES companion_users(id) ON DELETE SET NULL,
        type         TEXT NOT NULL,
        amount_cents INTEGER NOT NULL DEFAULT 0,
        credits      INTEGER NOT NULL DEFAULT 0,
        stripe_ref   TEXT,
        status       TEXT NOT NULL DEFAULT 'complete',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companion_subscriptions (
        user_id             BIGINT PRIMARY KEY REFERENCES companion_users(id) ON DELETE CASCADE,
        status              TEXT NOT NULL,
        stripe_customer_id  TEXT,
        stripe_subscription_id TEXT,
        current_period_end  TIMESTAMPTZ,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  })();
  ready.catch((err) => console.error("Postgres init error:", err.message));

  const mapUser = (r) => r && {
    id: Number(r.id), email: r.email, passwordHash: r.password_hash,
    displayName: r.display_name, dob: r.dob, credits: r.credits,
    isAdmin: r.is_admin, createdAt: r.created_at,
  };
  const publicUser = (u) => { if (!u) return null; const { passwordHash, ...rest } = u; return rest; };

  return {
    kind: "postgres",
    async init() { await ready; },
    async close() { await pool.end(); },

    /* ---- users ---- */
    async createUser({ email, passwordHash, displayName, dob, credits = 0, isAdmin = false }) {
      await ready;
      const { rows } = await pool.query(
        `INSERT INTO companion_users (email, password_hash, display_name, dob, credits, is_admin)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [email, passwordHash, displayName, dob, credits, isAdmin]
      );
      return publicUser(mapUser(rows[0]));
    },
    async getUserByEmail(email) {
      await ready;
      const { rows } = await pool.query(`SELECT * FROM companion_users WHERE email=$1`, [email]);
      return mapUser(rows[0]);
    },
    async getUserById(id) {
      await ready;
      const { rows } = await pool.query(`SELECT * FROM companion_users WHERE id=$1`, [id]);
      return publicUser(mapUser(rows[0]));
    },
    async adjustCredits(userId, delta) {
      await ready;
      const { rows } = await pool.query(
        `UPDATE companion_users SET credits = GREATEST(0, credits + $2) WHERE id=$1 RETURNING credits`,
        [userId, delta]
      );
      return rows[0] ? rows[0].credits : null;
    },
    async spendCredit(userId) {
      await ready;
      const { rows } = await pool.query(
        `UPDATE companion_users SET credits = credits - 1
         WHERE id=$1 AND credits >= 1 RETURNING credits`,
        [userId]
      );
      return rows[0] ? rows[0].credits : null;
    },
    async setAdmin(userId, isAdmin) {
      await ready;
      await pool.query(`UPDATE companion_users SET is_admin=$2 WHERE id=$1`, [userId, isAdmin]);
    },
    async listUsers({ limit = 100, offset = 0 } = {}) {
      await ready;
      const { rows } = await pool.query(
        `SELECT * FROM companion_users ORDER BY id DESC LIMIT $1 OFFSET $2`, [limit, offset]
      );
      return rows.map((r) => publicUser(mapUser(r)));
    },
    async countUsers() {
      await ready;
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM companion_users`);
      return rows[0].n;
    },

    /* ---- messages ---- */
    async addMessage(userId, role, content) {
      await ready;
      await pool.query(
        `INSERT INTO companion_messages (user_id, role, content) VALUES ($1,$2,$3)`,
        [userId, role, content]
      );
    },
    async getHistory(userId, limit = MAX_HISTORY) {
      await ready;
      const { rows } = await pool.query(
        `SELECT role, content FROM companion_messages
         WHERE user_id=$1 ORDER BY id DESC LIMIT $2`, [userId, limit]
      );
      return rows.reverse();
    },
    async countMessages(userId) {
      await ready;
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM companion_messages WHERE user_id=$1`, [userId]
      );
      return rows[0].n;
    },
    async clearHistory(userId) {
      await ready;
      await pool.query(`DELETE FROM companion_messages WHERE user_id=$1`, [userId]);
    },

    /* ---- transactions ---- */
    async addTransaction({ userId, type, amountCents = 0, credits = 0, stripeRef = null, status = "complete" }) {
      await ready;
      const { rows } = await pool.query(
        `INSERT INTO companion_transactions (user_id, type, amount_cents, credits, stripe_ref, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [userId, type, amountCents, credits, stripeRef, status]
      );
      return rows[0];
    },
    async listTransactions({ limit = 100 } = {}) {
      await ready;
      const { rows } = await pool.query(
        `SELECT t.*, u.email FROM companion_transactions t
         LEFT JOIN companion_users u ON u.id = t.user_id
         ORDER BY t.id DESC LIMIT $1`, [limit]
      );
      return rows.map((r) => ({
        id: Number(r.id), userId: r.user_id && Number(r.user_id), email: r.email,
        type: r.type, amountCents: r.amount_cents, credits: r.credits,
        stripeRef: r.stripe_ref, status: r.status, createdAt: r.created_at,
      }));
    },
    async totalRevenueCents() {
      await ready;
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(amount_cents),0)::bigint AS s
         FROM companion_transactions WHERE status='complete'`
      );
      return Number(rows[0].s);
    },

    /* ---- subscriptions ---- */
    async upsertSubscription({ userId, status, stripeCustomerId = null, stripeSubscriptionId = null, currentPeriodEnd = null }) {
      await ready;
      await pool.query(
        `INSERT INTO companion_subscriptions
           (user_id, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at)
         VALUES ($1,$2,$3,$4,$5, now())
         ON CONFLICT (user_id) DO UPDATE SET
           status=EXCLUDED.status,
           stripe_customer_id=COALESCE(EXCLUDED.stripe_customer_id, companion_subscriptions.stripe_customer_id),
           stripe_subscription_id=COALESCE(EXCLUDED.stripe_subscription_id, companion_subscriptions.stripe_subscription_id),
           current_period_end=EXCLUDED.current_period_end,
           updated_at=now()`,
        [userId, status, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd]
      );
    },
    async getSubscription(userId) {
      await ready;
      const { rows } = await pool.query(`SELECT * FROM companion_subscriptions WHERE user_id=$1`, [userId]);
      const r = rows[0];
      if (!r) return null;
      return {
        userId: Number(r.user_id), status: r.status,
        stripeCustomerId: r.stripe_customer_id, stripeSubscriptionId: r.stripe_subscription_id,
        currentPeriodEnd: r.current_period_end,
      };
    },
    async isSubscribed(userId) {
      await ready;
      const { rows } = await pool.query(
        `SELECT 1 FROM companion_subscriptions
         WHERE user_id=$1 AND status='active'
           AND (current_period_end IS NULL OR current_period_end > now())`, [userId]
      );
      return rows.length > 0;
    },
    async countActiveSubscriptions() {
      await ready;
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM companion_subscriptions
         WHERE status='active' AND (current_period_end IS NULL OR current_period_end > now())`
      );
      return rows[0].n;
    },
  };
}

function createStore() {
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      return createPostgresStore(url);
    } catch (err) {
      console.error("Postgres store init failed, falling back to memory:", err.message);
    }
  }
  return createMemoryStore();
}

module.exports = { createStore, MAX_HISTORY };
