// HUD 卡片重叠专项：列出关键 HUD 元素矩形并两两求重叠，含游戏内状态（携带卡/提示条/交互卡/站牌）。
// 用法：W=393 H=852 IN_TOP=80 node tools/minitool/audit_hud.mjs
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir, writeFile} from 'node:fs/promises';
const W = Number(process.env.W || 393), H = Number(process.env.H || 852);
const TOP = Number(process.env.IN_TOP ?? 80), SIDE = Number(process.env.IN_SIDE ?? 0), BOTTOM = Number(process.env.IN_BOTTOM ?? 21);
const out = process.env.OUT || 'qa/minitool/hud'; await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: W, height: H}, deviceScaleFactor: Number(process.env.DPR || 1)});
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || 'http://localhost:5188/');
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
await page.click('#skip-opening').catch(() => {});
if (await page.locator('#welcome').isVisible().catch(() => false)) await page.click('#start-button');
await page.waitForSelector('#brief-done', {timeout: 8000}).catch(() => {});
if (await page.locator('#brief-done').isVisible().catch(() => false)) await page.click('#brief-done');
await page.evaluate(() => { window.__terra.state.tutorial = {status: 'complete', step: null}; });
await page.waitForTimeout(2200);
const dump = await page.evaluate(() => {
  const sel = ['#app > .topbar', '.brand', '.day-pill', '.top-actions', '.wallet', '#upgrades-button', '#map-button', '#sound-button', '#lang-toggle', '#help-button',
    '#app > .commissions', '.commissions .scene-heading', '.commissions .reference-card', '.commissions .preset-path', '.commissions #open-journey', '.commissions .collection-link',
    '#guide-card', '#carrying', '#toast', '#interaction', '#reset-view', '#touch-controls', '#touch-interact', '#app > .bottom-bar', '.bottom-bar .controls', '.prototype-tag'];
    const clip = (el) => { let x0 = -1e9, y0 = -1e9, x1 = 1e9, y1 = 1e9;
      for (let n = el.parentElement; n; n = n.parentElement) { const cs = getComputedStyle(n);
        if (cs.overflow === 'visible' && cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const r = n.getBoundingClientRect(); x0 = Math.max(x0, r.left); y0 = Math.max(y0, r.top); x1 = Math.min(x1, r.right); y1 = Math.min(y1, r.bottom); }
      const r = el.getBoundingClientRect(); const l = Math.max(r.left, x0), t = Math.max(r.top, y0), rr = Math.min(r.right, x1), bb = Math.min(r.bottom, y1);
      return {x: l, y: t, w: Math.max(0, rr - l), h: Math.max(0, bb - t)}; };
  const items = [];
  for (const s of sel) for (const el of document.querySelectorAll(s)) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const r = clip(el); if (!r.w || !r.h) continue;
    items.push({el, s: `${s}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}${el.id ? '#' + el.id : ''}`,
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h)});
  }
  const labels = [...document.querySelectorAll('.station-label')].filter((el) => getComputedStyle(el).opacity !== '0' && getComputedStyle(el).visibility !== 'hidden')
    .map((el) => { const r = clip(el); return {el, s: 'station-label ' + el.textContent.trim().slice(0, 12), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h)}; });
  const all = [...items, ...labels];
  const hits = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j];
    if (a.s === b.s) continue;
    if (a.el && b.el && (a.el.contains(b.el) || b.el.contains(a.el))) continue;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 2 && oy > 2) hits.push(`${a.s} × ${b.s}  ${Math.round(ox)}×${Math.round(oy)}`);
  }
  return {items: all, hits};
});
await page.screenshot({path: `${out}/workshop-${W}x${H}.png`});
await writeFile(`${out}/hud-${W}x${H}.json`, JSON.stringify({W, H, ...dump, errors}, null, 1));
console.log('--- rects ---'); for (const it of dump.items) console.log(` ${it.s.padEnd(46)} [${it.x},${it.y},${it.w},${it.h}]`);
console.log('--- overlaps ---'); for (const h of dump.hits) console.log(' ' + h); if (!dump.hits.length) console.log(' none');
console.log('errors', errors.slice(0, 4));
await browser.close();
