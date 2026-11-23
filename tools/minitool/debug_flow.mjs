// 调试用：进容器后打印首屏/进场流程中的 DOM 状态，定位 #world canvas 未出现的原因。
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';

const url = process.argv[2];
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 430, height: 932}, deviceScaleFactor: 2});
const logs = [];
page.on('pageerror', error => logs.push(`pageerror: ${error.message}`));
page.on('console', message => logs.push(`${message.type()}: ${message.text()}`));
await page.goto(url, {waitUntil: 'domcontentloaded'});
let frame = null;
for (let i = 0; i < 120 && !frame; i += 1) {
  frame = page.frames().find(candidate => candidate.url().includes('/app/'));
  if (!frame) await page.waitForTimeout(250);
}
await frame.waitForSelector('#opening-background canvas', {timeout: 30000});
await frame.waitForFunction(() => document.querySelector('#opening-background canvas')?.dataset.loading === 'false', null, {timeout: 60000});
await page.waitForTimeout(1500);

const dump = async label => {
  const state = await frame.evaluate(() => {
    const pick = id => {
      const el = document.getElementById(id);
      return el ? {visible: !!(el.offsetWidth || el.offsetHeight), cls: el.className, loading: el.dataset?.loading ?? null} : null;
    };
    return {
      bodyClass: document.body.className,
      app: document.getElementById('app')?.dataset,
      welcome: pick('welcome'),
      brief: pick('brief-done'),
      world: pick('world'),
      worldWrap: pick('world-wrap'),
      canvases: [...document.querySelectorAll('canvas')].map(c => ({id: c.id || c.parentElement?.id, w: c.width, h: c.height, loading: c.dataset?.loading ?? null})),
      buttons: [...document.querySelectorAll('button')].filter(b => b.offsetWidth).map(b => b.id || b.textContent.trim().slice(0, 12)).slice(0, 20)
    };
  });
  console.log(`--- ${label}\n` + JSON.stringify(state, null, 2));
};

await dump('after opening');
await frame.locator('#skip-opening').click({timeout: 10000}).catch(error => console.log('skip-opening click failed:', error.message));
await page.waitForTimeout(1200);
await dump('after skip-opening');
if (await frame.locator('#start-button').isVisible().catch(() => false)) {
  await frame.locator('#start-button').click();
  console.log('clicked #start-button');
} else {
  console.log('#start-button not visible');
}
await page.waitForTimeout(1500);
await dump('after start-button');
if (await frame.locator('#brief-done').isVisible().catch(() => false)) {
  await frame.locator('#brief-done').click();
  console.log('clicked #brief-done');
}
await page.waitForTimeout(4000);
await dump('after brief');
console.log('--- logs\n' + logs.slice(-30).join('\n'));
await page.screenshot({path: 'qa/minitool/debug.png'});
await browser.close();
