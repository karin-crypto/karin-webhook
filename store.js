"use strict";

/**
 * Conversation store for Mia.
 *
 * Backends:
 *   - Postgres  (when DATABASE_URL is set) — persists across restarts/instances.
 *   - In-memory (default fallback)         — zero config, lost on restart.
 *
 * Interface (all async):
 *   getHistory(sessionId) -> [{ role, content }]   (chronological, last MAX_TURNS)
 *   append(sessionId, messages)                     (messages: [{ role, content }])
 *   cleanup(maxAgeMs?) -> removedCount              (prune sessions idle beyond maxAgeMs)
 *   close()
 *   .kind                                           ("postgres" | "memory")
 */

const MAX_TURNS = 20; // messages (user + assistant) kept per session

// Conversations idle longer than this are pruned by cleanup(). Keeps storage
// bounded so abandoned sessions don't accumulate forever.
const RETENTION_MS =
  (parseInt(process.env.MIA_RETENTION_DAYS, 10) || 30) * 24 * 60 * 60 * 1000;

function createMemoryStore() {
  const map = new Map(); // sessionId -> [{ role, content }]
  const seen = new Map(); // sessionId -> last-activity timestamp (ms)
  return {
    kind: "memory",
    async getHistory(sessionId) {
      const h = map.get(sessionId);
      return h ? h.slice() : [];
    },
    async append(sessionId, messages) {
      const next = (map.get(sessionId) || []).concat(messages);
      if (next.length > MAX_TURNS) next.splice(0, next.length - MAX_TURNS);
      map.set(sessionId, next);
      seen.set(sessionId, Date.now());
    },
    async cleanup(maxAgeMs = RETENTION_MS) {
      const cutoff = Date.now() - maxAgeMs;
      let removed = 0;
      for (const [id, ts] of seen) {
        if (ts < cutoff) {
          map.delete(id);
          seen.delete(id);
          removed++;
        }
      }
      return removed;
    },
    async close() {},
  };
}

function createPostgresStore(databaseUrl) {
  const { Pool } = require("pg");

  const useSsl =
    /sslmode=require/.test(databaseUrl) || process.env.PGSSL === "true";
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  const ready = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mia_messages (
        id         BIGSERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        role       TEXT NOT NULL,
        content    TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS mia_messages_session_idx
      ON mia_messages (session_id, id)
    `);
  })();
  // Avoid an unhandled rejection at startup if the DB is unreachable; the same
  // error re-surfaces (and is caught by callers) when getHistory/append await it.
  ready.catch((err) => console.error("Postgres init error:", err.message));

  return {
    kind: "postgres",
    async getHistory(sessionId) {
      await ready;
      const { rows } = await pool.query(
        `SELECT role, content FROM mia_messages
         WHERE session_id = $1
         ORDER BY id DESC
         LIMIT $2`,
        [sessionId, MAX_TURNS]
      );
      return rows.reverse(); // chronological
    },
    async append(sessionId, messages) {
      await ready;
      for (const m of messages) {
        await pool.query(
          `INSERT INTO mia_messages (session_id, role, content) VALUES ($1, $2, $3)`,
          [sessionId, m.role, m.content]
        );
      }
      // Keep only the most recent MAX_TURNS rows for this session; getHistory
      // never reads beyond that, so older rows are dead weight.
      await pool.query(
        `DELETE FROM mia_messages
         WHERE session_id = $1
           AND id NOT IN (
             SELECT id FROM mia_messages
             WHERE session_id = $1
             ORDER BY id DESC
             LIMIT $2
           )`,
        [sessionId, MAX_TURNS]
      );
    },
    async cleanup(maxAgeMs = RETENTION_MS) {
      await ready;
      const cutoffSeconds = Math.floor(maxAgeMs / 1000);
      const { rowCount } = await pool.query(
        `DELETE FROM mia_messages
         WHERE created_at < now() - ($1 * interval '1 second')`,
        [cutoffSeconds]
      );
      return rowCount;
    },
    async close() {
      await pool.end();
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

module.exports = { createStore, MAX_TURNS };
