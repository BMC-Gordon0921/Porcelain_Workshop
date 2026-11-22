import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({channel: 'msedge', headless: true});
const page = await browser.newPage({viewport: {width: 852, height: 393}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
await page.goto('http://localhost:5188/', {waitUntil: 'load'});
await page.evaluate(() => {
  const root = document.documentElement;
  root.dataset.platform = 'minitool';
  root.style.setProperty('--mt-top-inset', '0px');
  root.style.setProperty('--mt-bottom-inset', '21px');
  root.style.setProperty('--mt-left-inset', '44px');
  root.style.setProperty('--mt-right-inset', '44px');
});
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {sel, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), display: getComputedStyle(el).display};
  };
  return {
    screen: pick('.opening-screen'),
    prologue: pick('.city-prologue'),
    copy: pick('.prologue-copy'),
    porcelain: pick('.prologue-porcelain'),
    img: pick('.prologue-porcelain > img'),
    halo: pick('.porcelain-halo'),
    header: pick('.opening-header'),
    beats: pick('.prologue-beats'),
    bg: pick('.opening-background'),
    scroll: {h: document.documentElement.scrollHeight, clientH: document.documentElement.clientHeight}
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
