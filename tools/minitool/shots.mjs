// 在小工具容器模拟器里给各个阶段拍版面截图，用于排查移动端排版问题。
// 用法：node tools/minitool/shots.mjs <workbench-url> [outDir]
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';

const url = process.argv[2];
const outDir = process.argv[3] || 'qa/minitool/shots';
if (!url) throw new Error('usage: node tools/minitool/shots.mjs <workbench-url> [outDir]');
await mkdir(outDir, {recursive: true});

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({viewport: {width: 1100, height: 1200}, deviceScaleFactor: 1});
const errors = [];
page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));

await page.goto(url, {waitUntil: 'domcontentloaded'});
let frame = null;
for (let attempt = 0; attempt < 120 && !frame; attempt += 1) {
  frame = page.frames().find(candidate => candidate.url().includes('/app/'));
  if (!frame) await page.waitForTimeout(250);
}
if (!frame) throw new Error('未找到小工具运行帧（iframe /app/）');

const report = {workbench: url, buttons: [], shots: [], errors};

// 工作台里的按钮文案（用于确认设备/容器形态切换器）
report.buttons = await page.evaluate(() =>
  [...document.querySelectorAll('button')].map(node => (node.innerText || '').trim()).filter(Boolean).slice(0, 40)
);

async function shot(name) {
  const path = join(outDir, `${name}.png`);
  await page.screenshot({path});
  report.shots.push(name);
}

async function appShot(name) {
  const path = join(outDir, `${name}.png`);
  await frame.locator('body').screenshot({path}).catch(async () => {
    await page.screenshot({path});
  });
  report.shots.push(name);
}

await frame.waitForFunction(() => !!document.getElementById('app'), null, {timeout: 30000});
await page.waitForTimeout(2500);
await shot('00-workbench-full');

// 1. 开屏（intro）与地图阶段
await page.waitForTimeout(1500);
await appShot('01-opening');

await frame.evaluate(() => document.getElementById('skip-opening')?.click());
await page.waitForTimeout(1200);
await appShot('02-opening-map');

// 2. 进入工坊：第一次点击只展开，需要循环点到开屏页真正隐藏
for (let attempt = 0; attempt < 10; attempt += 1) {
  const visible = await frame.locator('#welcome').isVisible().catch(() => false);
  if (!visible) break;
  await frame.evaluate(() => {
    const brief = document.getElementById('brief-done');
    if (brief && brief.offsetParent) return brief.click();
    const welcome = document.getElementById('welcome');
    if (welcome?.dataset.openingStage === 'map') {
      const start = document.getElementById('start-button');
      if (start && !start.disabled) start.click();
      return;
    }
    document.getElementById('skip-opening')?.click();
  });
  await page.waitForTimeout(1000);
  if (attempt === 0) await appShot('03-brief');
}
await page.waitForTimeout(1200);
await appShot('04-hud');

// 3. 三个覆盖面板
await frame.evaluate(() => document.getElementById('help-button')?.click());
await page.waitForTimeout(700);
await appShot('05-help');
await frame.evaluate(() => document.getElementById('help-done')?.click());
await page.waitForTimeout(500);

await frame.evaluate(() => document.getElementById('upgrades-button')?.click());
await page.waitForTimeout(900);
await appShot('06-upgrades');
await frame.evaluate(() => document.getElementById('close-task')?.click());
await page.waitForTimeout(500);

await frame.evaluate(() => document.getElementById('map-button')?.click());
await page.waitForTimeout(900);
await appShot('07-citymap');
await frame.evaluate(() => document.getElementById('close-task')?.click());
await page.waitForTimeout(500);

// 4. 容器形态：半屏 / 笔记页
for (const label of ['半屏小工具', '笔记页', '个人页']) {
  const clicked = await page.evaluate(text => {
    const target = [...document.querySelectorAll('button, [role=button], [role=tab], li, span')]
      .find(node => (node.innerText || '').trim() === text);
    if (!target) return false;
    target.click();
    return true;
  }, label);
  if (!clicked) continue;
  await page.waitForTimeout(1800);
  await shot(`08-mode-${label}`);
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
