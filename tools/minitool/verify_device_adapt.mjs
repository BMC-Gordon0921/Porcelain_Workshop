// 设备适配层验收：普通浏览器（非小工具容器）里也应该按设备吃摇杆 / 安全区 / 面板外壳。
// 用法：node tools/minitool/verify_device_adapt.mjs [url]
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';

const url = process.argv[2] || 'http://localhost:5188/';
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const results = [];

async function run(label, contextOptions, expect) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => !!window.__terra, null, {timeout: 30000});
  const snap = await page.evaluate(() => {
    const root = document.documentElement;
    const rect = sel => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)} : null; };
    return {
      adapt: root.dataset.adapt === '', input: root.dataset.input || '', layout: root.dataset.layout || '', shell: root.dataset.shell || '',
      topInset: getComputedStyle(root).getPropertyValue('--mt-top-inset').trim(),
      touchControls: rect('#touch-controls'), joystick: rect('.joystick'), interact: rect('#touch-interact'),
      rotateVisible: !!document.querySelector('#rotate-button') && getComputedStyle(document.querySelector('#rotate-button')).display !== 'none'
    };
  });
  // 面板外壳：打开升级面板量一下（关掉后不影响其它上下文）
  await page.evaluate(() => window.__terra.openUpgrades());
  await page.waitForTimeout(400);
  const panel = await page.evaluate(() => {
    const el = document.querySelector('.task-panel'); if (!el) return null;
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const close = document.querySelector('#close-task'); const cr = close ? close.getBoundingClientRect() : null;
    return {
      rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
      radius: style.borderTopLeftRadius,
      position: style.position,
      close: cr ? {x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width)} : null
    };
  });
  const checks = {
    adapt: snap.adapt === true,
    input: snap.input === expect.input,
    layout: snap.layout === expect.layout,
    shell: snap.shell === expect.shell,
    joystick: expect.joystick ? !!snap.joystick : !snap.joystick,
    interact: expect.joystick ? !!snap.interact : !snap.interact,
    rotate: snap.rotateVisible === expect.rotate,
    panelFullBleed: expect.shell === 'full' ? (panel && panel.radius === '0px' && panel.position === 'absolute') : (panel && panel.radius !== '0px' && panel.position === 'relative'),
    closeReachable: !!(panel && panel.close),
    noErrors: errors.length === 0
  };
  results.push({label, viewport: contextOptions.viewport, snap, panel, errors, checks, all: Object.values(checks).every(Boolean)});
  await context.close();
}

await run('phone', {viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true}, {input: 'touch', layout: 'sm', shell: 'full', joystick: true, rotate: false});
await run('desktop', {viewport: {width: 1440, height: 900}, deviceScaleFactor: 1}, {input: 'keyboard', layout: 'wide', shell: 'card', joystick: false, rotate: false});

await browser.close();
console.log(JSON.stringify({all: results.every(r => r.all), results}, null, 2));
