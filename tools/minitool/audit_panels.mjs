// 面板内部布局审计：打开各面板，量关键子块矩形与相互重叠，找「被 sticky 遮住 / 溢出面板」的问题。
// 用法：W=834 H=852 IN_TOP=80 IN_SIDE=0 node tools/minitool/audit_panels.mjs
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';

const W = Number(process.env.W || 834);
const H = Number(process.env.H || 852);
const TOP = Number(process.env.IN_TOP ?? 80);
const SIDE = Number(process.env.IN_SIDE ?? 0);
const url = process.env.GAME_URL || 'http://localhost:5188/';

const browser = await chromium.launch({channel: 'msedge', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: W, height: H}, deviceScaleFactor: 2});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url);
await page.waitForFunction(() => !!window.__terra);
await page.evaluate(({top, side}) => {
  const r = document.documentElement;
  r.dataset.platform = 'minitool';
  r.style.setProperty('--mt-top-inset', `${top}px`);
  r.style.setProperty('--mt-bottom-inset', '21px');
  r.style.setProperty('--mt-left-inset', `${side}px`);
  r.style.setProperty('--mt-right-inset', `${side}px`);
}, {top: TOP, side: SIDE});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);

const dump = (label) =>
  page.evaluate((label) => {
    const rect = (el) => { const r = el.getBoundingClientRect();
      return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        bottom: Math.round(r.bottom), right: Math.round(r.right)}; };
    const vis = (el) => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
    const panels = [...document.querySelectorAll('.overlay:not(.hidden) > *')].filter(vis);
    const out = {label, vw: innerWidth, vh: innerHeight, panels: panels.map((p) => ({cls: p.className, ...rect(p),
      scrollH: p.scrollHeight, clientH: p.clientHeight, scrollTop: p.scrollTop, overflowY: getComputedStyle(p).overflowY}))};
    const parts = [];
    for (const sel of ['.upgrade-detail', '.upgrade-detail canvas', '.workbench-grid', '.workbench-card',
      '.upgrade-confirmation', '.task-header', '.task-footer', '.task-artboard', '.kiln-view', '.serve-art',
      '.journey-layout', '.bowl-stage canvas', '.decal-details', '.atlas-layout', '.atlas-map', '.atlas-detail',
      '.collection-grid', '.reward-table', '.earnings-banner', '.city-map-panel .map-frame', '.city-map-panel canvas']) {
      const el = document.querySelector(sel);
      if (el && vis(el)) parts.push({sel, ...rect(el), pos: getComputedStyle(el).position});
    }
    out.parts = parts;
    const panel = panels[0];
    if (panel) {
      const pr = panel.getBoundingClientRect();
      out.covered = parts.filter((p) => {
        const sib = document.querySelector(p.sel);
        if (!sib || sib.contains(panel) || panel.contains(sib)) return false;
        return true;
      }).filter((p) => p.y < pr.y - 1 || p.bottom > pr.bottom + 1);
    }
    return out;
  }, label);

const open = async (fn, wait = 900) => { await page.evaluate(fn); await page.waitForTimeout(wait); };

await open(() => window.__terra.showHelp());
console.log(JSON.stringify(await dump('help'), null, 1));
await open(() => window.__terra.hideHelp(), 400);

await open(() => window.__terra.state.tutorial = {status: 'complete', step: null}, 100);
await page.click('#skip-opening').catch(() => {});
if (await page.locator('#welcome').isVisible().catch(() => false)) await page.click('#start-button');
await page.waitForSelector('#brief-done', {timeout: 8000}).catch(() => {});
if (await page.locator('#brief-done').isVisible().catch(() => false)) await page.click('#brief-done');
await page.waitForTimeout(1500);

await open(() => window.__terra.openUpgrades(), 1100);
console.log(JSON.stringify(await dump('upgrades'), null, 1));
await open(() => window.__terra.openJourney(), 1100);
console.log(JSON.stringify(await dump('journey'), null, 1));
await open(() => window.__terra.openCityMap(), 1400);
console.log(JSON.stringify(await dump('citymap'), null, 1));
console.log('errors', errors.slice(0, 5));
await browser.close();
