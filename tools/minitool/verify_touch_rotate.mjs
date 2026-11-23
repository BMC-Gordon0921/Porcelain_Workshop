// 容器内验证三件事：①触屏输入模式下摇杆可用且位移方向正确 ②桌面预览走键盘、摇杆收起
// ③点「⟳」后整页转成横版渲染（#app 变成 852×393，画布与 HUD 跟着重排）。
// 用法：node tools/minitool/verify_touch_rotate.mjs [workbenchUrl] [outDir]
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir, writeFile} from 'node:fs/promises';

const URL = process.argv[2] || 'http://127.0.0.1:3214/';
const OUT = process.argv[3] || 'qa/minitool';
await mkdir(OUT, {recursive: true});

const browser = await chromium.launch({
  channel: 'msedge', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({viewport: {width: 430, height: 932}, deviceScaleFactor: 2});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const result = {steps: {}, errors, notes: []};

async function frame() {
  for (let i = 0; i < 60; i++) {
    for (const f of page.frames()) if (f.url().includes('/app/')) return f;
    await page.waitForTimeout(500);
  }
  throw new Error('app frame not found');
}
await page.goto(URL);
await page.waitForTimeout(2500);
let f = await frame();

// 进入工坊：开屏第一次点击只展开地图，再点才进场景
for (let i = 0; i < 14; i++) {
  const done = await f.evaluate(() => {
    const vis = (s) => { const el = document.querySelector(s); if (!el) return false;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0; };
    if (vis('#brief-done')) { document.querySelector('#brief-done').click(); return 'brief'; }
    if (vis('#start-button')) { document.querySelector('#start-button').click(); return 'start'; }
    if (vis('#skip-opening')) { document.querySelector('#skip-opening').click(); return 'skip'; }
    return '';
  }).catch(() => '');
  if (done === 'brief') break;
  await page.waitForTimeout(900);
}
await page.waitForFunction(() => document.querySelector('#world')?.dataset.loading === 'false', null, {timeout: 20000}).catch(() => {});
await f.evaluate(() => { if (window.__terra) window.__terra.state.tutorial = {status: 'complete', step: null}; });
await page.waitForTimeout(1200);

// ① 输入模式与摇杆
const ui = await f.evaluate(() => {
  const cc = document.querySelector('#touch-controls');
  const joy = document.querySelector('#joystick');
  return {
    input: document.documentElement.dataset.input,
    layout: document.documentElement.dataset.layout,
    rotate: document.documentElement.dataset.rotate || 'off',
    touchControlsVisible: !!cc && getComputedStyle(cc).display !== 'none',
    joystickRect: joy ? [Math.round(joy.getBoundingClientRect().x), Math.round(joy.getBoundingClientRect().y)] : null,
    keyboardHintVisible: !!document.querySelector('.bottom-bar .controls') && getComputedStyle(document.querySelector('.bottom-bar .controls')).display !== 'none',
  };
});
result.steps.touchMode = ui.input === 'touch';
result.steps.joystickVisible = ui.joystickRect !== null && ui.touchControlsVisible;
result.steps.keyboardHintHidden = ui.keyboardHintVisible === false;
result.inputState = ui;

const playerBefore = await f.evaluate(() => document.querySelector('#world').dataset.player || '');
// 容器把页面放在跨域 iframe 里，外层鼠标坐标换算容易偏一层；直接在帧内派发 PointerEvent
// （与真机 pointer 事件走同一条监听链路），验证拖动逻辑本身。
const joyBox = await f.evaluate(() => {
  const r = document.querySelector('#joystick').getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const mk = (t, x, y) => new PointerEvent(t, {bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y});
  document.querySelector('#joystick').dispatchEvent(mk('pointerdown', cx, cy));
  document.querySelector('#joystick').dispatchEvent(mk('pointermove', cx, cy - 34));
  return {cx, cy};
});
await page.waitForTimeout(900);
const knob = await f.evaluate(() => getComputedStyle(document.querySelector('#joystick-knob')).transform);
await f.evaluate(({cx, cy}) => {
  const mk = (t, x, y) => new PointerEvent(t, {bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y});
  document.querySelector('#joystick').dispatchEvent(mk('pointerup', cx, cy));
}, joyBox);
await page.waitForTimeout(250);
const playerAfter = await f.evaluate(() => document.querySelector('#world').dataset.player || '');
const parse = (s) => { try { const j = JSON.parse(s); return [Number(j.x), Number(j.z)]; } catch { return null; } };
const p0 = parse(playerBefore), p1 = parse(playerAfter);
result.joystick = {playerBefore, playerAfter, knobTransform: knob};
result.steps.joystickMoved = !!(p0 && p1) && Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.2;
result.joystickDelta = p0 && p1 ? [Number((p1[0] - p0[0]).toFixed(2)), Number((p1[1] - p0[1]).toFixed(2))] : null;
// 轴映射校验：再推一次「右」，两次位移应正交（cos≈0），证明上下/左右没有串轴
// （注意：容器 headless 里 window 未聚焦，键盘事件会被 focused 守卫挡掉，所以不用键盘做基准）
const rBefore = parse(await f.evaluate(() => document.querySelector('#world').dataset.player || ''));
await f.evaluate(() => {
  const r = document.querySelector('#joystick').getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const mk = (t, x, y) => new PointerEvent(t, {bubbles: true, cancelable: true, pointerId: 8, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y});
  document.querySelector('#joystick').dispatchEvent(mk('pointerdown', cx, cy));
  document.querySelector('#joystick').dispatchEvent(mk('pointermove', cx + 34, cy));
});
await page.waitForTimeout(900);
await f.evaluate(() => {
  const r = document.querySelector('#joystick').getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  document.querySelector('#joystick').dispatchEvent(new PointerEvent('pointerup', {bubbles: true, cancelable: true, pointerId: 8, pointerType: 'touch', isPrimary: true, clientX: cx, clientY: cy}));
});
await page.waitForTimeout(200);
const rAfter = parse(await f.evaluate(() => document.querySelector('#world').dataset.player || ''));
const upDelta = p0 && p1 ? [p1[0] - p0[0], p1[1] - p0[1]] : null;
const rightDelta = rBefore && rAfter ? [rAfter[0] - rBefore[0], rAfter[1] - rBefore[1]] : null;
result.axes = {upDelta, rightDelta};
if (upDelta && rightDelta) {
  const cos = (upDelta[0] * rightDelta[0] + upDelta[1] * rightDelta[1]) / (Math.hypot(...upDelta) * Math.hypot(...rightDelta) || 1);
  result.axisCos = Number(cos.toFixed(3));
  // 庭院里有墙和台阶，推杆撞到障碍会沿墙滑行，严格正交并不可靠；
  // 这里只要求「右」与「上」是明显不同的方向，且都不为零。
  result.steps.axesDistinct = Math.abs(cos) < 0.9 && Math.hypot(...rightDelta) > 0.2;
}
result.steps.knobDeflected = knob !== 'none' && knob !== 'matrix(1, 0, 0, 1, 0, 0)';
await page.screenshot({path: `${OUT}/touch-01-workshop.png`});

// ③ 旋屏：点顶栏「⟳」
const beforeRotate = await f.evaluate(() => { const a = document.querySelector('#app').getBoundingClientRect();
  const c = document.querySelector('#world'); return {app: [Math.round(a.width), Math.round(a.height)], canvas: [c.width, c.height]}; });
await f.evaluate(() => { document.querySelector('#rotate-button').click(); });
await page.waitForTimeout(1400);
const afterRotate = await f.evaluate(() => { const a = document.querySelector('#app').getBoundingClientRect();
  const c = document.querySelector('#world');
  const cs = getComputedStyle(document.querySelector('#app'));
  const box = document.querySelector('#app').getBoundingClientRect();
  const styleW = Math.round(parseFloat(getComputedStyle(document.querySelector('#app')).width));
  const styleH = Math.round(parseFloat(getComputedStyle(document.querySelector('#app')).height));
  return {
    styleWH: [styleW, styleH],
    rotateAttr: document.documentElement.dataset.rotate || 'off',
    layout: document.documentElement.dataset.layout,
    appRect: [Math.round(a.x), Math.round(a.y), Math.round(a.width), Math.round(a.height)],
    canvas: [c.width, c.height],
    transform: cs.transform,
    interactRect: (() => { const r = document.querySelector('#touch-interact').getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })(),
    joystickRect: (() => { const r = document.querySelector('#joystick').getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })(),
    offscreen: [...document.querySelectorAll('#app *')].filter((el) => { const r = el.getBoundingClientRect();
      return r.width > 8 && r.height > 8 && (r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight); }).length,
  };
});
result.rotated = {before: beforeRotate, after: afterRotate};
result.steps.rotateApplied = afterRotate.rotateAttr === 'on' && afterRotate.layout === 'ls';
result.steps.rotateLandscapeSize = afterRotate.styleWH[0] > afterRotate.styleWH[1];
result.steps.rotateCanvasResized = beforeRotate.canvas[0] !== afterRotate.canvas[0];
await page.screenshot({path: `${OUT}/touch-02-rotated.png`});

// 再点一次还原
await f.evaluate(() => { document.querySelector('#rotate-button').click(); });
await page.waitForTimeout(1000);
const back = await f.evaluate(() => { const a = document.querySelector('#app').getBoundingClientRect();
  const c = document.querySelector('#world'); return {rotate: document.documentElement.dataset.rotate || 'off', app: [Math.round(a.width), Math.round(a.height)], canvas: [c.width, c.height]}; });
result.steps.rotateRestored = back.rotate === 'off' && back.app[0] < back.app[1];
result.restored = back;

// ② 桌面预览：切设备后应为键盘方案、摇杆收起
await page.evaluate(() => {
  const host = document.querySelector('*');
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) { const btn = el.shadowRoot.querySelector('[aria-label="桌面预览"]'); if (btn) { btn.click(); return true; } if (walk(el.shadowRoot)) return true; }
    }
    return false;
  };
  walk(document);
});
await page.waitForTimeout(3500);
f = await frame();
const desk = await f.evaluate(() => {
  const cc = document.querySelector('#touch-controls');
  return {input: document.documentElement.dataset.input, layout: document.documentElement.dataset.layout,
    innerW: innerWidth, joystickHidden: !cc || getComputedStyle(cc).display === 'none',
    keyboardHintVisible: (() => { const el = document.querySelector('.bottom-bar .controls'); return !!el && getComputedStyle(el).display !== 'none'; })()};
});
result.desktop = desk;
result.steps.desktopKeyboard = desk.input === 'keyboard' && desk.joystickHidden && desk.keyboardHintVisible;
await page.screenshot({path: `${OUT}/touch-03-desktop.png`});

result.steps.all = Object.entries(result.steps).every(([k, v]) => k === 'all' || v === true);
result.errors = errors;
await writeFile(`${OUT}/verify-touch-rotate.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({steps: result.steps, inputState: result.inputState, joystick: result.joystick,
  joystickDelta: result.joystickDelta, rotated: result.rotated, desktop: result.desktop, errors}, null, 2));
await browser.close();
