// Dump HUD boxes / overlaps / <img> state in the rotated phone view.
// container: node tools/minitool/debug_rotated_hud.mjs http://127.0.0.1:3214/
// dev      : node tools/minitool/debug_rotated_hud.mjs dev
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../../qa/pw/node_modules/playwright-core/index.mjs';

const DEV = process.argv[2] === 'dev';
const START = DEV ? 'http://localhost:5188/' : (process.argv[2] || 'http://127.0.0.1:3214/');
const OUT = 'qa/minitool/debug';
const TRANSPARENT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAABwCAYAAAA5EO/pAAAAHElEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAOAJwAABb0k1BQAAAABJRU5ErkJggg==';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: DEV ? { width: 393, height: 852 } : { width: 900, height: 1000 } });
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(`console: ${m.text()}`); });
page.on('requestfailed', r => logs.push(`failed: ${r.url()}`));
page.on('response', r => { if (r.status() >= 400) logs.push(`http ${r.status()} ${r.url()}`); });

await page.goto(START, { waitUntil: 'load' });
await page.waitForTimeout(2500);

async function frame() {
  if (DEV) return page.mainFrame();
  for (const f of page.frames()) if (f.url().includes('/app/')) return f;
  return null;
}

const target = await frame();
if (!target) throw new Error('no app frame');

if (DEV) {
  await target.evaluate(() => { document.documentElement.dataset.platform = 'minitool'; });
  await target.evaluate(() => {
    const t = window.__terra;
    const skip = document.querySelector('#skip-opening');
    if (skip && skip.offsetParent) skip.click();
    const map = document.querySelector('#unfold-map');
    if (map && map.offsetParent) map.click();
    const start = document.querySelector('#start-button');
    if (start && start.offsetParent) start.click();
    const brief = document.querySelector('#brief-done');
    if (brief && brief.offsetParent) brief.click();
    return Boolean(t);
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const t = window.__terra;
    document.documentElement.dataset.input = 'touch';
    const app = document.querySelector('#app');
    if (app) app.dataset.input = 'touch';
    if (t) t.toggleRotate(true);
    const card = document.querySelector('#carrying');
    if (card) {
      card.classList.remove('hidden');
      const img = card.querySelector('img');
      if (img) img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAABwCAYAAAA5EO/pAAAAHElEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAOAJwAABb0k1BQAAAABJRU5ErkJggg==';
      const name = document.querySelector('#carry-name');
      if (name) name.textContent = '一抹青花罐';
    }
  });
} else {
  for (let i = 0; i < 12; i++) {
    const f = await frame();
    const done = await f.evaluate(() => {
      const w = document.querySelector('#world');
      const brief = document.querySelector('#brief-done');
      if (brief && brief.offsetParent) { brief.click(); return false; }
      const start = document.querySelector('#start-button');
      const skip = document.querySelector('#skip-opening');
      if (start && start.offsetParent) { start.click(); return false; }
      if (skip && skip.offsetParent) { skip.click(); return false; }
      const map = document.querySelector('#unfold-map');
      if (map && map.offsetParent) { map.click(); return false; }
      return Boolean(w && w.clientWidth > 100 && w.dataset.loading === 'false');
    });
    if (done) break;
    await page.waitForTimeout(700);
  }
  await f_evaluate_rotate();
  const f0 = await frame();
  await f0.evaluate(() => {
    const card = document.querySelector('#carrying');
    if (!card) return;
    card.classList.remove('hidden');
    const img = card.querySelector('img');
    const ref = document.querySelector('.reference-card > img');
    if (img && ref && ref.src) img.src = ref.src;
    const name = document.querySelector('#carry-name');
    if (name) name.textContent = '一抹青花罐';
  });
}

async function f_evaluate_rotate() {
  const f = await frame();
  await f.evaluate(() => {
    const rot = document.querySelector('#rotate-button');
    if (rot && document.documentElement.dataset.rotate !== 'on') rot.click();
  });
}
await page.waitForTimeout(1500);

const f2 = await frame();
const result = await f2.evaluate(() => {
  const root = document.documentElement;
  const rect = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const HUD = {
    topbar: document.querySelector('.topbar'),
    brand: document.querySelector('.brand'),
    actions: document.querySelector('.top-actions'),
    commissions: document.querySelector('#app > .commissions'),
    referenceCard: document.querySelector('.reference-card'),
    referenceImg: document.querySelector('.reference-card > img'),
    decalGoal: document.querySelector('.decal-goal'),
    guide: document.querySelector('#guide-card'),
    carrying: document.querySelector('#carrying'),
    carryArt: document.querySelector('#carry-art'),
    carryImg: document.querySelector('#carry-art img'),
    interaction: document.querySelector('#interaction'),
    resetView: document.querySelector('#reset-view'),
    joystick: document.querySelector('#joystick'),
    interact: document.querySelector('#touch-interact'),
    bottomBar: document.querySelector('.bottom-bar')
  };
  const boxes = {};
  for (const [k, el] of Object.entries(HUD)) boxes[k] = rect(el);

  const pairs = [];
  const keys = Object.keys(boxes).filter(k => boxes[k]);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = boxes[keys[i]], b = boxes[keys[j]];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1 && oy > 1) pairs.push({ a: keys[i], b: keys[j], ox, oy });
    }
  }

  const imgs = [...document.images].map(img => {
    const r = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    return {
      src: (img.getAttribute('src') || '').slice(0, 30),
      kind: (img.getAttribute('src') || '').startsWith('data:') ? 'data' : 'file',
      natural: [img.naturalWidth, img.naturalHeight],
      display: cs.display,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    };
  });

  return {
    dataset: { ...root.dataset },
    vars: {
      top: getComputedStyle(root).getPropertyValue('--mt-top-inset').trim(),
      bottom: getComputedStyle(root).getPropertyValue('--mt-bottom-inset').trim(),
      left: getComputedStyle(root).getPropertyValue('--mt-left-inset').trim(),
      right: getComputedStyle(root).getPropertyValue('--mt-right-inset').trim()
    },
    viewport: { w: innerWidth, h: innerHeight },
    app: (() => { const a = document.querySelector('#app'); const r = a.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), transform: getComputedStyle(a).transform }; })(),
    boxes,
    overlaps: pairs,
    imgs,
    scroll: (() => { const c = document.querySelector('#app > .commissions'); return c ? { scrollH: c.scrollHeight, clientH: c.clientHeight, clipped: c.scrollHeight > c.clientHeight + 1 } : null; })(),
    world: (() => { const c = document.querySelector('#world'); return { attr: [c.width, c.height], client: [c.clientWidth, c.clientHeight] }; })()
  };
});

fs.mkdirSync(OUT, { recursive: true });
const name = DEV ? 'rotated-hud-dev.json' : 'rotated-hud.json';
fs.writeFileSync(path.join(OUT, name), JSON.stringify({ ...result, logs }, null, 2));
await page.screenshot({ path: path.join(OUT, DEV ? 'rotated-hud-dev.png' : 'rotated-hud.png') });
console.log(JSON.stringify({ dataset: result.dataset, vars: result.vars, app: result.app, world: result.world, boxes: result.boxes, overlaps: result.overlaps }, null, 2));
console.log('imgs:', JSON.stringify(result.imgs.filter(i => i.display !== 'none'), null, 2));
console.log('logs:', JSON.stringify(logs.slice(0, 6)));
await browser.close();
