"use strict";

/**
 * Market-factor data for ofek/track-model.js.
 *
 *   - USD/ILS representative rate: Bank of Israel public statistics API
 *     (official open data).
 *   - Index closes (TA-125, Tel-Gov, Tel-Bond 60, S&P 500): Globes public
 *     data web service. OPT-IN: used only when OFEK_INDEX_SOURCE=globes,
 *     because the terms of use for ongoing automated access were not
 *     confirmed. Without it, callers supply index moves themselves.
 *
 * Month-end closes never change, so they are cached in memory.
 */

const BOI_USD = "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0/RER_USD_ILS";
const GLOBES_YIELD = "https://www.globes.co.il/data/webservices/financial.asmx/GetYieldBetweenDatesBySymbol";

const INDEX_SYMBOLS = {
  ta125: { exchange: "tase", symbol: "137", label: 'ת"א 125' },
  gov: { exchange: "tase", symbol: "9999210", label: "תל גוב כללי" },
  corp: { exchange: "tase", symbol: "9999060", label: "תל בונד 60" },
  spx: { exchange: "nyse", symbol: "SPX", label: "S&P 500" },
};

const closeCache = new Map(); // `${factor}:${yyyymmdd}` -> { close, date }

class MarketDataError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const pad = (n) => String(n).padStart(2, "0");
const isPeriod = (p) => /^\d{6}$/.test(String(p)) && Number(String(p).slice(4)) >= 1 && Number(String(p).slice(4)) <= 12;
const prevPeriod = (p) => {
  const y = Number(String(p).slice(0, 4));
  const m = Number(String(p).slice(4));
  return m === 1 ? `${y - 1}12` : `${y}${pad(m - 1)}`;
};
const nextPeriod = (p) => {
  const y = Number(String(p).slice(0, 4));
  const m = Number(String(p).slice(4));
  return m === 12 ? `${y + 1}01` : `${y}${pad(m + 1)}`;
};
const monthEnd = (p) => {
  const y = Number(String(p).slice(0, 4));
  const m = Number(String(p).slice(4));
  return `${y}${pad(m)}${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
};
function periodsBetween(from, to) {
  if (!isPeriod(from) || !isPeriod(to) || String(from) > String(to)) throw new MarketDataError("from/to: בפורמט YYYYMM, from ≤ to");
  const out = [];
  for (let p = String(from); p <= String(to); p = nextPeriod(p)) out.push(p);
  if (out.length > 240) throw new MarketDataError("טווח של עד 240 חודשים");
  return out;
}

const indexSourceEnabled = (env = process.env) => String(env.OFEK_INDEX_SOURCE || "").toLowerCase() === "globes";

/** Daily USD/ILS representative rates from the Bank of Israel. from/to: YYYY-MM-DD. */
async function fetchUsdIls({ from, to, fetchImpl = fetch } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) throw new MarketDataError("from/to: YYYY-MM-DD");
  const res = await fetchImpl(`${BOI_USD}?startperiod=${from}&endperiod=${to}&format=csv`, { headers: { Accept: "text/csv" } });
  if (!res.ok) throw new MarketDataError(`בנק ישראל: ${res.status}`, 502);
  const lines = (await res.text()).trim().split(/\r?\n/);
  const head = lines.shift().split(",");
  const iDate = head.indexOf("TIME_PERIOD");
  const iVal = head.indexOf("OBS_VALUE");
  if (iDate < 0 || iVal < 0) throw new MarketDataError("בנק ישראל: מבנה קובץ לא צפוי", 502);
  return lines
    .map((l) => l.split(","))
    .map((c) => ({ date: c[iDate], rate: Number(c[iVal]) }))
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.rate) && r.rate > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Last observation on or before a YYYYMMDD date. */
function lastOnOrBefore(daily, yyyymmdd) {
  const iso = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6)}`;
  let hit = null;
  for (const r of daily) {
    if (r.date <= iso) hit = r;
    else break;
  }
  return hit;
}

/** Close of one index on (or just before) a date, from the Globes data service. */
async function fetchIndexClose({ factor, date, fetchImpl = fetch, today = new Date() } = {}) {
  const sym = Object.prototype.hasOwnProperty.call(INDEX_SYMBOLS, factor) ? INDEX_SYMBOLS[factor] : null;
  if (!sym) throw new MarketDataError(`מדד לא מוכר: ${factor}`);
  if (!/^\d{8}$/.test(date || "")) throw new MarketDataError("date: YYYYMMDD");
  const key = `${factor}:${date}`;
  if (closeCache.has(key)) return closeCache.get(key);
  const res = await fetchImpl(`${GLOBES_YIELD}?exchange=${sym.exchange}&symbol=${sym.symbol}&since=${date}&until=${date}`, { headers: { Accept: "text/xml" } });
  if (!res.ok) throw new MarketDataError(`מקור המדדים: ${res.status}`, 502);
  const xml = await res.text();
  const close = xml.match(/<until_close_price>([^<]+)</);
  const when = xml.match(/<until>([^<T]+)/);
  if (!close || !Number.isFinite(Number(close[1]))) throw new MarketDataError(`לא התקבל שער סגירה עבור ${sym.label} בתאריך ${date}`, 502);
  const out = { close: Number(close[1]), date: when ? when[1] : null };
  // only settled history is cached (a date at least 3 days old)
  if (new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}T00:00:00Z`).getTime() < today.getTime() - 3 * 864e5) closeCache.set(key, out);
  return out;
}

const BOI_CURVE = "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/ZCM/1.0";
const CURVE_SERIES = { y5: "ZC_TSB_ZND_05Y_MA", y10: "ZC_TSB_ZND_10Y_MA", real10: "ZC_TSB_ZRD_10Y_MA", inflation: "EXP_EXB_ZD_10Y_MA" };
let curveCache = null; // { at, value }

/**
 * Latest monthly government zero-coupon yields and 10-year inflation
 * expectations from the Bank of Israel (official open data). Cached 12h.
 */
async function fetchYieldCurve({ fetchImpl = fetch, today = new Date() } = {}) {
  if (curveCache && today.getTime() - curveCache.at < 12 * 3600e3) return curveCache.value;
  const end = today.toISOString().slice(0, 10);
  const start = new Date(today.getTime() - 200 * 864e5).toISOString().slice(0, 10);
  const res = await fetchImpl(`${BOI_CURVE}?startperiod=${start}&endperiod=${end}&format=csv`, { headers: { Accept: "text/csv" } });
  if (!res.ok) throw new MarketDataError(`בנק ישראל (עקום תשואות): ${res.status}`, 502);
  const lines = (await res.text()).trim().split(/\r?\n/);
  const head = lines.shift().split(",");
  const iCode = head.indexOf("SERIES_CODE");
  const iDate = head.indexOf("TIME_PERIOD");
  const iVal = head.indexOf("OBS_VALUE");
  if (iCode < 0 || iDate < 0 || iVal < 0) throw new MarketDataError("בנק ישראל: מבנה קובץ לא צפוי", 502);
  const latest = {};
  for (const l of lines) {
    const c = l.split(",");
    const key = Object.keys(CURVE_SERIES).find((k) => CURVE_SERIES[k] === c[iCode]);
    const v = Number(c[iVal]);
    if (!key || !Number.isFinite(v) || !/^\d{4}-\d{2}$/.test(c[iDate])) continue;
    if (!latest[key] || c[iDate] > latest[key].period) latest[key] = { period: c[iDate], value: v };
  }
  if (!latest.y5 || !latest.y10) throw new MarketDataError("בנק ישראל: לא התקבלו תשואות ל-5 ול-10 שנים", 502);
  const value = {
    asOf: latest.y10.period, y5: latest.y5.value, y10: latest.y10.value,
    real10: latest.real10 ? latest.real10.value : null, inflation: latest.inflation ? latest.inflation.value : null,
    source: "בנק ישראל — עקום תשואות חסר קופון ממשלתי וציפיות אינפלציה (ממוצע חודשי)", live: true,
  };
  curveCache = { at: today.getTime(), value };
  return value;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

const pct = (a, b) => (b / a - 1) * 100;

/**
 * Monthly factor moves (percent) for periods from..to, and optionally the
 * month-to-date moves up to `asOf` (YYYY-MM-DD) for the month after `to`
 * or any later date.
 */
async function fetchFactorHistory({ from, to, asOf = null, fetchImpl = fetch, env = process.env, today = new Date(), concurrency = 4 } = {}) {
  if (!indexSourceEnabled(env)) {
    throw new MarketDataError("מקור מדדים אוטומטי אינו מופעל (OFEK_INDEX_SOURCE=globes). אפשר להעביר את תנועות המדדים ידנית בשדה factors, או להפעיל את המקור לאחר בדיקת תנאי השימוש.", 409);
  }
  const periods = periodsBetween(from, to);
  const base = prevPeriod(periods[0]);
  const ends = [base, ...periods].map(monthEnd);
  let asOfKey = null;
  if (asOf) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new MarketDataError("asOf: YYYY-MM-DD");
    asOfKey = asOf.replace(/-/g, "");
    if (asOfKey <= ends[ends.length - 1]) throw new MarketDataError("asOf חייב להיות אחרי סוף החודש האחרון בטווח");
  }

  const iso = (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6)}`;
  const usdFrom = iso(`${base.slice(0, 6)}01`);
  const usdDaily = await fetchUsdIls({ from: usdFrom, to: asOf || iso(ends[ends.length - 1]), fetchImpl });

  const dates = asOfKey ? [...ends, asOfKey] : ends;
  const jobs = [];
  for (const factor of Object.keys(INDEX_SYMBOLS)) for (const date of dates) jobs.push({ factor, date });
  const closes = await mapLimit(jobs, concurrency, (j) => fetchIndexClose({ ...j, fetchImpl, today }));
  const table = {};
  jobs.forEach((j, i) => { (table[j.factor] = table[j.factor] || {})[j.date] = closes[i]; });

  const usdAt = (d) => {
    const hit = lastOnOrBefore(usdDaily, d);
    if (!hit) throw new MarketDataError(`אין שער דולר עד ${d}`, 502);
    return hit;
  };
  const moves = (a, b) => ({
    ta125: pct(table.ta125[a].close, table.ta125[b].close),
    spx: pct(table.spx[a].close, table.spx[b].close),
    usd: pct(usdAt(a).rate, usdAt(b).rate),
    gov: pct(table.gov[a].close, table.gov[b].close),
    corp: pct(table.corp[a].close, table.corp[b].close),
  });

  const rows = periods.map((p, i) => ({ period: p, factors: moves(ends[i], ends[i + 1]) }));
  let monthToDate = null;
  if (asOfKey) {
    const last = ends[ends.length - 1];
    monthToDate = {
      since: iso(last),
      asOf,
      factors: moves(last, asOfKey),
      lastObservation: {
        ta125: table.ta125[asOfKey].date, spx: table.spx[asOfKey].date, gov: table.gov[asOfKey].date, corp: table.corp[asOfKey].date, usd: usdAt(asOfKey).date,
      },
    };
  }
  return {
    rows,
    monthToDate,
    sources: ["בנק ישראל — שער יציג דולר/שקל (API סטטיסטי ציבורי)", "שערי סגירה של מדדים — שירות הנתונים הציבורי של גלובס"],
  };
}

module.exports = {
  INDEX_SYMBOLS, MarketDataError, indexSourceEnabled,
  fetchUsdIls, fetchIndexClose, fetchFactorHistory, fetchYieldCurve, periodsBetween, monthEnd, prevPeriod, nextPeriod, lastOnOrBefore,
  _clearCache: () => { closeCache.clear(); curveCache = null; },
};
