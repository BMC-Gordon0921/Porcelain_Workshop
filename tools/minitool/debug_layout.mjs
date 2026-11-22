import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
const url = process.argv[2];
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 430, height: 932}, deviceScaleFactor: 2});
await page.goto(url, {waitUntil: 'domcontentloaded'});
let frame = null;
for (let i = 0; i < 120 && !frame; i += 1) { frame = page.frames().find(f => f.url().includes('/app/')); if (!frame) await page.waitForTimeout(250); }
await frame.waitForSelector('#skip-opening', {timeout: 30000});
await page.waitForTimeout(1500);
const out = await frame.evaluate(() => {
  const pick = (sel) => {
    const node = document.querySelector(sel);
    if (!node) return null;
    const r = node.getBoundingClientRect();
    const cs = getComputedStyle(node);
    return {sel, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], position: cs.position, zIndex: cs.zIndex, overflow: cs.overflow, scrollTop: node.scrollTop, display: cs.display};
  };
  return {
    inner: [window.innerWidth, window.innerHeight],
    scroll: [window.scrollX, window.scrollY],
    vars: {top: getComputedStyle(document.documentElement).getPropertyValue('--mt-top-inset'), bottom: getComputedStyle(document.documentElement).getPropertyValue('--mt-bottom-inset')},
    platform: document.documentElement.dataset.platform,
    nodes: ['html', '#app', '#welcome', '.opening-header', '.opening-skip', '.city-prologue', '#world-wrap', '.topbar'].map(pick)
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
