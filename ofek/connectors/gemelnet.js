"use strict";

/**
 * Israeli pension-product data importer (Gemel-Net / Pension-Net / Bituach-Net).
 *
 * Three input paths, one output: tracks in the shape ofek/pension.js expects.
 *   - records: rows already parsed (JSON)
 *   - csv:     a CSV export
 *   - ckan:    the data.gov.il CKAN datastore API (resource id from env/config)
 *
 * The default column mapping was verified on 25.11.2026 against the live
 * data.gov.il datasets of the Capital Market Authority (Gemel-Net,
 * Pension-Net, Bituach-Net); every field name can still be overridden via
 * `mapping`. Nothing is fetched or filled in that the source did not provide.
 *
 * Note: the source reports STOCK_MARKET_EXPOSURE and
 * FOREIGN_CURRENCY_EXPOSURE as amounts (₪ millions), not percentages. They
 * are converted here to a percentage of TOTAL_ASSETS.
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

// data.gov.il resource ids, "2024 to date" files (checked 25.11.2026).
const RESOURCES = {
  gemel: "a30dcbea-a1d2-482c-ae29-8f781f5025fb",
  pension: "6d47d6b5-cb08-488b-b333-f1e717b1e1bd",
  insurance: "c6c62cc7-fe02-4b18-8f3e-813abfbb4647",
};

// Older files of the same datasets (monthly history before 2024).
const HISTORY_RESOURCES = {
  gemel: ["91c849ed-ddc4-472b-bd09-0f5486cea35c", "2016d770-f094-4a2e-983e-797c26479720"],
  pension: ["a66926f3-e396-4984-a4db-75486751c2f7", "4694d5a7-5284-4f3d-a2cb-5887f43fb55e"],
  insurance: ["584e6b69-174f-46c9-b8db-03925b4c68c6", "672090ba-7893-4496-a07c-dc7e822cbf18"],
};

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
 * options: { mapping, unit: 'percent' | 'decimal', exposureUnit: 'amount' | 'percent', returnsBasis, source, asOf, riskLevelOf(row) }
 */
function recordsToTracks(records, { mapping = {}, unit = "percent", exposureUnit = "amount", returnsBasis, source, asOf, riskLevelOf } = {}) {
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
    // Exposures arrive as amounts in the same unit as total assets.
    const assets = toNum(row[map.totalAssets]);
    const pctOfAssets = (v) => (v === null || !assets ? null : Number(((100 * v) / assets).toFixed(1)));
    const eq = exposureUnit === "percent" ? toNum(row[map.equityExposure]) : pctOfAssets(toNum(row[map.equityExposure]));
    const fx = exposureUnit === "percent" ? toNum(row[map.fxExposure]) : pctOfAssets(toNum(row[map.fxExposure]));
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
      totalAssets: assets,
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

/**
 * Full monthly return history of one track (by FUND_ID) across the current
 * and the older files of a dataset. Returns rows sorted by period, one per
 * month: { period: 'YYYYMM', ret (percent), totalAssets, fundName }.
 */
async function fetchFundHistory({ dataset, fundId, includeOlder = true, fetchImpl = fetch } = {}) {
  if (!RESOURCES[dataset]) throw new Error(`dataset: ${Object.keys(RESOURCES).join(" | ")}`);
  const id = Number(fundId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("fundId: מספר הקופה/המסלול ברשות שוק ההון");
  const resources = [...(includeOlder ? HISTORY_RESOURCES[dataset] : []), RESOURCES[dataset]];
  const byPeriod = new Map();
  for (const resourceId of resources) {
    const { records } = await fetchCkan({ resourceId, filters: { FUND_ID: id }, maxRows: 1000, pageSize: 1000, fetchImpl });
    for (const r of records) {
      const period = String(r.REPORT_PERIOD || "").replace(/\D/g, "").slice(0, 6);
      const ret = typeof r.MONTHLY_YIELD === "number" ? r.MONTHLY_YIELD : r.MONTHLY_YIELD == null || r.MONTHLY_YIELD === "" ? NaN : Number(r.MONTHLY_YIELD);
      if (period.length !== 6 || !Number.isFinite(ret)) continue;
      byPeriod.set(period, { period, ret, totalAssets: typeof r.TOTAL_ASSETS === "number" ? r.TOTAL_ASSETS : null, fundName: String(r.FUND_NAME || "").replace(/\s+/g, " ").trim(), company: r.MANAGING_CORPORATION || null });
    }
  }
  const rows = [...byPeriod.values()].sort((a, b) => (a.period < b.period ? -1 : 1));
  return { fundId: id, dataset, fundName: rows.length ? rows[rows.length - 1].fundName : null, company: rows.length ? rows[rows.length - 1].company : null, rows };
}

module.exports = { recordsToTracks, parseCsv, fetchCkan, fetchFundHistory, DEFAULT_MAPPING, RESOURCES, HISTORY_RESOURCES, toMonth };
