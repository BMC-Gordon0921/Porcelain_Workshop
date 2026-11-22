// 图片资源专项：逐屏/逐面板收集 <img> 与 background-image 的实际加载状态与显示尺寸，
// 找出「真失败（naturalWidth=0）」「被容器压成 0 高（视觉上像没加载）」「画布塌成 0」三类问题。
// 用法：node tools/minitool/audit_media.mjs [W] [H] [rotate]
//   例：node tools/minitool/audit_media.mjs 393 852 rotate
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdirSync, writeFileSync} from 'node:fs';

const W = Number(process.argv[2] || 393);
const H = Number(process.argv[3] || 852);
const ROTATE = process.argv[4] === 'rotate';
const url = process.env.GAME_URL || 'http://localhost:5188/';
const OUT = process.env.OUT || 'qa/minitool/media';
mkdirSync(OUT, {recursive: true});
const insets = ROTATE ? {top: 0, bottom: 0, left: 21, right: 80} : {top: 80, bottom: 21, left: 0, right: 0};

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const context = await browser.newContext({
  viewport: ROTATE ? {width: H, height: W} : {width: W, height: H},
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true
});
const page = await context.newPage();
const errors = [];
const failed = [];
page.on('pageerror', e => errors.push(String(e.message)));
page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

await page.goto(url, {waitUntil: 'domcontentloaded'});
await page.waitForFunction(() => !!window.__terra, null, {timeout: 30000});
await page.evaluate(ins => {
  const root = document.documentElement;
  root.dataset.platform = 'minitool';
  root.dataset.input = 'touch';
  root.dataset.layout = ins.layout;
  root.style.setProperty('--mt-top-inset', ins.top + 'px');
  root.style.setProperty('--mt-bottom-inset', ins.bottom + 'px');
  root.style.setProperty('--mt-left-inset', ins.left + 'px');
  root.style.setProperty('--mt-right-inset', ins.right + 'px');
}, {...insets, layout: ROTATE ? 'ls' : (W >= 761 ? 'wide' : 'sm')});
await page.waitForTimeout(300);

// 采集器：只看可见元素，把「0 高/0 宽」「natural 0」标出来
const collector = () => {
  const out = [];
  const visible = el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  };
  document.querySelectorAll('img').forEach(img => {
    if (!visible(img)) return;
    const r = img.getBoundingClientRect();
    out.push({
      kind: 'img',
      ref: img.className && typeof img.className === 'string' ? `.${img.className.trim().split(/\s+/)[0]}` : img.id || 'img',
      src: (img.currentSrc || img.src || '').split('/').slice(-2).join('/'),
      natural: `${img.naturalWidth}x${img.naturalHeight}`,
      rendered: `${Math.round(r.width)}x${Math.round(r.height)}`,
      complete: img.complete,
      broken: img.complete && img.naturalWidth === 0
    });
  });
  document.querySelectorAll('canvas').forEach(canvas => {
    if (!visible(canvas)) return;
    const r = canvas.getBoundingClientRect();
    out.push({
      kind: 'canvas',
      ref: canvas.id || `.${(canvas.className || 'canvas').toString().trim().split(/\s+/)[0]}`,
      natural: `${canvas.width}x${canvas.height}`,
      rendered: `${Math.round(r.width)}x${Math.round(r.height)}`,
      broken: canvas.width < 4 || canvas.height < 4 || r.height < 8 || r.width < 8
    });
  });
  document.querySelectorAll('*').forEach(el => {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none' || !bg.includes('url(')) return;
    if (!visible(el)) return;
    const r = el.getBoundingClientRect();
    const match = /url\("?([^")]+)"?\)/.exec(bg);
    out.push({
      kind: 'bg',
      ref: el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : el.tagName.toLowerCase(),
      src: match ? match[1].split('/').slice(-2).join('/') : null,
      natural: null,
      rendered: `${Math.round(r.width)}x${Math.round(r.height)}`,
      broken: r.width < 8 || r.height < 8
    });
  });
  return out;
};

const screens = {};
async function snap(name) {
  const items = await page.evaluate(collector);
  const broken = items.filter(i => i.broken);
  screens[name] = {total: items.length, broken};
  await page.screenshot({path: `${OUT}/${ROTATE ? 'ls' : 'pt'}-${W}x${H}-${name}.png`});
}

// 开屏：故事页 + 轮播页
await page.click('#unfold-map');
await page.waitForFunction(() => document.querySelector('#opening-scene-carousel canvas')?.dataset.loading === 'false');
await snap('01-opening');
await page.evaluate(() => document.querySelector('[data-opening-stage="map"]') && null);
await page.click('#skip-opening');
if (await page.locator('#welcome').isVisible()) await page.click('#start-button');
await page.waitForSelector('#brief-done');
await page.click('#brief-done');
await page.evaluate(() => {
  window.dispatchEvent(new Event('focus'));
  window.__terra.state.tutorial = {status: 'complete', step: null};
  window.__terra.state.hasClay = true;
});
await page.waitForTimeout(1500);
await snap('02-workshop');

const panels = ['brief', 'editor', 'kiln', 'journey', 'upgrades', 'citymap', 'help', 'collection'];
for (const kind of panels) {
  await page.evaluate(k => {
    const t = window.__terra;
    if (k === 'kiln') {
      t.state.shapeEdits = Math.max(1, t.state.shapeEdits | 0);
      t.state.piece.pixels[0] = 2;
    }
    if (k === 'help') return t.showHelp();
    if (k === 'brief') { document.querySelector('#view-brief')?.click(); return null; }
    if (k === 'editor') { t.teleport('wheel'); return null; }
    if (k === 'kiln') return t.openKiln();
    if (k === 'journey') return t.openJourney();
    if (k === 'upgrades') return t.openUpgrades();
    if (k === 'citymap') return t.openCityMap();
    if (k === 'collection') { document.querySelector('#view-collection')?.click(); return null; }
    return null;
  }, kind);
  await page.waitForTimeout(650);
  if (kind === 'editor') {
    await page.evaluate(() => window.__terra.openStation('wheel'));
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(500);
  await snap(kind);
  await page.evaluate(() => { window.__terra.closeTask(); window.__terra.hideHelp(); });
  await page.waitForTimeout(300);
}

const problems = Object.entries(screens).flatMap(([screen, s]) => s.broken.map(b => ({screen, ...b})));
const summary = {
  viewport: `${ROTATE ? H : W}x${ROTATE ? W : H}`,
  rotated: ROTATE,
  errors,
  failedRequests: failed,
  screens: Object.fromEntries(Object.entries(screens).map(([k, v]) => [k, {total: v.total, broken: v.broken.length}])),
  problems,
  pass: problems.length === 0 && errors.length === 0 && failed.length === 0
};
writeFileSync(`${OUT}/audit-${ROTATE ? 'ls' : 'pt'}-${W}x${H}.json`, JSON.stringify({summary, screens}, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.pass ? 0 : 1);
