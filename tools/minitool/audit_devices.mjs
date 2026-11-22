// 容器工作台多设备尺寸审计：切换 iPhone / iPad / 桌面 预览，逐屏量关键元素盒子并截图。
// 用法：node tools/minitool/audit_devices.mjs [工作台地址] [输出目录]
// 输出：<out>/<device>/NN-*.png 与 <out>/audit.json（含重叠判定）
import {chromium} from 'file:///D:/ECNU/BOKE/Porcelain_Workshop_Code/qa/pw/node_modules/playwright-core/index.mjs';
import {mkdirSync, writeFileSync} from 'node:fs';

const WORKBENCH = process.argv[2] || 'http://127.0.0.1:3214/';
const OUT = process.argv[3] || 'qa/minitool/devices';

const launch = () => chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});

const inShadow = (label) => `
  (function walk(root){
    for (const el of root.querySelectorAll('*')) {
      if (el.matches && el.matches('.device-switcher button') && el.getAttribute('aria-label') === ${JSON.stringify(label)}) return el;
      if (el.shadowRoot) { const hit = walk(el.shadowRoot); if (hit) return hit; }
    }
    return null;
  })(document)`;

const auditScript = () => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return {hidden: true};
    const box = el.getBoundingClientRect();
    return [Math.round(box.x), Math.round(box.y), Math.round(box.right), Math.round(box.bottom)];
  };
  const asBox = (value) => (Array.isArray(value) ? {x1: value[0], y1: value[1], x2: value[2], y2: value[3]} : null);
  const overlap = (a, b) => {
    const p = asBox(rect(a)), q = asBox(rect(b));
    if (!p || !q) return null;
    const w = Math.min(p.x2, q.x2) - Math.max(p.x1, q.x1);
    const h = Math.min(p.y2, q.y2) - Math.max(p.y1, q.y1);
    return w > 0 && h > 0 ? {w: Math.round(w), h: Math.round(h)} : false;
  };
  const parts = {};
  for (const sel of ['#app', '.topbar', '#world-wrap', '#app > .commissions', '.bottom-bar', '#touch-controls', '#touch-interact', '#reset-view', '#interaction', '.opening-screen', '.opening-header', '.opening-layout', '.city-prologue', '.opening-footer', '.carrying', '#toast']) {
    parts[sel] = rect(sel);
  }
  const pairs = [
    ['.topbar', '#app > .commissions'],
    ['.topbar', '#world-wrap'],
    ['#app > .commissions', '#world-wrap'],
    ['#touch-controls', '#reset-view'],
    ['#touch-interact', '#reset-view'],
    ['#touch-controls', '.bottom-bar'],
    ['#touch-interact', '#app > .commissions'],
    ['#interaction', '.topbar'],
    ['#interaction', '#app > .commissions'],
    ['#reset-view', '.bottom-bar']
  ];
  return {
    viewport: [innerWidth, innerHeight],
    dpr: devicePixelRatio,
    parts,
    overlaps: Object.fromEntries(pairs.map(([a, b]) => [`${a} × ${b}`, overlap(a, b)])),
    overflow: {
      bodyScrollW: document.documentElement.scrollWidth,
      bodyScrollH: document.documentElement.scrollHeight,
      panelBottom: rect('.task-panel')?.[3] ?? null,
      overlayScroll: (() => { const el = document.querySelector('.task-panel'); return el ? el.scrollHeight - el.clientHeight : null; })()
    }
  };
};

const browser = await launch();
const page = await browser.newPage({viewport: {width: 1600, height: 1100}});
await page.goto(WORKBENCH, {waitUntil: 'load'});
await page.waitForTimeout(2500);

const devices = await page.evaluate(() => {
  const out = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.matches && el.matches('.device-switcher button')) out.push(el.getAttribute('aria-label'));
      if (el.shadowRoot) walk(el.shadowRoot);
    }
  };
  walk(document);
  return out;
});

const selectDevice = async (label) => {
  await page.evaluate(`(${inShadow(label).trim()}).click()`);
  await page.waitForTimeout(2600);
};

const frameOf = () => page.frames().find((f) => f.url().includes('/app/'));
const clickDom = async (selectors) => {
  const f = frameOf();
  for (const sel of [].concat(selectors)) {
    const hit = await f.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel).catch(() => false);
    if (hit) return sel;
    await page.waitForTimeout(300);
  }
  return null;
};

const walkStages = async (dir) => {
  const f = frameOf();
  const record = {};
  const shot = async (name) => {
    record[name] = await f.evaluate(auditScript);
    await page.screenshot({path: `${dir}/${name}.png`});
  };
  await shot('01-opening-intro');
  await clickDom('#unfold-map');
  await page.waitForTimeout(1400);
  await shot('02-opening-map');
  // 进入工坊：skip() 第一次点只展开地图，要连点
  for (let i = 0; i < 3; i += 1) await clickDom('#skip-opening');
  await page.waitForTimeout(900);
  await clickDom('#start-button');
  await page.waitForTimeout(2600);
  await clickDom('#brief-done');
  await page.waitForTimeout(1200);
  await shot('03-workshop');
  await clickDom('#view-brief');
  await page.waitForTimeout(900);
  await shot('04-brief');
  await clickDom('#close-task');
  await page.waitForTimeout(600);
  await clickDom('#lifecycle-toggle, [data-sound-toggle]');
  await page.waitForTimeout(400);
  const opened = await clickDom('#open-upgrades');
  await page.waitForTimeout(1200);
  await shot(`05-${opened === '#open-upgrades' ? 'upgrades' : 'aux'}`);
  await clickDom('#close-task, #upgrade-close, .close-button');
  await page.waitForTimeout(600);
  await clickDom('#open-journey');
  await page.waitForTimeout(1200);
  await shot('06-journey');
  await clickDom('#close-task, .close-button');
  await page.waitForTimeout(600);
  return record;
};

const report = {};
for (const device of devices) {
  await selectDevice(device);
  const safe = device.replace(/\s+预览$/, '');
  const dir = `${OUT}/${safe}`;
  mkdirSync(dir, {recursive: true});
  report[safe] = await walkStages(dir);
  // 切设备前回到开屏，避免上一台设备的弹层残留
  const f = frameOf();
  await f.evaluate(() => { document.querySelectorAll('.overlay').forEach((el) => el.classList.add('hidden')); });
}
writeFileSync(`${OUT}/audit.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k, v]) => [k, {viewport: v['03-workshop']?.viewport, overlaps: v['03-workshop']?.overlaps}])), null, 1));
await browser.close();
