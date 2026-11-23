import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
const url = process.argv[2];
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 430, height: 932}, deviceScaleFactor: 2});
await page.goto(url, {waitUntil: 'domcontentloaded'});
let frame = null;
for (let i = 0; i < 120 && !frame; i += 1) { frame = page.frames().find(f => f.url().includes('/app/')); if (!frame) await page.waitForTimeout(250); }
await frame.waitForSelector('#skip-opening', {timeout: 30000});
await page.waitForTimeout(1500);
const probe = async (label) => {
  const r = await frame.evaluate(() => {
    const btn = document.getElementById('skip-opening');
    const box = btn.getBoundingClientRect();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return {box: [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)],
      hit: hit ? hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') + (hit.className ? '.' + String(hit.className).trim().split(/\s+/)[0] : '') : null,
      stage: document.getElementById('welcome').dataset.openingStage,
      screenScroll: document.getElementById('welcome').scrollTop};
  });
  console.log(label, JSON.stringify(r));
};
await probe('initial');
const ok = await frame.evaluate(() => { document.getElementById('skip-opening').click(); return document.getElementById('welcome').dataset.openingStage; });
console.log('after DOM click, stage =', ok);
await page.waitForTimeout(800);
await probe('after-dom-click');
// 真鼠标点击（先滚到顶）
await frame.evaluate(() => { document.getElementById('welcome').scrollTop = 0; });
const stage2 = await frame.evaluate(() => document.getElementById('welcome').dataset.openingStage);
console.log('stage before mouse click =', stage2);
try {
  await frame.locator('#start-button').click({timeout: 5000});
  console.log('start-button mouse click ok');
} catch (e) { console.log('start-button click failed:', e.message.split('\n')[0]); }
await page.waitForTimeout(2500);
console.log('state:', JSON.stringify(await frame.evaluate(() => ({stage: document.getElementById('welcome').dataset.openingStage, hidden: document.getElementById('welcome').classList.contains('hidden'), worldLoading: document.getElementById('world').dataset.loading}))));
await browser.close();
