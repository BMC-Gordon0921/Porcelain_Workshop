// 重叠审计：逐屏找出「卡片/文字互相压住」的真实重叠对（不是 HUD 叠在 3D 画布上这种预期叠加）。
// 用法：W=393 H=852 IN_TOP=80 OUT=qa/minitool/overlap/phone node tools/minitool/audit_overlap.mjs
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir, writeFile} from 'node:fs/promises';

const url = process.env.GAME_URL || 'http://localhost:5188/';
const W = Number(process.env.W || 393);
const H = Number(process.env.H || 852);
const TOP = Number(process.env.IN_TOP ?? 80);
const SIDE = Number(process.env.IN_SIDE ?? 0);
const BOTTOM = Number(process.env.IN_BOTTOM ?? 21);
const out = process.env.OUT || 'qa/minitool/overlap';
await mkdir(out, {recursive: true});

const browser = await chromium.launch({
  channel: process.env.CHROME_CHANNEL || 'msedge',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const context = await browser.newContext({viewport: {width: W, height: H}, deviceScaleFactor: Number(process.env.DPR || 1)});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const measure = () =>
  page.evaluate(() => {
    const label = (el) => {
      if (!el || el.nodeType !== 1) return '?';
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
      return `${el.tagName.toLowerCase()}${id}${cls}`;
    };
    const visible = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      return true;
    };
    const alpha = (color) => {
      const m = /rgba?\(([^)]+)\)/.exec(color || '');
      if (!m) return 0;
      const parts = m[1].split(',').map((s) => parseFloat(s));
      return parts.length > 3 ? parts[3] : 1;
    };
    const skip = new Set(['html', 'body', 'canvas', 'script', 'style', 'svg', 'path', 'use', 'defs', 'g', 'circle', 'rect', 'line', 'polyline', 'text']);

    // 只审「当前可见层」：有弹层就只看弹层内部，否则看工坊 HUD；被弹层盖住的 HUD 不算缺陷
    const modal = [...document.querySelectorAll('.overlay:not(.hidden), #help-overlay:not(.hidden), #welcome:not(.hidden)')]
      .filter((el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && Number(cs.opacity) !== 0; })
      .pop();
    const scope = modal || document.getElementById('app');

    // 被滚动/裁剪容器切掉的子元素不该算作重叠缺陷，先把矩形夹到可见区
    const clipRect = (rect, el) => { let x0 = -1e9, y0 = -1e9, x1 = 1e9, y1 = 1e9;
      for (let n = el.parentElement; n; n = n.parentElement) { const cs = getComputedStyle(n);
        if (cs.overflow === 'visible' && cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const r = n.getBoundingClientRect(); x0 = Math.max(x0, r.left); y0 = Math.max(y0, r.top); x1 = Math.min(x1, r.right); y1 = Math.min(y1, r.bottom); }
      const l = Math.max(rect.left, x0), t = Math.max(rect.top, y0), rr = Math.min(rect.right, x1), bb = Math.min(rect.bottom, y1);
      return {x: l, y: t, width: Math.max(0, rr - l), height: Math.max(0, bb - t)}; };
    const clip = (el) => clipRect(el.getBoundingClientRect(), el);
    const boxes = [];
    const push = (kind, el, rect, text) => {
      boxes.push({kind, name: label(el), text: text || '', x: rect.x, y: rect.y, w: rect.width, h: rect.height, el});
    };

    for (const el of scope.querySelectorAll('*')) {
      if (skip.has(el.tagName.toLowerCase())) continue;
      if (el.closest('svg')) continue;
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      const r = clip(el);
      if (r.width * r.height < 260) continue;
      const painted = alpha(cs.backgroundColor) > 0.06
        || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none')
        || cs.boxShadow !== 'none' || cs.backdropFilter !== 'none';
      if (!painted) continue;
      if (el.id === 'world' || el.classList.contains('opening-background')) continue;
      // 只收「卡片/按钮/面板」这类实心块，跳过整屏容器
      if (r.width > innerWidth * 0.92 && r.height > innerHeight * 0.92) continue;
      push('box', el, r);
      // 元素自身的直接文字块，用来抓「文字被别的卡片压住」
      for (const node of el.childNodes) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const tr of range.getClientRects()) {
          const tc = clipRect(tr, el);
          if (tc.width * tc.height < 200) continue;
          push('text', el, tc, node.textContent.trim().slice(0, 22));
        }
      }
    }

    const hits = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.el === b.el) continue;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (a.kind === 'box' && b.kind === 'box' && (a.el.parentElement === b.el.parentElement) === false) {
          // 兄弟以外的浮层也可能重叠，保留判断
        }
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox <= 2 || oy <= 2) continue;
        const area = ox * oy;
        const minArea = Math.min(a.w * a.h, b.w * b.h);
        if (area < 300 || area / minArea < 0.12) continue;
        // 纯装饰性 HUD 叠在 3D 画布上属预期：画布不参与，故此处不再特判
        hits.push({a: `${a.kind}:${a.name}${a.text ? ` "${a.text}"` : ''}`,
          b: `${b.kind}:${b.name}${b.text ? ` "${b.text}"` : ''}`,
          ox: Math.round(ox), oy: Math.round(oy), ratio: Math.round((area / minArea) * 100)});
      }
    }
    hits.sort((p, q) => q.ratio * q.ox * q.oy - p.ratio * p.ox * p.oy);
    const seen = new Set();
    const unique = [];
    for (const h of hits) {
      const key = `${h.a}|${h.b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(h);
    }
    return {scope: modal ? 'modal' : 'app', hits: unique.slice(0, 14)};
  });

const shot = async (name) => { await page.waitForTimeout(150); await page.screenshot({path: `${out}/${name}.png`}); };
const results = {};
const scopes = {};
const record = async (name) => { const m = await measure(); results[name] = m.hits; scopes[name] = m.scope; await shot(name); };

await page.goto(url);
await page.waitForFunction(() => !!window.__terra);
  const input = process.env.INPUT || ((W < 900) ? 'touch' : 'keyboard');
  const layout = (process.env.ROTATE === '1' || (H <= 520 && W > H)) ? 'ls' : (W >= 761 ? 'wide' : 'sm');
  await page.evaluate(({top, side, bottom, input, layout, rotate, width, height}) => {
    const r = document.documentElement;
    r.dataset.platform = 'minitool';
    if (rotate) r.dataset.rotate = 'on';
    r.dataset.input = input;
    r.dataset.layout = layout;
    r.style.setProperty('--mt-top-inset', top + 'px');
    r.style.setProperty('--mt-bottom-inset', bottom + 'px');
    r.style.setProperty('--mt-left-inset', side + 'px');
    r.style.setProperty('--mt-right-inset', side + 'px');
    r.style.setProperty('--mt-width', (rotate ? height : width) + 'px');
    r.style.setProperty('--mt-height', (rotate ? width : height) + 'px');
  }, {top: TOP, side: SIDE, bottom: BOTTOM, input, layout, rotate: process.env.ROTATE === '1', width: W, height: H});
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => document.querySelector('#opening-background canvas')?.dataset.loading === 'false', {timeout: 30000}).catch(() => {});
await page.waitForTimeout(1600);
await record('01-opening');

await page.click('#unfold-map').catch(() => {});
await page.waitForTimeout(2000);
await record('02-scene-intro');

await page.evaluate(() => {
  const s = window.__terra.state;
  s.tutorial = {status: 'complete', step: null};
});
await page.click('#skip-opening').catch(() => {});
if (await page.locator('#welcome').isVisible().catch(() => false)) await page.click('#start-button');
await page.waitForSelector('#brief-done', {timeout: 8000}).catch(() => {});
if (await page.locator('#brief-done').isVisible().catch(() => false)) await page.click('#brief-done');
await page.mouse.move(5, 5);
await page.waitForTimeout(2400);
await record('03-workshop');

for (const [name, fn] of [['04-help', 'showHelp'], ['05-upgrades', 'openUpgrades'], ['06-citymap', 'openCityMap'],
  ['07-journey', 'openJourney'], ['08-atlas', 'openAtlas'], ['09-collection', 'openCollection']]) {
  const ok = await page.evaluate((f) => { const t = window.__terra; if (typeof t[f] !== 'function') return false; t[f](); return true; }, fn);
  if (!ok) continue;
  await page.waitForTimeout(1300);
  await record(name);
  await page.evaluate(() => window.__terra.closeTask?.());
  await page.evaluate(() => window.__terra.hideHelp?.());
  await page.waitForTimeout(400);
}

await writeFile(`${out}/overlap.json`, JSON.stringify({viewport: {W, H, TOP, SIDE, BOTTOM}, errors, results}, null, 1));
for (const [k, v] of Object.entries(results)) {
  if (!v.length) { console.log(`${k} [${scopes[k]}]: clean`); continue; }
  console.log(`${k} [${scopes[k]}]:`);
  for (const h of v) console.log(`  ${h.a}  ×  ${h.b}   ${h.ox}×${h.oy} ${h.ratio}%`);
}
console.log('errors', errors.slice(0, 5));
await browser.close();
