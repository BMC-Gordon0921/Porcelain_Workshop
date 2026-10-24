import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.APP_URL || 'http://127.0.0.1:5174/';
const OUT = path.resolve('shots');
fs.mkdirSync(OUT, { recursive: true });
const shot = async (page, name) => {
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  console.log('shot', name);
};

const browser = await chromium.launch({ channel: 'msedge', args: ['--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'zh-CN' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(2400);
await shot(page, '01-opening');

const carousel = await page.locator('#prologue-carousel').boundingBox();
console.log('carousel box', JSON.stringify(carousel));
const cx = carousel.x + carousel.width / 2, cy = carousel.y + carousel.height / 2;
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 14; i++) await page.mouse.move(cx + i * 14, cy - i * 0.6, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(450);
await shot(page, '02-carousel-dragged');

await page.mouse.move(cx + 40, cy + 20);
await page.waitForTimeout(700);
await shot(page, '03-carousel-hover');

await page.click('.opening-lang');
await page.waitForTimeout(800);
await shot(page, '04-opening-en');
const langEn = await page.evaluate(() => document.documentElement.lang);
console.log('lang:', langEn);
await page.click('.opening-lang');
await page.waitForTimeout(500);

await page.evaluate(() => document.querySelector('#skip-opening')?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelector('#start-button')?.click());
await page.waitForTimeout(1600);
await shot(page, '05-city-map');

const world = await page.locator('#world').boundingBox();
const wx = world.x + world.width * 0.5, wy = world.y + world.height * 0.58;
await page.mouse.move(wx, wy);
await page.mouse.down({ button: 'left' });
for (let i = 1; i <= 16; i++) await page.mouse.move(wx + i * 12, wy + i * 2, { steps: 2 });
await page.mouse.up({ button: 'left' });
await page.waitForTimeout(400);
await shot(page, '06-map-orbit');
await page.mouse.move(wx, wy);
await page.mouse.wheel(0, -700);
await page.waitForTimeout(500);
await shot(page, '07-map-zoom-in');

await page.evaluate(() => { const t = window.__terra; t.state.collectClay(); t.openKiln(); });
await page.waitForTimeout(500);
await shot(page, '08-kiln-idle');
await page.evaluate(() => document.querySelector('#fire-button')?.click());
await page.waitForTimeout(1000);
await shot(page, '09-kiln-firing');
let struck = false;
for (let i = 0; i < 500; i++) {
  const p = await page.evaluate(() => window.__terra.state.kilnProgress());
  const grade = await page.evaluate(() => window.__terra.state.kiln?.grade ?? null);
  if (!struck && !grade && p >= 0.61 && p <= 0.71) { await page.keyboard.press(' '); struck = true; }
  if (struck && grade) break;
  await page.waitForTimeout(35);
}
await page.waitForTimeout(300);
await shot(page, '10-kiln-verdict');
console.log('verdict', JSON.stringify(await page.evaluate(() => ({
  grade: window.__terra.state.kiln?.grade ?? null,
  progress: window.__terra.state.kilnProgress(),
  label: document.querySelector('#kiln-grade')?.textContent,
}))));
await page.evaluate(() => document.querySelector('#fire-button')?.click());
await page.waitForTimeout(400);

await page.click('#lang-toggle');
await page.waitForTimeout(900);
await shot(page, '11-hud-en');
await page.click('#lang-toggle');
await page.waitForTimeout(600);

await page.evaluate(() => window.__terra.openJourney());
await page.waitForTimeout(1200);
await shot(page, '12-journey');
await page.evaluate(() => window.__terra.openStation('wheel'));
await page.waitForTimeout(1400);
await shot(page, '13-wheel');

const mobile = await ctx.newPage();
await mobile.setViewportSize({ width: 420, height: 860 });
await mobile.goto(URL, { waitUntil: 'load' });
await mobile.waitForTimeout(2600);
await mobile.screenshot({ path: path.join(OUT, '14-mobile-opening.png') });
console.log('shot 14-mobile-opening');

console.log('ERRORS', JSON.stringify(errors, null, 2));
await browser.close();
