// 旋屏下各面板画布的缓冲尺寸体检（dev server + window.__terra 驱动）。
// 目的：确认用的是 clientWidth/clientHeight 而不是被旋转包围盒污染的 getBoundingClientRect。
// 用法：node tools/minitool/debug_canvas_panels.mjs [devUrl]
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';

const URL = process.argv[2] || 'http://localhost:5188/';
const browser = await chromium.launch({channel: 'msedge', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 900, height: 1400}, deviceScaleFactor: 2});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(URL);
await page.waitForFunction(() => !!window.__terra, null, {timeout: 30000});
await page.waitForTimeout(1500);

const measure = (label) => page.evaluate((tag) => {
  const dpr = devicePixelRatio || 1;
  const list = [...document.querySelectorAll('canvas')].map((c) => {
    const wantW = Math.round(c.clientWidth * dpr), wantH = Math.round(c.clientHeight * dpr);
    return {id: c.id || String(c.className).split(' ')[0] || c.parentElement?.className || 'canvas',
      attr: `${c.width}x${c.height}`, want: `${wantW}x${wantH}`,
      // 判定标准是「不拉伸」：缓冲宽高比必须等于布局宽高比（旋屏包围盒会把两者互换）。
      // 像素比可以是 1 / 1.5 / 2，所以不要求等于 dpr。
      ok: c.clientWidth === 0 || c.clientHeight === 0 ||
        Math.abs(c.width / c.height - c.clientWidth / c.clientHeight) < 0.02};
  });
  return {tag, rotate: document.documentElement.dataset.rotate || 'off', list};
}, label);

const out = [];
// 先把页面伪装成小工具的触屏 + 已旋屏状态（dev 里没有容器外壳，let 一下即可）
await page.evaluate(() => {
  const r = document.documentElement;
  r.dataset.platform = 'minitool';
  r.dataset.input = 'touch';
  window.__terra.toggleRotate(true);
});
await page.waitForTimeout(900);
out.push(await measure('rotated:home'));

for (const [name, open] of [['upgrades', 'openUpgrades'], ['journey', 'openJourney']]) {
  await page.evaluate((fn) => { window.__terra[fn](); }, open).catch(() => {});
  await page.waitForTimeout(1400);
  out.push(await measure('rotated:' + name));
  await page.evaluate(() => window.__terra.closeTask());
  await page.waitForTimeout(500);
}

for (const row of out) {
  const bad = row.list.filter((c) => !c.ok);
  console.log(`${row.tag} rotate=${row.rotate} canvases=${row.list.length}`,
    bad.length ? 'BAD ' + bad.map((c) => `${c.id} attr ${c.attr} want ${c.want}`).join(' | ') : 'all match');
}
console.log('errors', errors.slice(0, 6));
await browser.close();
