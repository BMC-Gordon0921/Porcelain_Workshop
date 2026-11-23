// 旋屏下的版面体检：把 #app 的 rotate 暂时去掉，量「旋转后布局空间」里的盒子与重叠。
// 用法：node tools/minitool/debug_rotate_space.mjs [workbenchUrl] [outDir]
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir, writeFile} from 'node:fs/promises';

const URL = process.argv[2] || 'http://127.0.0.1:3214/';
const OUT = process.argv[3] || 'qa/minitool/debug';
await mkdir(OUT, {recursive: true});

const browser = await chromium.launch({channel: 'msedge', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 1400, height: 1000}, deviceScaleFactor: 2});
await page.goto(URL);
await page.waitForTimeout(2500);

const appFrame = async () => {
  for (let i = 0; i < 40; i++) {
    const f = page.frames().find((x) => x.url().includes('/app/'));
    if (f) return f;
    await page.waitForTimeout(500);
  }
  throw new Error('app frame not found');
};

async function intoWorkshop() {
  const f = await appFrame();
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
  await page.waitForTimeout(1000);
  return f;
}

async function pickDevice(label) {
  await page.evaluate((want) => {
    const walk = (rootEl) => {
      for (const el of rootEl.querySelectorAll('*')) {
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
}

// 在布局空间里量：去掉 rotate，把 #app 摆成 852×393
const measureLayoutSpace = () => {
  const app = document.querySelector('#app');
  const keep = app.getAttribute('style') || '';
  app.style.transform = 'none';
  app.style.position = 'absolute';
  app.style.top = '0';
  app.style.left = '0';
  app.style.width = getComputedStyle(document.documentElement).getPropertyValue('--mt-height').trim() || '852px';
  app.style.height = getComputedStyle(document.documentElement).getPropertyValue('--mt-width').trim() || '393px';
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)};
  };
  const overlap = (a, b) => {
    if (!a || !b) return 0;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return ox > 0 && oy > 0 ? `${ox}x${oy}` : 0;
  };
  const rects = {
    app: box('#app'), topbar: box('.topbar'), commissions: box('#app > .commissions'),
    worldWrap: box('#world-wrap'), world: box('#world'), bottomBar: box('.bottom-bar'),
    joystick: box('#joystick'), interact: box('#touch-interact'), resetView: box('#reset-view'),
    interaction: box('#interaction'), guide: box('#guide-card'), carrying: box('#carrying'),
    rotateBtn: box('#rotate-button'), helpBtn: box('#help-button'), dayPill: box('.day-pill'),
    brand: box('.brand'), soundBtn: box('[data-sound-toggle]'),
  };
  const world = document.querySelector('#world');
  const pairs = [];
  const keys = Object.keys(rects).filter((k) => k !== 'app' && rects[k]);
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const o = overlap(rects[keys[i]], rects[keys[j]]);
    if (o) pairs.push(`${keys[i]} × ${keys[j]} = ${o}`);
  }
  const vw = parseFloat(app.style.width), vh = parseFloat(app.style.height);
  const offscreen = Object.entries(rects).filter(([k, r]) => r && k !== 'app' && (r.x < -1 || r.y < -1 || r.x + r.w > vw + 1 || r.y + r.h > vh + 1))
    .map(([k, r]) => `${k} [${r.x},${r.y},${r.w},${r.h}]`);
  const images = [...document.querySelectorAll('img')].map((im) => ({
    src: im.getAttribute('src'), nw: im.naturalWidth, display: getComputedStyle(im).display,
    box: (() => { const r = im.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height)}; })(),
  }));
  const hiddenImages = images.filter((i) => i.display === 'none' || i.box.w === 0 || i.box.h === 0);
  const broken = images.filter((i) => i.nw === 0);
  const canvasInfo = world ? {attrW: world.width, attrH: world.height, clientW: world.clientWidth, clientH: world.clientHeight} : null;
  app.setAttribute('style', keep);
  return {viewport: {w: vw, h: vh}, rects, pairs, offscreen, images: images.length, hiddenImages, broken, canvasInfo,
    layout: document.documentElement.dataset.layout, rotate: document.documentElement.dataset.rotate || 'off'};
};

const report = {};
for (const [label, key] of [['iPhone 预览', 'phone'], ['iPad 预览', 'ipad']]) {
  await pickDevice(label);
  const f = await intoWorkshop();
  await f.evaluate(() => document.querySelector('#rotate-button')?.click());
  await page.waitForTimeout(1200);
  report[key] = await f.evaluate(measureLayoutSpace);
  await page.screenshot({path: `${OUT}/${key}-rotate-layoutspace.png`});
  // 面板：订单详情 / 帮助 / 贴画工坊 / 图鉴
  for (const [sel, name] of [['#view-brief', 'brief'], ['#help-button', 'help'], ['#open-journey', 'journey'], ['#view-collection', 'collection']]) {
    const opened = await f.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el || getComputedStyle(el).display === 'none' || el.getBoundingClientRect().width === 0) return false;
      el.click();
      return true;
    }, sel).catch(() => false);
    if (!opened) continue;
    await page.waitForTimeout(700);
    report[`${key}-${name}`] = await f.evaluate(measureLayoutSpace);
    await page.screenshot({path: `${OUT}/${key}-${name}-rotate.png`});
    await f.evaluate(() => {
      const close = document.querySelector('.overlay:not(.hidden) .close-button');
      close?.click();
    });
    await page.waitForTimeout(400);
  }
}

await writeFile(`${OUT}/rotate-space.json`, JSON.stringify(report, null, 2), 'utf8');
for (const [k, v] of Object.entries(report)) {
  console.log(`== ${k} viewport ${v.viewport.w}x${v.viewport.h} layout=${v.layout} canvas=${v.canvasInfo ? v.canvasInfo.attrW + 'x' + v.canvasInfo.attrH + ' (client ' + v.canvasInfo.clientW + 'x' + v.canvasInfo.clientH + ')' : '-'}`);
  console.log('   overlaps:', v.pairs.length ? v.pairs.join(' | ') : 'none');
  if (v.offscreen.length) console.log('   offscreen:', v.offscreen.join(' | '));
  if (v.broken.length) console.log('   broken:', JSON.stringify(v.broken));
  if (v.hiddenImages.length) console.log('   hidden-imgs:', v.hiddenImages.map((i) => i.src).join(' | '));
}
await browser.close();
