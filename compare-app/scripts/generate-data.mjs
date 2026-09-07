// Generates realistic, deterministic demo data -> src/data/funds.json
// Re-run with: npm run data:generate
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let seed = 20260901;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const between = (a, b) => a + (b - a) * rnd();
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

const COMPANIES = [
  { id: 'altshuler', name: 'אלטשולר שחם', color: '#B45309', quality: 0.55 },
  { id: 'meitav', name: 'מיטב', color: '#D97706', quality: 0.60 },
  { id: 'phoenix', name: 'הפניקס', color: '#EA580C', quality: 0.78 },
  { id: 'harel', name: 'הראל', color: '#16A34A', quality: 0.66 },
  { id: 'migdal', name: 'מגדל', color: '#DC2626', quality: 0.58 },
  { id: 'clal', name: 'כלל', color: '#0891B2', quality: 0.72 },
  { id: 'menora', name: 'מנורה מבטחים', color: '#1E40AF', quality: 0.75 },
  { id: 'more', name: 'מור', color: '#7C3AED', quality: 0.80 },
  { id: 'analyst', name: 'אנליסט', color: '#6D28D9', quality: 0.82 },
  { id: 'yelin', name: 'ילין לפידות', color: '#0F766E', quality: 0.70 },
];

const PRODUCTS = [
  { id: 'gemel', name: 'קופת גמל', short: 'גמל', feeAcc: [0.35, 0.85], feeDep: [0, 0] },
  { id: 'hishtalmut', name: 'קרן השתלמות', short: 'השתלמות', feeAcc: [0.4, 0.85], feeDep: [0, 0] },
  { id: 'pension', name: 'קרן פנסיה', short: 'פנסיה', feeAcc: [0.15, 0.5], feeDep: [0.8, 3.5] },
  { id: 'policy', name: 'פוליסת חיסכון', short: 'פוליסת חיסכון', feeAcc: [0.8, 1.25], feeDep: [0, 0] },
];

// track: expected annual return (mean), annual volatility, risk 1-5
const TRACKS = [
  { id: 'general', name: 'כללי', mean: 0.085, vol: 0.09, risk: 3, alloc: { stocks: 42, bonds: 40, cash: 8, alt: 10 } },
  { id: 'equity', name: 'מניות', mean: 0.125, vol: 0.17, risk: 5, alloc: { stocks: 92, bonds: 2, cash: 4, alt: 2 } },
  { id: 'bonds', name: 'אג"ח', mean: 0.045, vol: 0.045, risk: 2, alloc: { stocks: 8, bonds: 82, cash: 8, alt: 2 } },
  { id: 'sp500', name: 'מחקה S&P 500', mean: 0.135, vol: 0.18, risk: 5, alloc: { stocks: 98, bonds: 0, cash: 2, alt: 0 } },
];
const PENSION_TRACKS = [
  { id: 'age-under-50', name: 'תלוי גיל – עד 50', mean: 0.095, vol: 0.11, risk: 4, alloc: { stocks: 55, bonds: 30, cash: 5, alt: 10 } },
  { id: 'age-50-60', name: 'תלוי גיל – 50 עד 60', mean: 0.08, vol: 0.085, risk: 3, alloc: { stocks: 40, bonds: 45, cash: 6, alt: 9 } },
  { id: 'age-over-60', name: 'תלוי גיל – 60 ומעלה', mean: 0.06, vol: 0.06, risk: 2, alloc: { stocks: 25, bonds: 60, cash: 8, alt: 7 } },
  { id: 'equity', name: 'מניות', mean: 0.125, vol: 0.17, risk: 5, alloc: { stocks: 92, bonds: 2, cash: 4, alt: 2 } },
];

// 60 monthly points ending 2026-08. A shared "market" factor makes funds move together realistically.
const MONTHS = 60;
const END = { y: 2026, m: 8 };
const monthLabel = i => { let m = END.m - (MONTHS - 1 - i), y = END.y; while (m <= 0) { m += 12; y -= 1; } return `${y}-${String(m).padStart(2, '0')}`; };
const market = Array.from({ length: MONTHS }, () => between(-1, 1)); // shared shocks in [-1,1]
// a couple of visible market episodes
for (let i = 14; i < 18; i++) market[i] -= 0.9;     // drawdown
for (let i = 30; i < 36; i++) market[i] += 0.5;     // rally
for (let i = 46; i < 50; i++) market[i] -= 0.6;     // correction
for (let i = 52; i < 60; i++) market[i] += 0.45;    // recovery

function history(track, companyQuality) {
  const mMean = track.mean / 12, mVol = track.vol / Math.sqrt(12);
  const skill = (companyQuality - 0.65) * 0.0025; // small persistent alpha/beta effect
  let idx = 100; const out = [];
  for (let i = 0; i < MONTHS; i++) {
    const shock = market[i] * mVol * 0.9 + between(-1, 1) * mVol * 0.45;
    const r = mMean + skill + shock;
    idx = idx * (1 + r);
    out.push({ date: monthLabel(i), value: round(idx, 2) });
  }
  return out;
}
const annualized = (h, months) => { const a = h[h.length - 1 - months].value, b = h[h.length - 1].value; return round((Math.pow(b / a, 12 / months) - 1) * 100, 2); };
const simple = (h, months) => { const a = h[h.length - 1 - months].value, b = h[h.length - 1].value; return round((b / a - 1) * 100, 2); };

const funds = [];
for (const c of COMPANIES) for (const p of PRODUCTS) {
  const tracks = p.id === 'pension' ? PENSION_TRACKS : TRACKS;
  for (const t of tracks) {
    if (p.id === 'policy' && t.id === 'sp500' && rnd() < 0.5) continue;      // not every company offers every track
    if (p.id === 'gemel' && t.id === 'bonds' && rnd() < 0.3) continue;
    const h = history(t, c.quality);
    const feeAcc = round(between(...p.feeAcc) - (c.quality - 0.65) * 0.15, 2);
    const feeDep = p.feeDep[1] ? round(between(...p.feeDep), 2) : 0;
    const assets = Math.round(between(180, 9800) * (1 + c.quality)); // ₪ millions
    funds.push({
      id: `${c.id}-${p.id}-${t.id}`,
      company: c.name, companyId: c.id, companyColor: c.color,
      name: `${c.name} ${p.short} ${t.name}`,
      product: p.id, productName: p.name,
      track: t.name, trackId: t.id,
      risk: t.risk,
      returns: { m1: simple(h, 1), y1: simple(h, 12), y3: annualized(h, 36), y5: annualized(h, 59) },
      fees: { accumulation: Math.max(0.1, feeAcc), deposit: feeDep },
      assets,
      allocation: t.alloc,
      history: h,
      sharpe: round(Math.max(0.2, (t.mean - 0.04) / t.vol + (c.quality - 0.65) * 0.6 + between(-0.08, 0.08)), 2),
      updated: monthLabel(MONTHS - 1),
    });
  }
}

const out = {
  meta: { generated: new Date().toISOString().slice(0, 10), asOf: monthLabel(MONTHS - 1), source: 'נתוני דמו ריאליסטיים (לא נתוני אמת). להחלפה בחיבור API של גמל-נט / רשות שוק ההון.', demo: true, count: funds.length },
  companies: COMPANIES.map(({ id, name, color }) => ({ id, name, color })),
  products: PRODUCTS.map(({ id, name, short }) => ({ id, name, short })),
  funds,
};
mkdirSync(resolve(__dirname, '../src/data'), { recursive: true });
writeFileSync(resolve(__dirname, '../src/data/funds.json'), JSON.stringify(out));
console.log(`generated ${funds.length} funds -> src/data/funds.json (as of ${out.meta.asOf})`);
