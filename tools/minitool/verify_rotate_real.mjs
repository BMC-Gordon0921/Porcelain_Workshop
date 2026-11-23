import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdirSync} from 'node:fs';

const OUT = 'qa/minitool/rotate-real';
mkdirSync(OUT, {recursive:true});

const b = await chromium.launch({channel:'msedge', headless:true, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

async function boot(page) {
  await page.goto('http://localhost:5188/', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => !!window.__terra, null, {timeout:30000});
  await page.evaluate(() => {
    const r = document.documentElement;
    r.dataset.platform = 'minitool';
    r.dataset.input = 'touch';
    r.style.setProperty('--mt-top-inset', '80px');
    r.style.setProperty('--mt-bottom-inset', '21px');
  });
  await page.click('#unfold-map');
  await page.waitForFunction(() => document.querySelector('#opening-scene-carousel canvas')?.dataset.loading === 'false');
  await page.click('#skip-opening');
  if (await page.locator('#welcome').isVisible()) await page.click('#start-button');
  await page.waitForSelector('#brief-done');
  await page.click('#brief-done');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    window.__terra.state.tutorial = {status:'complete', step:null};
    window.__terra.state.hasClay = true;
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__terra.toggleRotate(true));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__terra.teleport('wheel'));
  await page.waitForTimeout(300);
}

const panels = [
  {name:'editor', open:() => window.__terra.openStation('wheel')},
  {name:'brief', open:() => document.getElementById('view-brief').click()},
  {name:'kiln', open:() => { window.__terra.state.shapeEdits = 1; window.__terra.state.piece.pixels[0] = 2; window.__terra.openKiln(); }},
  {name:'journey', open:() => window.__terra.openJourney()},
  {name:'upgrades', open:() => window.__terra.openUpgrades()},
  {name:'citymap', open:() => window.__terra.openCityMap()},
  {name:'help', open:() => document.getElementById('help-button').click()}
];

const measure = () => {
  const q = s => document.querySelector(s);
  const vis = el => !!el && el.offsetWidth > 0 && el.offsetHeight > 0;
  const panel = q('.overlay:not(.hidden) .task-panel, .overlay:not(.hidden) .help-panel');
  const pr = panel.getBoundingClientRect();
  const inside = el => {
    const r = el.getBoundingClientRect();
    return r.left >= pr.left - 1.5 && r.right <= pr.right + 1.5 && r.top >= pr.top - 1.5 && r.bottom <= pr.bottom + 1.5;
  };
  const overflow = [...panel.querySelectorAll('*')].filter(el => vis(el) && !inside(el) && getComputedStyle(el).position !== 'fixed')
    .slice(0, 6).map(el => (el.id || el.className || el.tagName) + ' ' + Math.round(el.getBoundingClientRect().right - pr.right));
  const close = q('#close-task') && !q('#close-task').closest('.hidden') ? q('#close-task') : q('#close-help');
  const cr = close.getBoundingClientRect();
  const hitEl = document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2);
  const canvases = [...panel.querySelectorAll('canvas')].filter(vis).map(c => ({id:c.id || c.className, w:c.offsetWidth, h:c.offsetHeight, ratio:(c.width / c.height).toFixed(3), clientRatio:(c.offsetWidth / c.offsetHeight).toFixed(3)}));
  const cols = (() => {
    const lay = panel.querySelector('.editor-layout, .kiln-layout, .journey-layout');
    if (!lay) return null;
    const cs = getComputedStyle(lay);
    return {display:cs.display, cols:cs.gridTemplateColumns, rows:cs.gridTemplateRows};
  })();
  return {
    panel: `${panel.offsetWidth}x${panel.offsetHeight}`,
    diag: {
      cls: panel.className,
      layout: document.documentElement.getAttribute('data-layout'),
      maxW: getComputedStyle(panel).maxWidth,
      overlayW: document.querySelector('.overlay:not(.hidden)')?.offsetWidth
    },
    closeHit: !!hitEl && (hitEl === close || close.contains(hitEl)),
    closeInside: cr.left >= pr.left - 1 && cr.right <= pr.right + 1 && cr.top >= pr.top - 1 && cr.bottom <= pr.bottom + 1,
    overflow, canvases, cols,
    hudHidden: getComputedStyle(document.getElementById('touch-controls')).display === 'none',
    carrying: !!document.getElementById('carrying')
  };
};

const report = {};

for (const dev of [{name:'phone', w:393, h:852}, {name:'ipad', w:834, h:852}]) {
  const ctx = await b.newContext({viewport:{width:dev.w, height:dev.h}, deviceScaleFactor:1, isMobile:true, hasTouch:true});
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await boot(page);
  report[dev.name] = {errs, panels:{}};
  for (const pn of panels) {
    await page.evaluate(pn.open);
    await page.waitForTimeout(900);
    report[dev.name].panels[pn.name] = await page.evaluate(measure).catch(e => ({error:String(e).slice(0,160)}));
    const st = await page.evaluate(() => ({task:!document.getElementById('task-overlay').classList.contains('hidden'), help:!document.getElementById('help-overlay').classList.contains('hidden'), kind:document.querySelector('.task-panel')?.dataset.panel||''}));
    report[dev.name].panels[pn.name].state = st;
    await page.screenshot({path:`${OUT}/${dev.name}-${pn.name}.png`});
    await page.evaluate(() => { window.__terra.closeTask(); document.getElementById('help-overlay').classList.add('hidden'); document.documentElement.removeAttribute('data-panel-open'); });
    await page.waitForTimeout(350);
  }
  // 面板关闭后 HUD 应恢复
  report[dev.name].hudAfterClose = await page.evaluate(() => getComputedStyle(document.getElementById('touch-controls')).display);
  await ctx.close();
}

console.log(JSON.stringify(report, null, 1));
await b.close();
