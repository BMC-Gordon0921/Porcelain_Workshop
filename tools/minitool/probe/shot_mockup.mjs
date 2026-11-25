import { chromium } from '../../../qa/pw/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const url = 'file:///D:/ECNU/BOKE/Porcelain_Workshop_Code/docs/ui_redesign/mockup.html';
const outDir = 'qa/newbie/mockup';
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const shots = [];
for (const dev of ['desktop', 'phone']) {
  const page = await browser.newPage(dev === 'phone'
    ? { viewport: { width: 460, height: 900 }, deviceScaleFactor: 2 }
    : { viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 1.5 });
  await page.goto(url);
  await page.click('[data-dev="' + dev + '"]');
  for (const scr of ['intro', 'world', 'editor', 'preview', 'result', 'map']) {
    await page.click('[data-scr="' + scr + '"]');
    await page.waitForTimeout(180);
    const frame = await page.$('#frame');
    const p = outDir + '/' + dev + '-' + scr + '.png';
    await frame.screenshot({ path: p });
    shots.push(p);
  }
  await page.close();
}
await browser.close();
console.log(shots.join('\n'));
