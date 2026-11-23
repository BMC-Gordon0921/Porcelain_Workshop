// 调试：在小工具容器里点一次「跳过介绍」，把点击结果、命中的元素、开屏阶段全部打出来。
// 用法：node tools/minitool/debug_click.mjs <workbench-url>
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';

const url = process.argv[2];
if (!url) throw new Error('usage: node tools/minitool/debug_click.mjs <workbench-url>');

const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 430, height: 932}, deviceScaleFactor: 2});
page.on('pageerror', error => console.log('PAGEERROR:', error.message));
page.on('console', message => {
  if (message.type() === 'error') console.log('CONSOLE:', message.text());
});
await page.goto(url, {waitUntil: 'domcontentloaded'});
let frame = null;
for (let attempt = 0; attempt < 120 && !frame; attempt += 1) {
  frame = page.frames().find((candidate) => candidate.url().includes('/app/'));
  if (!frame) await page.waitForTimeout(250);
}
await frame.waitForSelector('#skip-opening', {timeout: 30000});
await page.waitForTimeout(1500);

const box = await frame.locator('#skip-opening').boundingBox();
console.log('skip button box:', box);
if (box) {
  const hit = await frame.evaluate(({x, y}) => {
    const node = document.elementFromPoint(x, y);
    const path = [];
    for (let current = node; current && path.length < 6; current = current.parentElement) {
      path.push(`${current.tagName.toLowerCase()}${current.id ? '#' + current.id : ''}${current.className && typeof current.className === 'string' ? '.' + current.className.trim().split(/\s+/).join('.') : ''}`);
    }
    return path;
  }, {x: box.x + box.width / 2, y: box.y + box.height / 2});
  console.log('elementFromPoint path:', hit);
}

const before = await frame.evaluate(() => ({stage: document.getElementById('welcome').dataset.openingStage, cls: document.getElementById('welcome').className}));
console.log('before:', before);

try {
  await frame.locator('#skip-opening').click({timeout: 8000});
  console.log('click: ok');
} catch (error) {
  console.log('click failed:', error.message.split('\n')[0]);
}

await page.waitForTimeout(1200);
const after = await frame.evaluate(() => ({stage: document.getElementById('welcome').dataset.openingStage, cls: document.getElementById('welcome').className}));
console.log('after:', after);

await browser.close();
