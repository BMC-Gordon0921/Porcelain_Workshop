import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
const url = process.argv[2];
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 430, height: 932}, deviceScaleFactor: 2});
await page.goto(url, {waitUntil: 'domcontentloaded'});
let frame = null;
for (let i = 0; i < 120 && !frame; i += 1) { frame = page.frames().find(f => f.url().includes('/app/')); if (!frame) await page.waitForTimeout(250); }
await frame.waitForSelector('#skip-opening', {timeout: 30000});
await page.waitForTimeout(1000);
await frame.evaluate(() => document.getElementById('skip-opening').click());
await page.waitForTimeout(600);
await frame.evaluate(() => document.getElementById('start-button').click());
await page.waitForTimeout(2500);
const out = await frame.evaluate(() => {
  const info = (sel) => {
    const n = document.querySelector(sel);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    return {sel, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], maxHeight: cs.maxHeight, padding: cs.padding, overflow: cs.overflow};
  };
  return {viewport: [innerWidth, innerHeight], nodes: ['#task-overlay', '.task-panel', '.task-header', '.task-footer', '#app', '#world-wrap'].map(info)};
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
