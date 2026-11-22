// 移动端版面复查：在 393×852 竖屏下走完整 10 屏流程并截图，可选模拟小工具外壳安全区。
// 用法：GAME_URL=http://127.0.0.1:5188/ PLATFORM=minitool OUT=qa/minitool/mobile node tools/minitool/shots_mobile.mjs
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir} from 'node:fs/promises';

const url = process.env.GAME_URL || 'http://127.0.0.1:5188/';
const out = process.env.OUT || 'qa/minitool/mobile';
const width = Number(process.env.W || 393);
const height = Number(process.env.H || 852);
const platform = process.env.PLATFORM || 'minitool';
await mkdir(out, {recursive: true});

const browser = await chromium.launch({
  channel: process.env.CHROME_CHANNEL || 'msedge',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

const shot = async name => {
  await page.waitForTimeout(200);
  await page.screenshot({path: `${out}/${name}.png`});
  console.log('shot', name);
};
const step = async (label, fn) => {
  try {
    await fn();
  } catch (e) {
    console.log('FAIL', label, String(e.message).split('\n')[0]);
  }
};

async function station(id) {
  await page.evaluate(id => {
    const t = window.__terra;
    t.closeTask();
    const s = t.world.stations.find(s => s.id === id);
    t.world.player.group.position.set(s.approach[0], 0, s.approach[1]);
  }, id);
  await page.waitForTimeout(150);
  await page.keyboard.press('f');
  await page.waitForTimeout(400);
}

async function draw(x0, y0, x1, y1) {
  const b = await page.locator('#sculpt-canvas').boundingBox();
  await page.mouse.move(b.x + b.width * x0 / 112, b.y + b.height * y0 / 112);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * x1 / 112, b.y + b.height * y1 / 112, {steps: 16});
  await page.mouse.up();
  await page.waitForTimeout(50);
}

await page.goto(url);
await page.waitForFunction(() => !!window.__terra);

// 模拟小红书容器外壳：竖屏 = 状态栏 44 + 胶囊 36、底部 home 条 21；横屏 = 无状态栏、左右各 44 刘海、底部 21
if (platform === 'minitool') {
  await page.evaluate(({landscape}) => {
    const root = document.documentElement;
    root.dataset.platform = 'minitool';
    root.style.setProperty('--mt-top-inset', landscape ? '0px' : '80px');
    root.style.setProperty('--mt-bottom-inset', '21px');
    root.style.setProperty('--mt-left-inset', landscape ? '44px' : '0px');
    root.style.setProperty('--mt-right-inset', landscape ? '44px' : '0px');
  }, {landscape: width > height});
}

await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => document.querySelector('#opening-background canvas')?.dataset.loading === 'false');
await page.waitForTimeout(1600);
await step('opening', () => shot('01-opening'));

await step('scene-intro', async () => {
  await page.click('#unfold-map');
  await page.waitForFunction(() => document.querySelector('#opening-scene-carousel canvas')?.dataset.loading === 'false');
  await page.waitForTimeout(1600);
  await shot('02-scene-intro');
});

await step('enter', async () => {
  await page.click('#skip-opening');
  if (await page.locator('#welcome').isVisible()) await page.click('#start-button');
  await page.waitForSelector('#brief-done');
  if (await page.locator('#brief-done').isVisible()) await page.click('#brief-done');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    window.__terra.state.tutorial = {status: 'complete', step: null};
  });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(2600);
});

await step('workshop', () => shot('03-workshop'));

await step('clay', async () => {
  await station('clay');
  await shot('04-clay');
  await page.click('#fresh-clay');
  await page.waitForTimeout(2600);
});

await step('sculpt', async () => {
  await station('wheel');
  for (let i = 0; i < 7; i += 1) await draw(14 + i * 5, 18, 14 + i * 5, 94);
  await page.waitForTimeout(300);
  await shot('05-sculpt');
  await page.click('#save-editor');
  await page.waitForTimeout(400);
});

await step('paint', async () => {
  await station('paint');
  for (let i = 0; i < 6; i += 1) await draw(22 + i * 11, 34, 26 + i * 11, 78);
  await page.waitForTimeout(300);
  await shot('06-paint');
  await page.click('#save-editor');
  await page.waitForTimeout(400);
});

await step('kiln', async () => {
  await station('kiln');
  await page.click('#fire-button');
  await page.waitForTimeout(600);
  await page.keyboard.down(' ');
  await page.waitForTimeout(2600);
  await shot('07-kiln');
  await page.keyboard.up(' ');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(() => !!window.__terra.state.kilnResult, null, {timeout: 25000});
  await page.waitForTimeout(500);
  await shot('08-kiln-result');
});

await step('review', async () => {
  await page.evaluate(() => window.__terra.closeTask());
  await page.waitForTimeout(400);
  await station('serve');
  await page.waitForTimeout(400);
  await shot('09-review');
  await page.click('#confirm-review');
  await page.waitForTimeout(900);
  await shot('10-settlement');
});

await step('panels', async () => {
  await page.evaluate(() => window.__terra.closeTask());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__terra.showHelp());
  await page.waitForTimeout(600);
  await shot('11-help');
  await page.evaluate(() => window.__terra.hideHelp());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__terra.openUpgrades());
  await page.waitForTimeout(900);
  await shot('12-upgrades');
  await page.evaluate(() => window.__terra.openCityMap());
  await page.waitForTimeout(1200);
  await shot('13-citymap');
  await page.evaluate(() => window.__terra.openJourney());
  await page.waitForTimeout(900);
  await shot('14-journey');
});

console.log('state', await page.evaluate(() => {
  const s = window.__terra.state;
  return {phase: s.phase, money: s.money, scenePassed: s.scenePassed, level: s.level};
}));
console.log('errors', errors.slice(0, 10));
await browser.close();
