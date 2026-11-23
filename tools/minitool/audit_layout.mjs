// 版面审计：在给定视口下走完整流程，逐屏量化「重叠 / 溢出 / 截断 / 面板滚动」，输出 JSON。
// 用法：W=834 H=852 IN_TOP=80 IN_SIDE=0 OUT=qa/minitool/audit node tools/minitool/audit_layout.mjs
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir, writeFile} from 'node:fs/promises';

const url = process.env.GAME_URL || 'http://localhost:5188/';
const W = Number(process.env.W || 834);
const H = Number(process.env.H || 852);
const TOP = Number(process.env.IN_TOP ?? 80);
const SIDE = Number(process.env.IN_SIDE ?? 0);
const BOTTOM = Number(process.env.IN_BOTTOM ?? 21);
const out = process.env.OUT || 'qa/minitool/audit';
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
    const vw = innerWidth;
    const vh = innerHeight;
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        right: Math.round(r.right), bottom: Math.round(r.bottom)};
    };
    const visible = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const inter = (a, b) => {
      const x = Math.min(a.right, b.right) - Math.max(a.x, b.x);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
      return x > 1 && y > 1 ? {w: Math.round(x), h: Math.round(y)} : null;
    };

    const hudSel = ['#app > .topbar', '#app > .commissions', '#app > main#world-wrap', '#app > .bottom-bar',
      '#touch-controls', '#touch-interact', '#reset-view', '#interaction'];
    const hud = {};
    for (const sel of hudSel) {
      const el = document.querySelector(sel);
      if (el && visible(el)) hud[sel] = rect(el);
    }
    const overlaps = [];
    const keys = Object.keys(hud);
    for (let i = 0; i < keys.length; i += 1) {
      for (let j = i + 1; j < keys.length; j += 1) {
        const hit = inter(hud[keys[i]], hud[keys[j]]);
        if (hit) overlaps.push({a: keys[i], b: keys[j], ...hit});
      }
    }

    const offscreen = [];
    const truncated = [];
    const tiny = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === 'canvas' && el.id === 'world') continue;
      const r = rect(el);
      if (r.w > vw * 0.6 && r.h > vh * 0.6) continue;
      if (r.right > vw + 2 || r.bottom > vh + 2 || r.x < -2 || r.y < -2) {
        offscreen.push({sel: el.className ? `${tag}.${String(el.className).split(' ')[0]}` : tag, ...r});
      }
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (hasText) {
        let p = el.parentElement;
        let clipped = false;
        for (let i = 0; i < 6 && p; i += 1, p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { clipped = true; break; }
          if (cs.display === 'flex' && cs.flexWrap === 'wrap') { clipped = true; break; }
        }
        if (clipped && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
          truncated.push({sel: el.className ? `${tag}.${String(el.className).split(' ')[0]}` : tag,
            text: el.textContent.trim().slice(0, 28), scrollW: el.scrollWidth, clientW: el.clientWidth});
        }
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 11) tiny.push({sel: el.className ? `${tag}.${String(el.className).split(' ')[0]}` : tag, fs});
      }
    }

    const panels = [...document.querySelectorAll('.task-panel, .help-panel, .atlas-panel, .journey-panel, .city-map-panel')]
      .filter(visible)
      .map((el) => ({cls: String(el.className).split(' ')[0], ...rect(el), scrollH: el.scrollHeight, clientH: el.clientHeight,
        clippedY: el.scrollHeight > el.clientHeight + 2}));

    return {vw, vh, hud, overlaps, offscreen: offscreen.slice(0, 12), truncated: truncated.slice(0, 12),
      tiny: tiny.slice(0, 12), panels};
  });

const shot = async (name) => { await page.waitForTimeout(150); await page.screenshot({path: `${out}/${name}.png`}); };
const results = {};
const record = async (name) => { results[name] = await measure(); await shot(name); };

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
await page.waitForFunction(() => document.querySelector('#opening-background canvas')?.dataset.loading === 'false');
await page.waitForTimeout(1600);
await record('01-opening');

await page.click('#unfold-map');
await page.waitForFunction(() => document.querySelector('#opening-scene-carousel canvas')?.dataset.loading === 'false');
await page.waitForTimeout(1500);
await record('02-scene-intro');

const settle = async () => {
  await page.click('#skip-opening').catch(() => {});
  if (await page.locator('#welcome').isVisible().catch(() => false)) await page.click('#start-button');
  await page.waitForSelector('#brief-done', {timeout: 8000}).catch(() => {});
  if (await page.locator('#brief-done').isVisible().catch(() => false)) await page.click('#brief-done');
  await page.evaluate(() => { window.__terra.state.tutorial = {status: 'complete', step: null}; });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(2400);
};
await settle();
await record('03-workshop');

await page.evaluate(() => window.__terra.showHelp());
await page.waitForTimeout(600);
await record('04-help');
await page.evaluate(() => window.__terra.hideHelp());
await page.waitForTimeout(300);
await page.evaluate(() => window.__terra.openUpgrades());
await page.waitForTimeout(1000);
await record('05-upgrades');
await page.evaluate(() => window.__terra.openCityMap());
await page.waitForTimeout(1400);
await record('06-citymap');
await page.evaluate(() => window.__terra.openJourney());
await page.waitForTimeout(1000);
await record('07-journey');
await page.evaluate(() => window.__terra.openAtlas?.());
await page.waitForTimeout(800);
if (await page.locator('.atlas-panel').isVisible().catch(() => false)) await record('08-atlas');
await page.evaluate(() => window.__terra.closeTask?.());
await page.waitForTimeout(300);

const summary = Object.fromEntries(Object.entries(results).map(([k, v]) => [k, {
  overlaps: v.overlaps.map((o) => `${o.a}×${o.b} ${o.w}×${o.h}`),
  offscreen: v.offscreen.length,
  truncated: v.truncated.map((t) => `${t.sel} "${t.text}" ${t.scrollW}>${t.clientW}`),
  tiny: v.tiny.length,
  panels: v.panels.map((p) => `${p.cls} ${p.w}×${p.h} scroll ${p.scrollH}/${p.clientH}`)
}]));
await writeFile(`${out}/audit.json`, JSON.stringify({viewport: {W, H, TOP, SIDE, BOTTOM}, errors, results, summary}, null, 1));
console.log(JSON.stringify(summary, null, 1));
console.log('errors', errors.slice(0, 6));
await browser.close();
