// 版面量测：在移动端视口打开指定面板，dump 关键元素矩形与 WebGL 状态。
// 用法：node tools/minitool/measure_panel.mjs [upgrades|citymap|help|brief]
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';

const url = process.env.GAME_URL || 'http://localhost:5188/';
const target = process.argv[2] || 'upgrades';

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const context = await browser.newContext({viewport: {width: 393, height: 852}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
const page = await context.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto(url);
await page.waitForFunction(() => !!window.__terra);
await page.evaluate(() => {
  const root = document.documentElement;
  root.dataset.platform = 'minitool';
  root.style.setProperty('--mt-top-inset', '80px');
  root.style.setProperty('--mt-bottom-inset', '21px');
});
await page.click('#unfold-map');
await page.waitForFunction(() => document.querySelector('#opening-scene-carousel canvas')?.dataset.loading === 'false');
await page.click('#skip-opening');
if (await page.locator('#welcome').isVisible()) await page.click('#start-button');
await page.waitForSelector('#brief-done');
if (await page.locator('#brief-done').isVisible()) await page.click('#brief-done');
await page.evaluate(() => {
  window.dispatchEvent(new Event('focus'));
  window.__terra.state.tutorial = {status: 'complete', step: null};
});
await page.waitForTimeout(1500);

if (target === 'upgrades') await page.evaluate(() => window.__terra.openUpgrades());
if (target === 'citymap') await page.evaluate(() => window.__terra.openCityMap());
if (target === 'help') await page.evaluate(() => window.__terra.showHelp());
if (target === 'brief') await page.evaluate(() => window.__terra.openBrief?.());
await page.waitForTimeout(1200);

const report = await page.evaluate(() => {
  const rect = sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {sel, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), display: cs.display, position: cs.position, height: cs.height, maxHeight: cs.maxHeight, overflow: cs.overflowY};
  };
  const canvas = document.querySelector('.upgrade-detail canvas');
  let gl = 'none';
  if (canvas) {
    const c = canvas.getContext('webgl2') || canvas.getContext('webgl');
    gl = c ? (c instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl1') : 'null';
  }
  return {
    panel: rect('.task-panel') || rect('.overlay > *'),
    detail: rect('.upgrade-detail'),
    canvasRect: rect('.upgrade-detail canvas'),
    canvasAttrs: canvas ? {attrW: canvas.width, attrH: canvas.height, clientW: canvas.clientWidth, clientH: canvas.clientHeight, dataset: {...canvas.dataset}} : null,
    canvasGl: gl,
    grid: rect('.workbench-grid'),
    confirm: rect('.upgrade-confirmation'),
    overlayRect: rect('.overlay'),
    bodyClasses: document.querySelector('.overlay')?.className || null
  };
});
console.log(JSON.stringify(report, null, 2));
await browser.close();
