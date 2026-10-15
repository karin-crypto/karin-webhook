"use strict";

/**
 * Israeli pension-product data importer (Gemel-Net / Pension-Net / Bituach-Net).
 *
 * Three input paths, one output: tracks in the shape ofek/pension.js expects.
 *   - records: rows already parsed (JSON)
 *   - csv:     a CSV export
 *   - ckan:    the data.gov.il CKAN datastore API (resource id from env/config)
 *
 * The default column mapping follows the public data.gov.il Gemel-Net
 * datasets as best known, but it has NOT been verified against a live export
 * from this environment — every field name can be overridden via `mapping`.
 * Nothing is fetched or filled in that the source did not provide.
 */

const DEFAULT_MAPPING = {
  fundId: "FUND_ID",
  fundName: "FUND_NAME",
  company: "MANAGING_CORPORATION",
  classification: "FUND_CLASSIFICATION", // product type
  track: "SPECIALIZATION",
  subTrack: "SUB_SPECIALIZATION",
  period: "REPORT_PERIOD",               // YYYYMM or YYYY-MM
  monthlyReturn: "MONTHLY_YIELD",
  feeOnBalance: "AVG_ANNUAL_MANAGEMENT_FEE",
  feeOnDeposit: "AVG_DEPOSIT_FEE",
  equityExposure: "STOCK_MARKET_EXPOSURE",
  fxExposure: "FOREIGN_CURRENCY_EXPOSURE",
  totalAssets: "TOTAL_ASSETS",
};

const DATA_GOV_IL = "https://data.gov.il/api/3/action/datastore_search";

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let q = false;
  const s = String(text).replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x !== "")) rows.push(row);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] === undefined ? "" : r[i].trim()])));
}

function toMonth(v) {
  const s = String(v == null ? "" : v).trim();
  let m = s.match(/^(\d{4})(\d{2})$/) || s.match(/^(\d{4})-(\d{2})/) || s.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [y, mo] = m[1].length === 4 ? [m[1], m[2]] : [m[2], m[1]];
  return Number(mo) >= 1 && Number(mo) <= 12 ? `${y}-${mo}` : null;
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * records -> { tracks, skipped, warnings }
 * options: { mapping, unit: 'percent' | 'decimal', returnsBasis, source, asOf, riskLevelOf(row) }
 */
function recordsToTracks(records, { mapping = {}, unit = "percent", returnsBasis, source, asOf, riskLevelOf } = {}) {
  const map = { ...DEFAULT_MAPPING, ...mapping };
  const scale = unit === "percent" ? 0.01 : 1;
  if (!["gross", "net"].includes(returnsBasis)) {
    throw new Error("returnsBasis חובה (gross | net) — בדקו בהגדרות המקור אם התשואה לפני או אחרי דמי ניהול");
  }
  if (!source) throw new Error("source חובה (למשל: 'גמל־נט, ייצוא מתאריך ...')");

  const byFund = new Map();
  const skipped = [];
  const missingCols = Object.entries(map)
    .filter(([k, col]) => ["fundId", "period", "monthlyReturn"].includes(k) && records.length && !(col in records[0]))
    .map(([k, col]) => `${k} → "${col}"`);
  if (missingCols.length) {
    throw new Error(`עמודות חובה לא נמצאו בנתונים: ${missingCols.join(", ")}. עדכנו את mapping לפי שמות העמודות בפועל: ${records.length ? Object.keys(records[0]).join(", ") : ""}`);
  }

  records.forEach((r, i) => {
    const id = r[map.fundId];
    const month = toMonth(r[map.period]);
    const ret = toNum(r[map.monthlyReturn]);
    if (id == null || id === "" || !month || ret === null) {
      skipped.push({ row: i + 1, reason: "חסר מזהה, תקופה או תשואה" });
      return;
    }
    if (!byFund.has(String(id))) byFund.set(String(id), { rows: [], latest: null });
    const f = byFund.get(String(id));
    f.rows.push({ month, r: Number((ret * scale).toFixed(8)) });
    if (!f.latest || month > f.latest.month) f.latest = { month, row: r };
  });

  const warnings = [];
  const tracks = [...byFund.entries()].map(([id, f]) => {
    const row = f.latest.row;
    const months = new Map();
    for (const x of f.rows) {
      if (months.has(x.month) && months.get(x.month) !== x.r) warnings.push(`קופה ${id}: ערכים סותרים לחודש ${x.month} — נשמר הראשון`);
      if (!months.has(x.month)) months.set(x.month, x.r);
    }
    const fee = toNum(row[map.feeOnBalance]);
    const dep = toNum(row[map.feeOnDeposit]);
    const eq = toNum(row[map.equityExposure]);
    const fx = toNum(row[map.fxExposure]);
    const risk = riskLevelOf ? riskLevelOf(row) : row[map.track] || row[map.classification] || null;
    return {
      fundId: id,
      name: row[map.fundName] || `קופה ${id}`,
      company: row[map.company] || null,
      product: row[map.classification] || null,
      track: [row[map.track], row[map.subTrack]].filter(Boolean).join(" / ") || null,
      riskLevel: risk,
      monthlyReturns: [...months.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([month, r]) => ({ month, r })),
      returnsBasis,
      // Fees and exposures are reported in percent in the source.
      feeOnBalance: fee === null ? null : Number((fee * 0.01).toFixed(6)),
      feeOnDeposit: dep === null ? null : Number((dep * 0.01).toFixed(6)),
      equityExposure: eq,
      fxExposure: fx,
      latestPeriod: f.latest.month,
      source,
      asOf: asOf || f.latest.month,
    };
  });
  if (tracks.some((t) => !t.product || !t.track)) {
    warnings.push("לחלק מהקופות חסרים סוג מוצר או מסלול — יש להשלים לפני השוואה (pension/compare דורש product ו־track)");
  }
  return { tracks, skipped, warnings };
}

/** Fetch rows from data.gov.il (CKAN datastore_search), with paging. */
async function fetchCkan({ resourceId, filters = {}, q, maxRows = 50000, pageSize = 5000, fetchImpl = fetch } = {}) {
  if (!resourceId) throw new Error("resourceId חובה (מזהה המשאב ב־data.gov.il; ניתן גם דרך GEMELNET_RESOURCE_ID)");
  const out = [];
  let offset = 0;
  let total = Infinity;
  while (offset < Math.min(total, maxRows)) {
    const params = new URLSearchParams({ resource_id: resourceId, limit: String(pageSize), offset: String(offset) });
    if (Object.keys(filters).length) params.set("filters", JSON.stringify(filters));
    if (q) params.set("q", q);
    const res = await fetchImpl(`${DATA_GOV_IL}?${params}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`data.gov.il ${res.status}`);
    const body = await res.json();
    if (!body.success) throw new Error(`data.gov.il: ${JSON.stringify(body.error || {})}`);
    const recs = body.result.records || [];
    total = body.result.total ?? recs.length;
    out.push(...recs);
    if (!recs.length) break;
    offset += recs.length;
  }
  return { records: out, total, truncated: total > maxRows };
}

module.exports = { recordsToTracks, parseCsv, fetchCkan, DEFAULT_MAPPING, toMonth };
