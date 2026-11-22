import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
const url = process.argv[2];
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 430, height: 932}, deviceScaleFactor: 2});
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text().slice(0, 200)); });
await page.goto(url, {waitUntil: 'domcontentloaded'});
let frame = null;
for (let i = 0; i < 120 && !frame; i += 1) { frame = page.frames().find(f => f.url().includes('/app/')); if (!frame) await page.waitForTimeout(250); }
await frame.waitForSelector('#skip-opening', {timeout: 30000});
await page.waitForTimeout(1200);
const snap = async (label) => {
  const r = await frame.evaluate(() => {
    const w = document.getElementById('welcome'), c = document.getElementById('world');
    return {stage: w.dataset.openingStage, hidden: w.classList.contains('hidden'), loading: c.dataset.loading, landmark: c.dataset.landmark || null, toast: (document.getElementById('toast') || {}).textContent || null};
  });
  console.log(label, JSON.stringify(r));
};
await frame.evaluate(() => document.getElementById('skip-opening').click());
await page.waitForTimeout(500);
await snap('after-unfold');
for (let i = 1; i <= 4; i += 1) {
  const clicked = await frame.evaluate(() => { const b = document.getElementById('start-button'); if (!b || b.disabled) return 'disabled'; b.click(); return 'ok'; });
  await page.waitForTimeout(1500);
  await snap(`after-start#${i} (${clicked})`);
}
await browser.close();
