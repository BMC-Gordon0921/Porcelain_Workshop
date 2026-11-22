// 升级面板可否完整看到 3D 预览：在 scrollTop=0 与 scrollTop=max 两种状态下量 preview 与 sticky 确认条是否相交。
// 用法：W=834 H=852 IN_TOP=80 IN_SIDE=0 node tools/minitool/check_upgrade.mjs
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';

const W = Number(process.env.W || 834);
const H = Number(process.env.H || 852);
const TOP = Number(process.env.IN_TOP ?? 80);
const SIDE = Number(process.env.IN_SIDE ?? 0);
const url = process.env.GAME_URL || 'http://localhost:5188/';

const browser = await chromium.launch({channel: 'msedge', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: W, height: H}});
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
await page.waitForTimeout(2200);
await page.evaluate(() => { window.__terra.state.tutorial = {status: 'complete', step: null}; });
await page.click('#skip-opening').catch(() => {});
if (await page.locator('#welcome').isVisible().catch(() => false)) await page.click('#start-button');
await page.waitForSelector('#brief-done', {timeout: 8000}).catch(() => {});
if (await page.locator('#brief-done').isVisible().catch(() => false)) await page.click('#brief-done');
await page.waitForTimeout(1200);
await page.evaluate(() => window.__terra.openUpgrades());
await page.waitForTimeout(1200);

const probe = () => page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return {y: Math.round(b.y), bottom: Math.round(b.bottom), h: Math.round(b.height), w: Math.round(b.width)}; };
  const panel = q('.overlay:not(.hidden) > .task-panel');
  const canvas = q('.upgrade-detail canvas');
  const sticky = q('.upgrade-confirmation');
  const detail = q('.upgrade-detail');
  return {panel: r(panel), scrollH: panel?.scrollHeight, clientH: panel?.clientHeight, scrollTop: panel?.scrollTop,
    detail: r(detail), canvas: r(canvas), sticky: r(sticky),
    stickyPos: sticky ? getComputedStyle(sticky).position : null,
    canvasH: canvas ? getComputedStyle(canvas).height : null,
    canvasAttr: canvas ? [canvas.width, canvas.height] : null};
});

const before = await probe();
await page.evaluate(() => { const p = document.querySelector('.overlay:not(.hidden) > .task-panel'); p.scrollTop = p.scrollHeight; });
await page.waitForTimeout(400);
const after = await probe();
const hidden = (s) => s.canvas && s.sticky && s.canvas.bottom > s.sticky.y && s.canvas.y < s.sticky.bottom;
console.log(JSON.stringify({viewport: {W, H, TOP, SIDE}, before, after,
  canvasCoveredAtTop: hidden(before), canvasCoveredAtBottom: hidden(after)}, null, 1));
await browser.close();
