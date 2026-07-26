#!/usr/bin/env node
/*
 * capture-mygemel-card.mjs — grab a pension-fund "מידע כללי" card from mygemel.net.
 *
 * Usage:
 *   node capture-mygemel-card.mjs "<mygemel.net fund URL>" <output.png>
 *
 * Uses the pre-installed Chromium (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers) at a mobile
 * viewport, so the capture matches how the cards look on a phone. This is the PREFERRED path in
 * Step 2 of SKILL.md, but it is optional: if Playwright/Chromium is unavailable or mygemel.net is
 * blocked by the network policy, it exits non-zero with a clear message — fall back to Karin's own
 * screenshots or a branded reproduction (assets/comparison-template.html). Never stall on this.
 */

const [, , url, out] = process.argv;

if (!url || !out) {
  console.error('Usage: node capture-mygemel-card.mjs "<mygemel.net fund URL>" <output.png>');
  process.exit(2);
}
if (!/^https?:\/\/([\w.-]*\.)?mygemel\.net\//i.test(url)) {
  console.error(`Refusing: "${url}" is not a mygemel.net URL.`);
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'Playwright is not installed. Install it (npm i -D playwright) or fall back to a screenshot ' +
      'Karin pasted / a reproduction from assets/comparison-template.html.',
  );
  process.exit(3);
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 }, // iPhone-class portrait, matching the reference cards
    deviceScaleFactor: 2,
    locale: 'he-IL',
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

  // Prefer the "מידע כללי" card; otherwise capture the mobile viewport (the whole card, as Karin
  // screenshots it). Selectors on a third-party site drift — the viewport fallback keeps this working.
  const card = page.locator('text=מידע כללי').first();
  if (await card.count()) {
    const box = await card.locator('xpath=ancestor::*[self::section or self::div][1]').first();
    if (await box.count()) {
      await box.screenshot({ path: out });
    } else {
      await page.screenshot({ path: out });
    }
  } else {
    await page.screenshot({ path: out });
  }
  console.log(`Saved ${out}`);
} finally {
  await browser.close();
}
