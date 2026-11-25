import {chromium} from '../../../qa/pw/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({channel:'msedge', headless:true, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page = await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
await page.goto('http://127.0.0.1:5174/', {waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>!!window.__terra,null,{timeout:30000});
await page.waitForTimeout(1000);
const dump = async (tag) => {
  const d = await page.evaluate(() => {
    const s = window.__terra.state;
    const vis = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { hidden: e.classList.contains('hidden'), w: Math.round(r.width), h: Math.round(r.height) }; };
    return {
      tag: null,
      tutorial: s.tutorial, hasClay: s.hasClay, canWork: s.canWork, level: s.level,
      toast: (document.querySelector('.toast, #toast')||{}).textContent?.trim().slice(0,80) || '',
      panels: { task: vis('#task-shell'), taskBody: vis('#task-body'), welcome: vis('#welcome'), opening: vis('#opening'), mobile: vis('#mobile-guidance') },
      nearest: window.__terra.world?.nearest?.()?.id || null,
      bodyChildren: [...document.querySelector('#task-body')?.children||[]].map(e=>e.className).slice(0,6)
    };
  });
  console.log(tag, JSON.stringify(d));
};
await dump('boot');
await page.click('#skip-opening'); await page.waitForTimeout(600); await dump('after-skip');
if (await page.locator('#start-button').isVisible().catch(()=>false)) { await page.click('#start-button'); await page.waitForTimeout(900); }
await dump('after-start');
await page.keyboard.down('w'); await page.waitForTimeout(700); await page.keyboard.up('w');
await page.waitForTimeout(400); await dump('after-w');
await page.evaluate(()=>window.__terra.teleport('clay')); await page.waitForTimeout(500); await dump('teleported-clay');
await page.evaluate(()=>window.__terra.openStation('clay')); await page.waitForTimeout(700); await dump('opened-clay');
await page.evaluate(()=>{const s=window.__terra.state; s.tutorial={status:'active',step:'clay'};}); await page.waitForTimeout(200);
await page.evaluate(()=>window.__terra.openStation('clay')); await page.waitForTimeout(700); await dump('opened-clay-forced');
await b.close();
