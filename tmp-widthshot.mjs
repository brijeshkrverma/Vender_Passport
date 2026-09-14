import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:3000';
const tag = process.argv[2] || 'before';
const OUT = `walkthrough/width-${tag}`;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const vp of [{ w: 1920, h: 1080 }, { w: 2560, h: 1400 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'priya.sharma@globaltech.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('**/dashboard**');
  const skip = page.locator('button:has-text("Skip setup")');
  try { await skip.waitFor({ state: 'visible', timeout: 3500 }); await skip.click(); await skip.waitFor({ state: 'hidden' }); } catch {}

  for (const [name, path] of [['dashboard', '/dashboard'], ['audits', '/audits'], ['findings', '/findings']]) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    // How much of the row is actually used?
    const m = await page.evaluate(() => {
      const main = document.querySelector('main');
      const r = main.getBoundingClientRect();
      return { mainRight: Math.round(r.right), mainWidth: Math.round(r.width), viewport: window.innerWidth };
    });
    const gap = m.viewport - m.mainRight;
    console.log(`  ${String(vp.w).padEnd(5)} ${name.padEnd(10)} main ${m.mainWidth}px  ->  daayein khali: ${gap}px`);

    await page.screenshot({ path: `${OUT}/${vp.w}-${name}.png` });
  }
  await ctx.close();
}
await browser.close();
