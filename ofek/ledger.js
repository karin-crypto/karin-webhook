"use strict";

/**
 * OFEK FORECAST TRACK RECORD — append-only, hash-chained ledger (spec §9).
 *
 * Every entry (a forecast, a revision, or a realised outcome) is appended and
 * never changed. A revision is a NEW entry with version+1 pointing at its
 * parent; the original stays as published. Each entry carries
 * sha256(prevHash + canonical(entry)), so any edit to history breaks
 * verify().
 *
 * Backends:
 *   - Postgres (DATABASE_URL set): table ofek_ledger with a trigger that
 *     rejects UPDATE/DELETE. persistent = true.
 *   - Memory (fallback): persistent = false — callers must NOT tell anyone the
 *     forecast was saved.
 */

const crypto = require("crypto");

const GENESIS = "0".repeat(64);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashEntry(prevHash, body) {
  return crypto.createHash("sha256").update(prevHash + canonical(body)).digest("hex");
}

function deepFreeze(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

/* ---------- backends: append(buildBody) / all() ---------- */

function memoryBackend() {
  const entries = [];
  return {
    kind: "memory",
    persistent: false,
    async append(build) {
      const prev = entries.length ? entries[entries.length - 1].hash : GENESIS;
      const body = build(entries);
      const entry = deepFreeze(JSON.parse(JSON.stringify({ ...body, seq: entries.length + 1, prevHash: prev, hash: hashEntry(prev, body) })));
      entries.push(entry);
      return entry;
    },
    async all() {
      return entries.slice();
    },
    async close() {},
  };
}

function postgresBackend(databaseUrl) {
  const { Pool } = require("pg");
  const useSsl = /sslmode=require/.test(databaseUrl) || process.env.PGSSL === "true";
  const pool = new Pool({ connectionString: databaseUrl, ssl: useSsl ? { rejectUnauthorized: false } : undefined });

  const ready = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ofek_ledger (
        seq        BIGSERIAL PRIMARY KEY,
        id         TEXT NOT NULL UNIQUE,
        type       TEXT NOT NULL,
        body       JSONB NOT NULL,
        prev_hash  TEXT NOT NULL,
        hash       TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await pool.query(`
      CREATE OR REPLACE FUNCTION ofek_ledger_immutable() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'ofek_ledger is append-only'; END; $$ LANGUAGE plpgsql`);
    await pool.query(`DROP TRIGGER IF EXISTS ofek_ledger_no_change ON ofek_ledger`);
    await pool.query(`
      CREATE TRIGGER ofek_ledger_no_change BEFORE UPDATE OR DELETE ON ofek_ledger
      FOR EACH ROW EXECUTE FUNCTION ofek_ledger_immutable()`);
  })();
  ready.catch((err) => console.error("Ofek ledger init error:", err.message));

  const rowToEntry = (r) => ({ ...r.body, seq: Number(r.seq), prevHash: r.prev_hash, hash: r.hash });

  return {
    kind: "postgres",
    persistent: true,
    async append(build) {
      await ready;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Serialise writers so the hash chain stays linear.
        await client.query("SELECT pg_advisory_xact_lock(4224001)");
        const { rows } = await client.query("SELECT seq, body, prev_hash, hash FROM ofek_ledger ORDER BY seq");
        const entries = rows.map(rowToEntry);
        const prev = entries.length ? entries[entries.length - 1].hash : GENESIS;
        const body = build(entries);
        const hash = hashEntry(prev, body);
        const ins = await client.query(
          "INSERT INTO ofek_ledger (id, type, body, prev_hash, hash) VALUES ($1,$2,$3,$4,$5) RETURNING seq",
          [body.id, body.type, body, prev, hash]
        );
        await client.query("COMMIT");
        return deepFreeze({ ...body, seq: Number(ins.rows[0].seq), prevHash: prev, hash });
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    async all() {
      await ready;
      const { rows } = await pool.query("SELECT seq, body, prev_hash, hash FROM ofek_ledger ORDER BY seq");
      return rows.map(rowToEntry);
    },
    async close() {
      await pool.end();
    },
  };
}

/* ---------- ledger API ---------- */

class LedgerError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function createLedger({ backend } = {}) {
  const be =
    backend ||
    (process.env.DATABASE_URL ? postgresBackend(process.env.DATABASE_URL) : memoryBackend());
  const newId = () => `fc_${crypto.randomUUID()}`;

  return {
    kind: be.kind,
    persistent: be.persistent,

    /** Record a new forecast (a validated card). */
    async recordForecast(card) {
      return be.append(() => {
        const id = newId();
        return { id, type: "forecast", seriesId: id, version: 1, parentId: null, recordedAt: new Date().toISOString(), card };
      });
    },

    /** Record a revision. The original entry is untouched. */
    async reviseForecast(parentId, card, reason) {
      if (!reason || !String(reason).trim()) throw new LedgerError("נדרשת סיבת עדכון");
      return be.append((entries) => {
        const forecasts = entries.filter((e) => e.type === "forecast");
        const parent = forecasts.find((e) => e.id === parentId);
        if (!parent) throw new LedgerError("תחזית לא נמצאה", 404);
        const latest = Math.max(...forecasts.filter((e) => e.seriesId === parent.seriesId).map((e) => e.version));
        if (parent.version !== latest) throw new LedgerError(`ניתן לעדכן רק את הגרסה האחרונה (v${latest})`, 409);
        return {
          id: newId(), type: "forecast", seriesId: parent.seriesId, version: latest + 1,
          parentId, revisionReason: String(reason), recordedAt: new Date().toISOString(), card,
        };
      });
    },

    /** Record the realised result for one forecast version (once only). */
    async recordOutcome(forecastId, outcome) {
      const { realizedReturn, source, observedAt, errorAnalysis = null, improvementActions = [] } = outcome || {};
      if (typeof realizedReturn !== "number" || !Number.isFinite(realizedReturn)) {
        throw new LedgerError("realizedReturn: מספר עשרוני חובה");
      }
      if (!source || !observedAt) throw new LedgerError("source ו־observedAt חובה");
      return be.append((entries) => {
        const fc = entries.find((e) => e.type === "forecast" && e.id === forecastId);
        if (!fc) throw new LedgerError("תחזית לא נמצאה", 404);
        if (entries.some((e) => e.type === "outcome" && e.forecastId === forecastId)) {
          throw new LedgerError("כבר נרשמה תוצאה לתחזית זו", 409);
        }
        const pf = fc.card.pointForecast;
        const iv = fc.card.interval;
        return {
          id: `oc_${crypto.randomUUID()}`, type: "outcome", forecastId, recordedAt: new Date().toISOString(),
          realizedReturn, source, observedAt,
          forecastError: typeof pf === "number" ? Number((pf - realizedReturn).toFixed(6)) : null,
          insideInterval: iv ? realizedReturn >= iv.low && realizedReturn <= iv.high : null,
          errorAnalysis, improvementActions,
        };
      });
    },

    async list({ asset } = {}) {
      const entries = await be.all();
      const outcomes = new Map(entries.filter((e) => e.type === "outcome").map((e) => [e.forecastId, e]));
      return entries
        .filter((e) => e.type === "forecast" && (!asset || e.card.asset === asset))
        .map((f) => ({ ...f, outcome: outcomes.get(f.id) || null }));
    },

    async history(forecastId) {
      const all = await this.list();
      const f = all.find((e) => e.id === forecastId);
      if (!f) return null;
      return all.filter((e) => e.seriesId === f.seriesId).sort((a, b) => a.version - b.version);
    },

    /** Recompute the hash chain. Any edited/removed entry shows up here. */
    async verify() {
      const entries = await be.all();
      let prev = GENESIS;
      for (const e of entries) {
        const { seq, prevHash, hash, ...body } = e;
        if (prevHash !== prev || hashEntry(prev, body) !== hash) {
          return { ok: false, brokenAtSeq: seq, entries: entries.length };
        }
        prev = hash;
      }
      return { ok: true, entries: entries.length, head: prev };
    },

    close: () => be.close(),
  };
}

module.exports = { createLedger, memoryBackend, LedgerError, canonical, hashEntry, GENESIS };
