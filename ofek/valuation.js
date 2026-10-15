"use strict";

/**
 * Model builder — DCF and comparable-multiples valuation.
 *
 * Every output is "value under the stated assumptions", never a target price
 * or a recommendation. Assumptions must be supplied with their source; the
 * code checks internal consistency (g < r, terminal-value dominance, peer
 * count) and always returns a sensitivity grid so the dependence on
 * assumptions is visible.
 */

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const round = (x, d = 0) => (isNum(x) ? Number(x.toFixed(d)) : x);
const NOTICE = "שווי לפי הנחות בלבד — אינו מחיר יעד, אינו המלצה ואינו ייעוץ השקעות. התוצאה רגישה מאוד להנחות; ראו טבלת רגישות.";

function quantile(sorted, p) {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/* ---------------- DCF ---------------- */

function dcfCore(p) {
  const n = p.growth.length;
  let fcf = p.baseFcf;
  let pvSum = 0;
  const years = [];
  for (let t = 1; t <= n; t++) {
    fcf *= 1 + p.growth[t - 1];
    const tt = p.midYear ? t - 0.5 : t;
    const pv = fcf / (1 + p.discountRate) ** tt;
    pvSum += pv;
    years.push({ year: t, growth: p.growth[t - 1], fcf, pv });
  }
  let tv;
  if (p.terminal.method === "gordon") tv = (fcf * (1 + p.terminal.growth)) / (p.discountRate - p.terminal.growth);
  else tv = fcf * p.terminal.multiple;
  const pvTv = tv / (1 + p.discountRate) ** (p.midYear ? n - 0.5 : n);
  const ev = pvSum + pvTv;
  const equity = ev - p.netDebt;
  return { years, pvExplicit: pvSum, terminalValue: tv, pvTerminal: pvTv, enterpriseValue: ev, equityValue: equity, perShare: p.sharesOutstanding ? equity / p.sharesOutstanding : null, terminalShare: pvTv / ev };
}

function validateDcf(p) {
  const e = [];
  if (!isNum(p.baseFcf)) e.push("baseFcf: תזרים מזומנים חופשי בשנת הבסיס (מספר)");
  if (!Array.isArray(p.growth) || !p.growth.length || !p.growth.every(isNum)) e.push("growth: מערך שיעורי צמיחה שנתיים לתקופה המפורשת (למשל [0.08, 0.07, 0.06, 0.05, 0.04])");
  else if (p.growth.length > 15) e.push("growth: עד 15 שנים מפורשות");
  if (!isNum(p.discountRate) || p.discountRate <= 0 || p.discountRate > 0.4) e.push("discountRate: שיעור היוון שנתי עשרוני (0 < r ≤ 0.4)");
  const t = p.terminal || {};
  if (t.method === "gordon") {
    if (!isNum(t.growth)) e.push("terminal.growth חובה בשיטת gordon");
    else if (isNum(p.discountRate) && t.growth >= p.discountRate) e.push("terminal.growth חייב להיות קטן משיעור ההיוון (g < r)");
    else if (t.growth > 0.04) e.push("terminal.growth מעל 4% — צמיחה נצחית שאינה עקבית עם צמיחת כלכלה ארוכת טווח; הורידו או נמקו בשיטת exit_multiple");
  } else if (t.method === "exit_multiple") {
    if (!isNum(t.multiple) || t.multiple <= 0) e.push("terminal.multiple: מכפיל יציאה חיובי (EV/FCF)");
  } else e.push("terminal.method: gordon | exit_multiple");
  if (!isNum(p.netDebt)) e.push("netDebt: חוב נטו (שלילי = מזומן נטו)");
  if (p.sharesOutstanding != null && (!isNum(p.sharesOutstanding) || p.sharesOutstanding <= 0)) e.push("sharesOutstanding: מספר חיובי");
  if (!p.currency) e.push("currency חובה (למשל ILS, USD) ויחידה (units, thousands, millions) ב־unit");
  if (!p.assumptionSources || typeof p.assumptionSources !== "object" || !["baseFcf", "growth", "discountRate", "terminal"].every((k) => p.assumptionSources[k])) {
    e.push("assumptionSources: מקור או נימוק לכל הנחה — baseFcf, growth, discountRate, terminal");
  }
  return e;
}

/**
 * input: { entity, currency, unit, baseFcf, growth[], discountRate, terminal: {method, growth|multiple},
 *          netDebt, sharesOutstanding?, midYear?, assumptionSources: {...}, scenarios?: {bull:{...}, bear:{...}} }
 */
function buildDcf(input = {}) {
  const p = { midYear: false, ...input };
  const errors = validateDcf(p);
  if (errors.length) return { ok: false, errors };

  const base = dcfCore(p);
  const warnings = [];
  if (base.terminalShare > 0.75) warnings.push(`${Math.round(base.terminalShare * 100)}% מהשווי נובע מהערך הטרמינלי — התוצאה נשענת בעיקר על הנחת הטווח הארוך`);
  if (p.baseFcf <= 0) warnings.push("תזרים בסיס שלילי או אפס — מודל DCF פשוט אינו מתאים; שקלו מודל מבוסס תרחישי רווחיות");
  if (p.growth.some((g) => g > 0.3)) warnings.push("צמיחה מעל 30% בשנה מסוימת — נדרש נימוק חזק");

  // Sensitivity: discount rate × terminal assumption.
  const dr = [-0.02, -0.01, 0, 0.01, 0.02].map((d) => round(p.discountRate + d, 4)).filter((r) => r > 0);
  const tvAxis = p.terminal.method === "gordon"
    ? [-0.01, -0.005, 0, 0.005, 0.01].map((d) => round(p.terminal.growth + d, 4))
    : [0.8, 0.9, 1, 1.1, 1.2].map((f) => round(p.terminal.multiple * f, 2));
  const grid = dr.map((r) => ({
    discountRate: r,
    values: tvAxis.map((x) => {
      if (p.terminal.method === "gordon" && x >= r) return null; // undefined when g ≥ r
      const t = p.terminal.method === "gordon" ? { method: "gordon", growth: x } : { method: "exit_multiple", multiple: x };
      const v = dcfCore({ ...p, discountRate: r, terminal: t });
      return round(p.sharesOutstanding ? v.perShare : v.equityValue, 2);
    }),
  }));

  // Scenarios override any base input.
  const scenarios = {};
  for (const [name, over] of Object.entries(p.scenarios || {})) {
    const sp = { ...p, ...over, terminal: { ...p.terminal, ...(over.terminal || {}) } };
    const err = validateDcf({ ...sp, assumptionSources: p.assumptionSources });
    if (err.length) { scenarios[name] = { ok: false, errors: err }; continue; }
    const v = dcfCore(sp);
    scenarios[name] = { ok: true, equityValue: round(v.equityValue), perShare: round(v.perShare, 2), terminalShare: round(v.terminalShare, 3) };
  }

  return {
    ok: true,
    model: "DCF",
    entity: p.entity || null,
    currency: p.currency,
    unit: p.unit || "units",
    assumptions: {
      baseFcf: p.baseFcf, growth: p.growth, discountRate: p.discountRate, terminal: p.terminal,
      netDebt: p.netDebt, sharesOutstanding: p.sharesOutstanding ?? null, midYear: p.midYear, sources: p.assumptionSources,
    },
    projection: base.years.map((y) => ({ year: y.year, growth: y.growth, fcf: round(y.fcf), pv: round(y.pv) })),
    result: {
      pvExplicit: round(base.pvExplicit), terminalValue: round(base.terminalValue), pvTerminal: round(base.pvTerminal),
      enterpriseValue: round(base.enterpriseValue), equityValue: round(base.equityValue),
      perShare: round(base.perShare, 2), terminalShare: round(base.terminalShare, 3),
    },
    sensitivity: {
      rows: "שיעור היוון",
      columns: p.terminal.method === "gordon" ? "צמיחה טרמינלית" : "מכפיל יציאה",
      columnValues: tvAxis,
      cell: p.sharesOutstanding ? "שווי למניה" : "שווי הון",
      grid,
    },
    scenarios,
    warnings,
    notice: NOTICE,
  };
}

/* ---------------- Comparable multiples ---------------- */

/**
 * input: { entity, currency, unit, multipleName ('EV/EBITDA', 'P/E', …), basis: 'enterprise' | 'equity',
 *          subjectMetric, netDebt?, sharesOutstanding?, peers: [{ name, multiple, source, asOf }] }
 */
function buildComps(input = {}) {
  const e = [];
  const p = input;
  if (!p.multipleName) e.push("multipleName חובה (למשל EV/EBITDA)");
  if (!["enterprise", "equity"].includes(p.basis)) e.push("basis: enterprise (מכפילי EV) | equity (מכפילי מחיר)");
  if (!isNum(p.subjectMetric) || p.subjectMetric <= 0) e.push("subjectMetric: ערך המדד של החברה הנבדקת (חיובי)");
  if (p.basis === "enterprise" && !isNum(p.netDebt)) e.push("netDebt חובה כשהמכפיל ברמת EV");
  if (!p.currency) e.push("currency חובה");
  if (!Array.isArray(p.peers) || !p.peers.length) e.push("peers: רשימת חברות השוואה");
  else p.peers.forEach((x, i) => {
    if (!x.name || !isNum(x.multiple) || !x.source || !x.asOf) e.push(`peers[${i}]: name, multiple, source, asOf חובה`);
  });
  if (e.length) return { ok: false, errors: e };

  const warnings = [];
  const valid = p.peers.filter((x) => x.multiple > 0);
  const excluded = p.peers.filter((x) => x.multiple <= 0).map((x) => ({ name: x.name, reason: "מכפיל שלילי או אפס" }));
  const sorted0 = valid.map((x) => x.multiple).sort((a, b) => a - b);
  let used = valid;
  if (sorted0.length >= 4) {
    const q1 = quantile(sorted0, 0.25);
    const q3 = quantile(sorted0, 0.75);
    const iqr = q3 - q1;
    used = valid.filter((x) => {
      const out = x.multiple < q1 - 3 * iqr || x.multiple > q3 + 3 * iqr;
      if (out) excluded.push({ name: x.name, reason: "חריג קיצוני (מעבר ל־3×IQR)" });
      return !out;
    });
  }
  if (used.length < 4) warnings.push(`רק ${used.length} חברות השוואה תקינות — הטווח אינו אמין; מומלץ לפחות 4–5`);
  if (!used.length) return { ok: false, errors: ["אין חברות השוואה תקינות"] };

  const m = used.map((x) => x.multiple).sort((a, b) => a - b);
  const stats = { n: m.length, min: m[0], q1: quantile(m, 0.25), median: quantile(m, 0.5), q3: quantile(m, 0.75), max: m[m.length - 1] };
  const implied = (mult) => {
    const v = mult * p.subjectMetric;
    const equity = p.basis === "enterprise" ? v - p.netDebt : v;
    return { multiple: round(mult, 2), equityValue: round(equity), perShare: p.sharesOutstanding ? round(equity / p.sharesOutstanding, 2) : null };
  };
  const dates = [...new Set(used.map((x) => x.asOf))];
  if (dates.length > 1) warnings.push(`מכפילי חברות ההשוואה מתאריכים שונים (${dates.join(", ")}) — יש לוודא עקביות`);

  return {
    ok: true,
    model: "Comparable multiples",
    entity: p.entity || null,
    multipleName: p.multipleName,
    basis: p.basis,
    currency: p.currency,
    unit: p.unit || "units",
    peerStats: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, round(v, 2)])),
    impliedRange: { low: implied(stats.q1), median: implied(stats.median), high: implied(stats.q3) },
    peersUsed: used.map((x) => ({ name: x.name, multiple: x.multiple, source: x.source, asOf: x.asOf })),
    excluded,
    warnings,
    notice: NOTICE + " טווח מכפילים משקף תמחור שוק של חברות אחרות, לא שווי פנימי.",
  };
}

module.exports = { buildDcf, buildComps, dcfCore };
