"use strict";

/**
 * Tools the Ofek agent can call. Each wraps an existing OFEK module, so the
 * numbers come from tested code, not from the model's own arithmetic.
 *
 * Side-effect rule: no tool records a forecast, changes an indicator or
 * publishes anything. The only write is `propose_forecast`, which files a
 * PROPOSAL in the ledger; it becomes a forecast only after Karin approves it
 * (POST /api/ofek/agent/proposals/:id/approve).
 */

const crypto = require("crypto");
const { evaluateSignals, INDICATORS } = require("./signals");
const { readSentiment } = require("./sentiment");
const { compareTracks } = require("./pension");
const { recordsToTracks, parseCsv } = require("./connectors/gemelnet");
const { simulateRetirement } = require("./retirement");
const { buildDcf, buildComps } = require("./valuation");
const { validateCard, HORIZONS } = require("./forecast-card");
const { pointMetrics, incrementalValueTest } = require("./metrics");
const { runQualityGate } = require("./quality-gate");
const { createIndicatorRegistry } = require("./indicators");

const obj = (properties, required = []) => ({ type: "object", properties, required });
const anyObj = { type: "object" };
const numArr = { type: "array", items: { type: "number" } };

const TOOL_DEFS = [
  {
    name: "evaluate_market_signals",
    description:
      "OFEK EARLY MARKET SIGNAL ENGINE. Classifies the market environment (stable / emerging change / elevated risk) from indicator values YOU HAVE VERIFIED with a source and date. " +
      `Indicator keys: ${Object.keys(INDICATORS).join(", ")}. Each value: { value, asOf: 'YYYY-MM-DD', source }. Never pass a value you did not find in a source.`,
    input_schema: obj({ indicators: anyObj }, ["indicators"]),
  },
  {
    name: "read_sentiment",
    description:
      "Module 9.6 sentiment reading (say / do / price). Point-in-time percentiles, family scores and dispersion, contradictions, descriptive confidence. " +
      "Each indicator: { name, family: 'say'|'do'|'price', source, market, orientation: 'higher_is_bullish'|'higher_is_bearish', maxAgeDays, history: [{date, value}] (24+ points), current: {date, value} }. " +
      "predictiveConfidence comes ONLY from a documented test (default 'not_tested').",
    input_schema: obj({ indicators: { type: "array", items: anyObj }, predictiveConfidence: { type: "string", enum: ["high", "medium", "low", "not_tested"] } }, ["indicators"]),
  },
  {
    name: "test_predictive_value",
    description:
      "Module 9.6.6 walk-forward test: does an indicator improve out-of-sample forecasts vs a historical-mean baseline? Returns approved / approved_limited / rejected, per-regime results, multiple-testing correction. " +
      "testsConducted = number of indicators/variants actually tested so far, including this one.",
    input_schema: obj({ returns: numArr, indicator: numArr, regimes: { type: "array", items: { type: "string" } }, lag: { type: "integer" }, minTrain: { type: "integer" }, testsConducted: { type: "integer" }, blockSize: { type: "integer" } }, ["returns", "indicator", "testsConducted"]),
  },
  {
    name: "import_pension_data",
    description: "Convert a Gemel-Net / Pension-Net export (CSV text or JSON records supplied by the user) into tracks for compare_pension_tracks. returnsBasis must be stated by the source (gross/net).",
    input_schema: obj({ csv: { type: "string" }, records: { type: "array", items: anyObj }, mapping: anyObj, unit: { type: "string", enum: ["percent", "decimal"] }, returnsBasis: { type: "string", enum: ["gross", "net"] }, sourceLabel: { type: "string" }, asOf: { type: "string" } }, ["returnsBasis", "sourceLabel"]),
  },
  {
    name: "compare_pension_tracks",
    description: "Like-for-like comparison of Israeli pension/provident tracks over an identical window, within the same risk level only. Tracks as returned by import_pension_data or supplied by the user.",
    input_schema: obj({ tracks: { type: "array", items: anyObj }, from: { type: "string" }, to: { type: "string" }, allowMixedRisk: { type: "boolean" } }, ["tracks"]),
  },
  {
    name: "simulate_retirement",
    description:
      "Retirement planning calculation in real terms: deterministic projection, fee cost, Monte Carlo percentiles, depletion probability by age, sequence-of-returns illustration. " +
      "Inputs: currentAge, retirementAge, endAge, balance, monthlyContribution, feeOnBalance, feeOnDeposit, monthlyWithdrawal, realReturn {mean, vol} (assumption — state its basis), inflation, simulations, seed.",
    input_schema: obj({ currentAge: { type: "number" }, retirementAge: { type: "number" }, endAge: { type: "number" }, balance: { type: "number" }, monthlyContribution: { type: "number" }, feeOnBalance: { type: "number" }, feeOnDeposit: { type: "number" }, monthlyWithdrawal: { type: "number" }, realReturn: anyObj, inflation: anyObj, simulations: { type: "integer" }, seed: { type: "integer" } }, ["currentAge", "retirementAge", "balance", "monthlyContribution", "realReturn"]),
  },
  {
    name: "build_dcf",
    description: "DCF valuation under stated assumptions, with sensitivity grid and scenarios. Requires assumptionSources for baseFcf, growth, discountRate, terminal. Output is value-under-assumptions, never a target price.",
    input_schema: obj({ entity: { type: "string" }, currency: { type: "string" }, unit: { type: "string" }, baseFcf: { type: "number" }, growth: numArr, discountRate: { type: "number" }, terminal: anyObj, netDebt: { type: "number" }, sharesOutstanding: { type: "number" }, midYear: { type: "boolean" }, assumptionSources: anyObj, scenarios: anyObj }, ["baseFcf", "growth", "discountRate", "terminal", "netDebt", "currency", "assumptionSources"]),
  },
  {
    name: "build_comps",
    description: "Comparable-multiples valuation: peer quartiles, outlier exclusion, implied value range. Each peer: { name, multiple, source, asOf }.",
    input_schema: obj({ entity: { type: "string" }, multipleName: { type: "string" }, basis: { type: "string", enum: ["enterprise", "equity"] }, subjectMetric: { type: "number" }, netDebt: { type: "number" }, sharesOutstanding: { type: "number" }, currency: { type: "string" }, peers: { type: "array", items: anyObj } }, ["multipleName", "basis", "subjectMetric", "currency", "peers"]),
  },
  {
    name: "get_track_record",
    description: "Read OFEK FORECAST TRACK RECORD: past forecasts (optionally for one asset), their realised outcomes, and live accuracy metrics (MAE, RMSE, bias, direction, interval coverage) vs a naive zero-return baseline. Use it to fill 'historical success metrics' on a forecast card.",
    input_schema: obj({ asset: { type: "string" } }),
  },
  {
    name: "list_indicators",
    description: "Module 9.6 indicator registry: each indicator's status (research / probation / active / suspended). Only ACTIVE indicators may carry predictive weight.",
    input_schema: obj({}),
  },
  {
    name: "validate_forecast_card",
    description: `Check a forecast card without recording it. Horizons: ${Object.keys(HORIZONS).join(", ")}. Returns errors/warnings and the normalised card (rounded, review date).`,
    input_schema: obj({ card: anyObj }, ["card"]),
  },
  {
    name: "propose_forecast",
    description: "File a forecast card as a PROPOSAL for Karin. It is NOT recorded as a forecast until she approves it. The card must pass validate_forecast_card. Include a short rationale.",
    input_schema: obj({ card: anyObj, rationale: { type: "string" } }, ["card", "rationale"]),
  },
  {
    name: "quality_gate_check",
    description: "OFEK QUALITY GATE (9.6.13) dry run on draft content meant for publication (post, market_review, client_report, video). Shows which checks would block. Approval is always missing in a dry run — that check is expected to fail.",
    input_schema: obj({ contentType: { type: "string", enum: ["post", "market_review", "client_report", "video"] }, text: { type: "string" }, sources: { type: "array", items: anyObj }, dataPoints: { type: "array", items: anyObj }, forecastIds: { type: "array", items: { type: "string" } } }, ["contentType", "text"]),
  },
];

/** Trim large tool results so they don't flood the context. */
function compact(result, max = 20000) {
  const s = JSON.stringify(result);
  return s.length <= max ? s : s.slice(0, max) + `… [קוצר: ${s.length} תווים]`;
}

function createToolExecutor({ ledger, now = () => new Date() }) {
  const registry = createIndicatorRegistry(ledger);

  const handlers = {
    evaluate_market_signals: (i) => evaluateSignals(i.indicators || {}, { now: now() }),
    read_sentiment: (i) => readSentiment({ indicators: i.indicators || [], predictiveConfidence: i.predictiveConfidence || "not_tested", now: now() }),
    test_predictive_value: (i) => incrementalValueTest(i.returns, i.indicator, { regimes: i.regimes, lag: i.lag, minTrain: i.minTrain, testsConducted: i.testsConducted, blockSize: i.blockSize }),
    import_pension_data: (i) => {
      const records = i.csv ? parseCsv(i.csv) : i.records;
      if (!Array.isArray(records) || !records.length) throw new Error("נדרש csv או records");
      return recordsToTracks(records, { mapping: i.mapping, unit: i.unit, returnsBasis: i.returnsBasis, source: i.sourceLabel, asOf: i.asOf });
    },
    compare_pension_tracks: (i) => compareTracks(i.tracks, { from: i.from, to: i.to, allowMixedRisk: i.allowMixedRisk }),
    simulate_retirement: (i) => simulateRetirement(i),
    build_dcf: (i) => buildDcf(i),
    build_comps: (i) => buildComps(i),
    get_track_record: async (i) => {
      const forecasts = await ledger.list({ asset: i.asset });
      const scored = forecasts.filter((f) => f.outcome && typeof f.card.pointForecast === "number");
      const pairs = scored.map((f) => ({
        forecast: f.card.pointForecast, actual: f.outcome.realizedReturn,
        low: f.card.interval && f.card.interval.low, high: f.card.interval && f.card.interval.high, coverage: f.card.interval && f.card.interval.coverage,
      }));
      return {
        forecasts: forecasts.length,
        withOutcome: scored.length,
        liveMetrics: pairs.length ? pointMetrics(pairs) : null,
        naiveZeroBaseline: pairs.length ? pointMetrics(pairs.map((p) => ({ forecast: 0, actual: p.actual }))) : null,
        recent: forecasts.slice(-10).map((f) => ({ id: f.id, asset: f.card.asset, horizon: f.card.horizon, pointForecast: f.card.pointForecast, issuedAt: f.card.issuedAt, outcome: f.outcome && f.outcome.realizedReturn })),
        note: scored.length ? null : "אין עדיין תחזיות עם תוצאה — 'אין עדיין היסטוריית ביצועים'",
      };
    },
    list_indicators: async () => (await registry.list()).map((r) => ({ indicatorId: r.indicatorId, name: r.card.name, family: r.card.family, market: r.card.market, status: r.status, approvedRegimes: r.approvedRegimes || null })),
    validate_forecast_card: (i) => validateCard(i.card, { now: now() }),
    propose_forecast: async (i) => {
      const v = validateCard(i.card, { now: now() });
      if (!v.ok) return { ok: false, errors: v.errors, note: "ההצעה לא נשמרה — תקנו את הכרטיס" };
      const entry = await ledger.appendEntry(() => ({
        id: `ap_${crypto.randomUUID()}`, type: "agent_proposal", kind: "forecast", recordedAt: now().toISOString(),
        cardInput: i.card, preview: v.card, rationale: String(i.rationale || ""),
      }));
      return { ok: true, proposalId: entry.id, status: "pending_approval", persistent: ledger.persistent, warnings: v.warnings, note: "הוגש לאישור קארין — עדיין אינו תחזית רשומה" };
    },
    quality_gate_check: (i) => runQualityGate({ ...i, manual: {}, approval: {} }, { now: now() }),
  };

  return {
    async execute(name, input) {
      const h = handlers[name];
      if (!h) return { content: `כלי לא מוכר: ${name}`, isError: true };
      try {
        const result = await h(input || {});
        return { content: compact(result), isError: false, result };
      } catch (err) {
        return { content: `שגיאה: ${err.message}`, isError: true };
      }
    },
  };
}

module.exports = { TOOL_DEFS, createToolExecutor };
