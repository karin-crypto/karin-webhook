"use strict";

/**
 * OFEK PENSION INVESTMENT RESEARCH — like-for-like track comparison (spec §7).
 *
 * Input data must come from an official source (e.g. Gemel-Net / Pension-Net
 * exports) — do not feed the website's demo data (compare-app) into this.
 *
 * track: {
 *   name, company, product, track, riskLevel,          // identification
 *   monthlyReturns: [{ month: 'YYYY-MM', r: 0.012 }],  // decimal monthly returns
 *   returnsBasis: 'gross' | 'net',                     // before/after mgmt fees
 *   feeOnBalance,                                      // annual, decimal
 *   equityExposure?, fxExposure?,                      // %, latest reported
 *   policyChanges?: [{ date: 'YYYY-MM-DD', description }],
 *   source, asOf
 * }
 */

const MIN_MONTHS = 12;

function stats(rs) {
  const n = rs.length;
  const growth = rs.reduce((g, r) => g * (1 + r), 1);
  const m = rs.reduce((a, b) => a + b, 0) / n;
  const variance = rs.reduce((a, r) => a + (r - m) ** 2, 0) / (n - 1);
  let peak = 1;
  let v = 1;
  let mdd = 0;
  for (const r of rs) {
    v *= 1 + r;
    peak = Math.max(peak, v);
    mdd = Math.min(mdd, v / peak - 1);
  }
  const annReturn = growth ** (12 / n) - 1;
  const annVol = Math.sqrt(variance) * Math.sqrt(12);
  return {
    months: n,
    cumulativeReturn: growth - 1,
    annualizedReturn: annReturn,
    annualizedVolatility: annVol,
    maxDrawdown: mdd,
    returnToVolatility: annVol > 0 ? annReturn / annVol : null,
  };
}

function compareTracks(tracks, { from, to, allowMixedRisk = false } = {}) {
  const errors = [];
  if (!Array.isArray(tracks) || tracks.length < 2) return { ok: false, errors: ["נדרשים לפחות שני מסלולים"] };
  tracks.forEach((t, i) => {
    if (!t.name || !t.product || !t.track) errors.push(`tracks[${i}]: name, product, track חובה (זיהוי מוצר ומסלול מדויק)`);
    if (t.riskLevel == null) errors.push(`tracks[${i}]: riskLevel חובה`);
    if (!["gross", "net"].includes(t.returnsBasis)) errors.push(`tracks[${i}]: returnsBasis = gross | net`);
    if (!t.source || !t.asOf) errors.push(`tracks[${i}]: source ו־asOf חובה`);
    if (!Array.isArray(t.monthlyReturns) || !t.monthlyReturns.every((x) => /^\d{4}-\d{2}$/.test(x.month) && Number.isFinite(x.r))) {
      errors.push(`tracks[${i}]: monthlyReturns [{month:'YYYY-MM', r}]`);
    }
    if (t.returnsBasis === "gross" && !Number.isFinite(t.feeOnBalance)) errors.push(`tracks[${i}]: feeOnBalance חובה כשהתשואה ברוטו`);
  });
  if (errors.length) return { ok: false, errors };

  const risks = [...new Set(tracks.map((t) => String(t.riskLevel)))];
  if (risks.length > 1 && !allowMixedRisk) {
    return {
      ok: false,
      errors: [`המסלולים ברמות סיכון שונות (${risks.join(", ")}) — אין להשוות ביניהם כאילו היו זהים. העבירו allowMixedRisk=true להשוואה בתוך כל קבוצת סיכון בנפרד.`],
    };
  }

  const groups = risks.map((risk) => {
    const ts = tracks.filter((t) => String(t.riskLevel) === risk);
    // Common window: months present in every track of the group.
    let months = null;
    for (const t of ts) {
      const set = new Set(t.monthlyReturns.map((x) => x.month).filter((m) => (!from || m >= from) && (!to || m <= to)));
      months = months ? new Set([...months].filter((m) => set.has(m))) : set;
    }
    const window = [...months].sort();
    if (ts.length < 2) return { riskLevel: risk, skipped: "מסלול יחיד ברמת סיכון זו — אין מול מה להשוות" };
    if (window.length < MIN_MONTHS) {
      return { riskLevel: risk, skipped: `תקופה משותפת קצרה מדי (${window.length} חודשים, נדרש ${MIN_MONTHS})` };
    }
    const first = window[0];
    const last = window[window.length - 1];
    const rows = ts.map((t) => {
      const byMonth = new Map(t.monthlyReturns.map((x) => [x.month, x.r]));
      const rs = window.map((m) => byMonth.get(m));
      const netRs = t.returnsBasis === "gross" ? rs.map((r) => r - t.feeOnBalance / 12) : rs;
      const policyChangesInWindow = (t.policyChanges || []).filter((c) => c.date.slice(0, 7) >= first && c.date.slice(0, 7) <= last);
      return {
        name: t.name,
        company: t.company || null,
        product: t.product,
        track: t.track,
        returnsBasis: t.returnsBasis,
        reported: stats(rs),
        estimatedNetOfFees: t.returnsBasis === "gross" ? stats(netRs) : null,
        feeOnBalance: t.feeOnBalance ?? null,
        equityExposure: t.equityExposure ?? null,
        fxExposure: t.fxExposure ?? null,
        policyChangesInWindow,
        source: t.source,
        asOf: t.asOf,
      };
    });
    const missingMonths = ts.some((t) => t.monthlyReturns.length > window.length);
    return { riskLevel: risk, window: { from: first, to: last, months: window.length }, trimmedToCommonWindow: missingMonths, tracks: rows };
  });

  const notes = [
    "ההשוואה נעשתה על חלון חודשים זהה לכל המסלולים בקבוצת הסיכון.",
    "תשואת עבר אינה מעידה על תשואה עתידית.",
    "תשואה נטו מוערכת = תשואה מדווחת פחות דמי ניהול מצבירה חודשיים; אינה כוללת דמי ניהול מהפקדה ואינה התשואה נטו של לקוח מסוים.",
  ];
  if (groups.some((g) => g.tracks && g.tracks.some((t) => t.policyChangesInWindow.length))) {
    notes.push("בחלק מהמסלולים שונתה מדיניות ההשקעה בתוך התקופה — התשואה ההיסטורית משקפת חלקית מדיניות שאינה בתוקף.");
  }
  return { ok: true, groups, notes };
}

module.exports = { compareTracks, stats, MIN_MONTHS };
