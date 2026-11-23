// 在容器工作台里按设备档位截工坊页，用于人工核对排版（我看不到像素，交给用户看）。
// 用法：node tools/minitool/shots_devices.mjs [workbenchUrl] [outDir]
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir} from 'node:fs/promises';

const URL = process.argv[2] || 'http://127.0.0.1:3214/';
const OUT = process.argv[3] || 'qa/minitool/final';
await mkdir(OUT, {recursive: true});

const browser = await chromium.launch({channel: 'msedge', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 1400, height: 1000}, deviceScaleFactor: 2});
await page.goto(URL);
await page.waitForTimeout(2500);

const frame = async () => {
  for (let i = 0; i < 40; i++) {
    const f = page.frames().find((x) => x.url().includes('/app/'));
    if (f) return f;
    await page.waitForTimeout(500);
  }
  throw new Error('app frame not found');
};

async function intoWorkshop() {
  const f = await frame();
  for (let i = 0; i < 14; i++) {
    const done = await f.evaluate(() => {
      const vis = (s) => { const el = document.querySelector(s); if (!el) return false;
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0; };
      if (vis('#brief-done')) { document.querySelector('#brief-done').click(); return 'brief'; }
      if (vis('#start-button')) { document.querySelector('#start-button').click(); return 'start'; }
      if (vis('#skip-opening')) { document.querySelector('#skip-opening').click(); return 'skip'; }
      return '';
    }).catch(() => '');
    if (done === 'brief') break;
    await page.waitForTimeout(800);
  }
  await page.waitForFunction(() => document.querySelector('#world')?.dataset.loading === 'false', null, {timeout: 20000}).catch(() => {});
  await page.waitForTimeout(1200);
  return f;
}

async function pickDevice(label) {
  const ok = await page.evaluate((want) => {
    const walk = (root) => {
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) {
          const btn = el.shadowRoot.querySelector(`[aria-label="${want}"]`);
          if (btn) { btn.click(); return true; }
          if (walk(el.shadowRoot)) return true;
        }
      }
      return false;
    };
    return walk(document);
  }, label);
  await page.waitForTimeout(3000);
  return ok;
}

for (const [label, file] of [['iPhone 预览', 'phone-workshop'], ['iPad 预览', 'ipad-workshop'], ['桌面预览', 'desktop-workshop']]) {
  await pickDevice(label);
  const f = await intoWorkshop();
  const info = await f.evaluate(() => ({
    w: innerWidth, h: innerHeight, input: document.documentElement.dataset.input,
    layout: document.documentElement.dataset.layout,
  }));
  await page.screenshot({path: `${OUT}/${file}.png`});
  console.log(file, JSON.stringify(info));
}

// 旋屏：回到 iPhone 后点顶栏「⟳」
await pickDevice('iPhone 预览');
let f = await intoWorkshop();
await f.evaluate(() => { document.querySelector('#rotate-button')?.click(); });
await page.waitForTimeout(1500);
await page.screenshot({path: `${OUT}/phone-rotated.png`});
console.log('phone-rotated', JSON.stringify(await f.evaluate(() => ({
  rotate: document.documentElement.dataset.rotate || 'off',
  layout: document.documentElement.dataset.layout,
  w: Math.round(parseFloat(getComputedStyle(document.querySelector('#app')).width)),
  h: Math.round(parseFloat(getComputedStyle(document.querySelector('#app')).height)),
}))));

await browser.close();
