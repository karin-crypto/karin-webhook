"use strict";

/**
 * Module 9.6.1 / 9.6.6 / 9.6.11 — indicator registry, lifecycle and
 * experiment log, stored append-only in the OFEK ledger.
 *
 * Status lifecycle:
 *   research ──(approved experiment)──▶ probation ──(Karin)──▶ active
 *       ▲                                   │                    │
 *       └──────────(failed probation)───────┘                    ▼
 *       └─────────────(re-examination)──────────────────── suspended
 *
 * Registering, editing a card and promoting to active require an authorised
 * approver. Every change is a new ledger entry; nothing is overwritten.
 */

const crypto = require("crypto");
const { LedgerError } = require("./ledger");
const { FAMILIES } = require("./sentiment");

const STATUSES = {
  research: "מחקרי",
  probation: "בתקופת ניסיון",
  active: "פעיל",
  suspended: "מושעה",
};
const TRANSITIONS = {
  research: ["probation"],
  probation: ["active", "research"],
  active: ["suspended"],
  suspended: ["research"],
};
const CARD_FIELDS = [
  "name", "family", "market", "population", "source", "termsOfUse", "frequency",
  "measurementPeriod", "unit", "orientation", "maxAgeDays",
];
const PREREG_FIELDS = ["hypothesis", "asset", "market", "horizon", "successMetrics", "lag", "orientation", "regimeDefinition", "plannedVariants"];

function approvers() {
  return (process.env.OFEK_APPROVERS || process.env.OFEK_VIDEO_APPROVERS || "karin")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function requireApproval(approval, what) {
  const a = approval || {};
  if (!a.approvedBy || !approvers().includes(String(a.approvedBy).toLowerCase()) || !a.approvedAt || Number.isNaN(Date.parse(a.approvedAt))) {
    throw new LedgerError(`${what} מחייב אישור של: ${approvers().join(", ")} (approval: { approvedBy, approvedAt })`, 403);
  }
  return { approvedBy: a.approvedBy, approvedAt: a.approvedAt };
}

function validateCard(card) {
  const c = card || {};
  const missing = CARD_FIELDS.filter((f) => c[f] == null || c[f] === "");
  if (missing.length) throw new LedgerError(`כרטיס אינדיקטור — שדות חסרים: ${missing.join(", ")}`);
  if (!FAMILIES[c.family]) throw new LedgerError("family: say | do | price");
  if (!["higher_is_bullish", "higher_is_bearish"].includes(c.orientation)) throw new LedgerError("orientation: higher_is_bullish | higher_is_bearish");
  if (!Number.isFinite(c.maxAgeDays) || c.maxAgeDays <= 0) throw new LedgerError("maxAgeDays: מספר חיובי");
  return { methodologyChanges: [], alsoUsedBySignalEngine: false, ...c };
}

/** Fold the ledger into the current state of every indicator. */
function foldRegistry(entries) {
  const reg = new Map();
  for (const e of entries) {
    if (e.type === "indicator_registered") {
      reg.set(e.indicatorId, { indicatorId: e.indicatorId, card: e.card, status: "research", history: [{ at: e.recordedAt, status: "research", entryId: e.id, note: "נרשם" }] });
    } else if (e.type === "indicator_card_updated" && reg.has(e.indicatorId)) {
      const r = reg.get(e.indicatorId);
      r.card = e.card;
      r.history.push({ at: e.recordedAt, status: r.status, entryId: e.id, note: `עדכון כרטיס: ${e.reason}` });
    } else if (e.type === "indicator_status_changed" && reg.has(e.indicatorId)) {
      const r = reg.get(e.indicatorId);
      r.status = e.to;
      r.history.push({ at: e.recordedAt, status: e.to, entryId: e.id, note: e.reason, experimentId: e.experimentId || null, approvedRegimes: e.approvedRegimes || null });
      r.approvedRegimes = e.to === "research" || e.to === "suspended" ? null : e.approvedRegimes || r.approvedRegimes || null;
      r.realTimeRegimeRule = e.realTimeRegimeRule || r.realTimeRegimeRule || null;
    }
  }
  for (const r of reg.values()) r.statusLabel = STATUSES[r.status];
  return reg;
}

function createIndicatorRegistry(ledger) {
  const state = async () => foldRegistry(await ledger.entries());

  return {
    async list() {
      return [...(await state()).values()];
    },

    async get(indicatorId) {
      return (await state()).get(indicatorId) || null;
    },

    /** 9.6.1 — add an indicator (starts as research). Requires Karin. */
    async register(card, approval) {
      const c = validateCard(card);
      const ap = requireApproval(approval, "הוספת אינדיקטור");
      return ledger.appendEntry((entries) => {
        const reg = foldRegistry(entries);
        if ([...reg.values()].some((r) => r.card.name === c.name && r.card.market === c.market)) {
          throw new LedgerError(`אינדיקטור "${c.name}" (${c.market}) כבר רשום`, 409);
        }
        return { id: `ir_${crypto.randomUUID()}`, type: "indicator_registered", indicatorId: `ind_${crypto.randomUUID()}`, recordedAt: new Date().toISOString(), card: c, approval: ap };
      });
    },

    /** 9.6.1 — change an indicator's definition. Requires Karin and a reason. */
    async updateCard(indicatorId, card, reason, approval) {
      const c = validateCard(card);
      const ap = requireApproval(approval, "שינוי אינדיקטור");
      if (!reason || !String(reason).trim()) throw new LedgerError("נדרשת סיבת שינוי");
      return ledger.appendEntry((entries) => {
        if (!foldRegistry(entries).has(indicatorId)) throw new LedgerError("אינדיקטור לא נמצא", 404);
        return { id: `iu_${crypto.randomUUID()}`, type: "indicator_card_updated", indicatorId, recordedAt: new Date().toISOString(), card: c, reason: String(reason), approval: ap };
      });
    },

    /**
     * 9.6.6 / 9.6.11 — log an experiment: the pre-registration, how many
     * tests were actually run, and the result (from /evaluate/sentiment).
     */
    async recordExperiment(indicatorId, { preRegistration, testsConducted, result } = {}) {
      const pr = preRegistration || {};
      const missing = PREREG_FIELDS.filter((f) => pr[f] == null || pr[f] === "");
      if (missing.length) throw new LedgerError(`רישום מוקדם — שדות חסרים: ${missing.join(", ")}`);
      if (!Number.isInteger(testsConducted) || testsConducted < 1) throw new LedgerError("testsConducted: מספר הבדיקות שבוצעו בפועל");
      if (!result || !["approved", "approved_limited", "rejected"].includes(result.status)) {
        throw new LedgerError("result: תוצאת בדיקת ערך חיזויי (status: approved | approved_limited | rejected)");
      }
      if (result.significance && result.significance.testsConducted !== testsConducted) {
        throw new LedgerError(`testsConducted (${testsConducted}) אינו תואם למספר שבו חושבה המובהקות (${result.significance.testsConducted})`);
      }
      return ledger.appendEntry((entries) => {
        if (!foldRegistry(entries).has(indicatorId)) throw new LedgerError("אינדיקטור לא נמצא", 404);
        return {
          id: `ex_${crypto.randomUUID()}`, type: "experiment", indicatorId, recordedAt: new Date().toISOString(),
          preRegistration: pr, testsConducted,
          decision: result.status, approvedRegimes: result.approvedRegimes || [], failingRegimes: result.failingRegimes || [],
          byRegime: result.byRegime || null, significance: result.significance || null, verdict: result.verdict || null,
        };
      });
    },

    async experiments(indicatorId) {
      return (await ledger.entries()).filter((e) => e.type === "experiment" && (!indicatorId || e.indicatorId === indicatorId));
    },

    /**
     * Move an indicator through its lifecycle.
     *   → probation: needs an approved / approved_limited experiment for it;
     *     a limited approval also needs a real-time regime rule (9.6.6).
     *   → active:    needs Karin's approval and a live-probation summary.
     *   → research / suspended: needs a reason.
     */
    async transition(indicatorId, { to, reason, experimentId, probationSummary, realTimeRegimeRule, approval } = {}) {
      if (!STATUSES[to]) throw new LedgerError(`to: ${Object.keys(STATUSES).join(" | ")}`);
      if (!reason || !String(reason).trim()) throw new LedgerError("נדרשת סיבה לשינוי סטטוס");
      const ap = to === "active" ? requireApproval(approval, "העברה לסטטוס פעיל") : null;
      if (to === "active" && !(probationSummary && String(probationSummary).trim())) {
        throw new LedgerError("העברה לפעיל מחייבת סיכום תקופת הניסיון בזמן אמת (probationSummary)");
      }
      return ledger.appendEntry((entries) => {
        const r = foldRegistry(entries).get(indicatorId);
        if (!r) throw new LedgerError("אינדיקטור לא נמצא", 404);
        if (!TRANSITIONS[r.status].includes(to)) {
          throw new LedgerError(`מעבר לא מותר: ${STATUSES[r.status]} → ${STATUSES[to]}. מותר: ${TRANSITIONS[r.status].map((s) => STATUSES[s]).join(", ")}`, 409);
        }
        let approvedRegimes = null;
        if (to === "probation") {
          const ex = entries.find((e) => e.type === "experiment" && e.id === experimentId && e.indicatorId === indicatorId);
          if (!ex) throw new LedgerError("מעבר לתקופת ניסיון מחייב ניסוי מתועד של אינדיקטור זה (experimentId)");
          if (ex.decision === "rejected") throw new LedgerError("הניסוי נדחה — האינדיקטור נשאר מחקרי", 409);
          if (ex.decision === "approved_limited") {
            if (!(realTimeRegimeRule && String(realTimeRegimeRule).trim())) {
              throw new LedgerError("אישור למשטרים מסוימים מחייב כלל לזיהוי המשטר בזמן אמת (realTimeRegimeRule)");
            }
            approvedRegimes = ex.approvedRegimes;
          }
        }
        return {
          id: `is_${crypto.randomUUID()}`, type: "indicator_status_changed", indicatorId, recordedAt: new Date().toISOString(),
          from: r.status, to, reason: String(reason),
          experimentId: experimentId || null, approvedRegimes,
          realTimeRegimeRule: realTimeRegimeRule || null,
          probationSummary: probationSummary || null, approval: ap,
        };
      });
    },
  };
}

module.exports = { createIndicatorRegistry, foldRegistry, requireApproval, STATUSES, TRANSITIONS, CARD_FIELDS, PREREG_FIELDS };
