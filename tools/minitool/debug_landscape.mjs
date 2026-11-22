// 横版（手动旋屏）下的排版/渲染/资源体检：容器工作台内实测。
// 用法：node tools/minitool/debug_landscape.mjs [workbenchUrl] [outDir]
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir, writeFile} from 'node:fs/promises';

const URL = process.argv[2] || 'http://127.0.0.1:3214/';
const OUT = process.argv[3] || 'qa/minitool/debug';
await mkdir(OUT, {recursive: true});

const browser = await chromium.launch({channel: 'msedge', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 1400, height: 1000}, deviceScaleFactor: 2});

const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => logs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) logs.push(`http ${r.status()}: ${r.url()}`); });

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
  await page.waitForTimeout(1200);
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

const probe = () => {
  const box = (sel) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      display: cs.display, visibility: cs.visibility, z: cs.zIndex, position: cs.position};
  };
  const world = document.querySelector('#world');
  const app = document.querySelector('#app');
  const imgs = [...document.querySelectorAll('img')].map((im) => ({
    src: im.getAttribute('src'), complete: im.complete, nw: im.naturalWidth, nh: im.naturalHeight,
    box: box(im),
  }));
  const broken = imgs.filter((i) => i.nw === 0);
  const bg = [...document.querySelectorAll('*')].map((el) => {
    const v = getComputedStyle(el).backgroundImage;
    return v && v !== 'none' && v.includes('url(') ? {tag: el.tagName + '.' + el.className, v} : null;
  }).filter(Boolean).slice(0, 20);
  // 「按钮是不是被挡住了」的唯一客观判据：把控件中心的屏幕坐标丢给 elementFromPoint，
  // 看最上层元素是不是它自己（或它的后代）。旋屏下 #app 被 rotate(90deg)，但绕中心旋转，
  // 所以 bbox 中心仍等于控件的真实屏幕中心。
  function hitTest() {
    const targets = {
      joystick: '#joystick', knob: '#joystick-knob', interact: '#touch-interact',
      resetView: '#reset-view', rotateBtn: '#rotate-button', helpBtn: '#help-button',
      openJourney: '#open-journey', viewBrief: '#view-brief', sound: '[data-sound-toggle]',
    };
    const out = {};
    for (const [name, sel] of Object.entries(targets)) {
      const el = document.querySelector(sel);
      if (!el) { out[name] = {present: false}; continue; }
      const r = el.getBoundingClientRect();
      const cx = Math.round(r.x + r.width / 2), cy = Math.round(r.y + r.height / 2);
      const inside = cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight && r.width > 0 && r.height > 0;
      const top = document.elementFromPoint(cx, cy);
      out[name] = {
        present: true, cx, cy, inside,
        visible: getComputedStyle(el).display !== 'none' && r.width > 0,
        top: top ? (top.id ? '#' + top.id : top.tagName.toLowerCase() + '.' + String(top.className || '').split(' ')[0]) : null,
        self: !!top && (top === el || el.contains(top) || top.contains(el)),
      };
    }
    // 除了固定控件，再扫一遍 HUD 里所有可点元素：任何中心点命不中自己的都是「够不到」。
    const sweep = [];
    for (const el of document.querySelectorAll('#app button, #app a, #app [role=button]')) {
      if (el.closest('.overlay:not(.hidden)')) continue; // 弹层里的按钮单独看
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || getComputedStyle(el).display === 'none') continue;
      const cx = Math.round(r.x + r.width / 2), cy = Math.round(r.y + r.height / 2);
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) {
        sweep.push({id: el.id || el.className, why: 'offscreen', cx, cy});
        continue;
      }
      const top = document.elementFromPoint(cx, cy);
      if (!top || !(top === el || el.contains(top) || top.contains(el))) {
        sweep.push({id: el.id || String(el.className).split(' ')[0], why: 'covered', by: top ? (top.id || top.tagName.toLowerCase() + '.' + String(top.className || '').split(' ')[0]) : null, cx, cy});
      }
    }
    out.__sweep = sweep;
    return out;
  }

  return {
    dataset: {...document.documentElement.dataset},
    viewport: {w: innerWidth, h: innerHeight, dpr: devicePixelRatio},
    app: box(app),
    appStyle: {w: getComputedStyle(app).width, h: getComputedStyle(app).height, transform: getComputedStyle(app).transform, position: getComputedStyle(app).position},
    worldWrap: box('#world-wrap'),
    world: box(world),
    worldAttr: world ? {attrW: world.width, attrH: world.height, clientW: world.clientWidth, clientH: world.clientHeight, dataset: {...world.dataset}} : null,
    hud: {
      topbar: box('.topbar'), commissions: box('#app > .commissions'), bottomBar: box('.bottom-bar'),
      joystick: box('#joystick'), touchControls: box('#touch-controls'), interact: box('#touch-interact'),
      resetView: box('#reset-view'), guide: box('#guide-card'), interaction: box('#interaction'),
      rotateBtn: box('#rotate-button'), helpBtn: box('#help-button'),
    },
    imgs: imgs.length, broken, bg,
    hits: hitTest(),
    canvases: [...document.querySelectorAll('canvas')].map((c) => {
      const dpr = devicePixelRatio || 1;
      const wantW = Math.round(c.clientWidth * dpr), wantH = Math.round(c.clientHeight * dpr);
      return {id: c.id || String(c.className).split(' ')[0], attr: `${c.width}x${c.height}`,
        client: `${c.clientWidth}x${c.clientHeight}`, want: `${wantW}x${wantH}`,
        ok: Math.abs(c.width / c.height - c.clientWidth / c.clientHeight) < 0.02};
    }),
  };
};

const report = {};
for (const [label, key] of [['iPhone 预览', 'phone'], ['iPad 预览', 'ipad']]) {
  await pickDevice(label);
  const f = await intoWorkshop();
  report[`${key}-portrait`] = await f.evaluate(probe);
  await page.screenshot({path: `${OUT}/${key}-portrait.png`});
  await f.evaluate(() => document.querySelector('#rotate-button')?.click());
  await page.waitForTimeout(600);
  report[`${key}-rotated-early`] = await f.evaluate(probe);
  await page.waitForTimeout(2000);
  report[`${key}-rotated`] = await f.evaluate(probe);
  await page.screenshot({path: `${OUT}/${key}-rotated.png`});
}

report.logs = logs.slice(0, 40);
await writeFile(`${OUT}/landscape.json`, JSON.stringify(report, null, 2), 'utf8');
for (const [k, v] of Object.entries(report)) {
  if (k === 'logs') continue;
  const h = v.hits || {};
  const sweep = h.__sweep || [];
  const bad = sweep.map((x) => `${x.id}:${x.why}${x.by ? '->' + x.by : ''}`);
  const badCanvas = (v.canvases || []).filter((c) => !c.ok).map((c) => `${c.id} attr ${c.attr} want ${c.want}`);
  console.log('   canvases', (v.canvases || []).length, badCanvas.length ? 'BAD ' + badCanvas.join(' | ') : 'all match');
  console.log(k, 'app', `${v.app.w}x${v.app.h}`, 'world', `${v.world.w}x${v.world.h}`,
    'canvas', v.worldAttr ? `${v.worldAttr.attrW}x${v.worldAttr.attrH} client ${v.worldAttr.clientW}x${v.worldAttr.clientH}` : '-',
    'broken', v.broken.length, 'blocked', bad.length ? bad.join(',') : 'none');
}
console.log('logs', report.logs);
await browser.close();
