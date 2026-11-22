// 开屏页 3D 瓷碗是否真的画出来了：截图 + 裁剪矩形，交给 check_hero_canvas.py 统计像素多样性。
// 用法：node tools/minitool/check_hero_canvas.mjs [devUrl] [outDir]
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir, writeFile} from 'node:fs/promises';

const URL = process.argv[2] || 'http://localhost:5188/';
const OUT = process.argv[3] || 'qa/minitool/hero';
await mkdir(OUT, {recursive: true});

const browser = await chromium.launch({channel: 'msedge', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 900, height: 1400}, deviceScaleFactor: 2});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(URL);
await page.waitForFunction(() => !!window.__terra, null, {timeout: 30000});
await page.waitForTimeout(2500);

const report = {};
async function shot(tag) {
  await page.waitForTimeout(1200);
  const rects = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        display: cs.display, visibility: cs.visibility};
    };
    const canvas = document.querySelector('.prologue-porcelain canvas');
    return {
      stage: document.querySelector('#opening-screen, .opening-screen')?.dataset?.openingStage || null,
      rotate: document.documentElement.dataset.rotate || 'off',
      box: pick('.prologue-porcelain'),
      canvas: pick('.prologue-porcelain canvas'),
      canvasAttr: canvas ? {w: canvas.width, h: canvas.height, cw: canvas.clientWidth, ch: canvas.clientHeight} : null,
    };
  });
  const file = `${OUT}/${tag}.png`;
  await page.screenshot({path: file});
  report[tag] = {...rects, file};
}

await shot('portrait');
await page.evaluate(() => {
  document.documentElement.dataset.platform = 'minitool';
  document.documentElement.dataset.input = 'touch';
  window.__terra.toggleRotate(true);
});
await shot('rotated');

await writeFile(`${OUT}/hero.json`, JSON.stringify({report, errors}, null, 2), 'utf8');
for (const [k, v] of Object.entries(report)) {
  console.log(k, 'rotate', v.rotate, 'box', v.box && `${v.box.w}x${v.box.h}@${v.box.x},${v.box.y}`,
    'canvas', v.canvas && `${v.canvas.w}x${v.canvas.h} disp=${v.canvas.display}`,
    'attr', v.canvasAttr && `${v.canvasAttr.w}x${v.canvasAttr.h} client ${v.canvasAttr.cw}x${v.canvasAttr.ch}`);
}
console.log('errors', errors.slice(0, 5));
await browser.close();
