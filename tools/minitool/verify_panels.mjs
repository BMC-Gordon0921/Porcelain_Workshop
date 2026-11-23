// 面板外壳与横版两栏验证：检查「顶栏常驻 ×、只滚 body、两栏 58/42、无横向溢出」。
// 用法：
//   node tools/minitool/verify_panels.mjs                     // 竖屏 393x852
//   node tools/minitool/verify_panels.mjs 834 852             // iPad 逻辑视口
//   node tools/minitool/verify_panels.mjs 393 852 rotate      // 手动旋屏（等价 852x393 横版）
// 说明：旋屏时 #app 带 rotate(90deg)，getBoundingClientRect 会返回旋转后的轴对齐包围盒（宽高互换），
// 读数会互相矛盾。这里把 transform 换成等尺寸盒子（852x393）来量「旋转后的布局空间」，与真实观感一致。
// 环境变量：GAME_URL（默认 http://localhost:5188/）、OUT（默认 qa/minitool/panels）
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdirSync, writeFileSync} from 'node:fs';

const W = Number(process.argv[2] || 393);
const H = Number(process.argv[3] || 852);
const ROTATE = process.argv[4] === 'rotate';
const url = process.env.GAME_URL || 'http://localhost:5188/';
const OUT = process.env.OUT || 'qa/minitool/panels';
mkdirSync(OUT, {recursive: true});

// 旋屏后外壳让位量按 90° 换轴：竖屏 top 80 / bottom 21 -> 横版 left 21 / right 80（top/bottom 归 0）
const insets = ROTATE
  ? {top: 0, bottom: 0, left: 21, right: 80}
  : {top: 80, bottom: 21, left: 0, right: 0};

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const context = await browser.newContext({
  // 旋屏后用「等效横版视口」来量：真实旋屏时 #app 被渲染成 852x393 的盒子，
  // 与直接在 852x393 视口里测量等价，且所有矩形都能直接读数（旋屏下 AABB 会宽高互换）。
  viewport: ROTATE ? {width: H, height: W} : {width: W, height: H},
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message)));

await page.goto(url, {waitUntil: 'domcontentloaded'});
await page.waitForFunction(() => !!window.__terra, null, {timeout: 30000});

await page.evaluate(ins => {
  const root = document.documentElement;
  root.dataset.platform = 'minitool';
  root.dataset.input = 'touch';
  root.style.setProperty('--mt-top-inset', ins.top + 'px');
  root.style.setProperty('--mt-bottom-inset', ins.bottom + 'px');
  root.style.setProperty('--mt-left-inset', ins.left + 'px');
  root.style.setProperty('--mt-right-inset', ins.right + 'px');
}, insets);
if (ROTATE) {
  await page.evaluate(() => {
    const root = document.documentElement;
    root.dataset.layout = 'ls';
  });
}

await page.click('#unfold-map');
await page.waitForFunction(() => document.querySelector('#opening-scene-carousel canvas')?.dataset.loading === 'false');
await page.click('#skip-opening');
if (await page.locator('#welcome').isVisible()) await page.click('#start-button');
await page.waitForSelector('#brief-done');
await page.click('#brief-done');
await page.evaluate(() => {
  window.dispatchEvent(new Event('focus'));
  window.__terra.state.tutorial = {status: 'complete', step: null};
  window.__terra.state.hasClay = true;
});
await page.waitForTimeout(1400);

const panels = ['brief', 'editor', 'kiln', 'journey', 'upgrades', 'citymap', 'help'];
const results = {};

for (const kind of panels) {
  await page.evaluate(k => {
    const t = window.__terra;
    if (k === 'kiln') {
      // 窑炉要求「已塑形 + 已上色」
      t.state.shapeEdits = Math.max(1, t.state.shapeEdits | 0);
      t.state.piece.pixels[0] = 2;
    }
    if (k === 'help') return t.showHelp();
    if (k === 'brief') { document.querySelector('#view-brief')?.click(); return null; }
    if (k === 'editor') { t.teleport('wheel'); return null; }
    if (k === 'kiln') return t.openKiln();
    if (k === 'journey') return t.openJourney();
    if (k === 'upgrades') return t.openUpgrades();
    if (k === 'citymap') return t.openCityMap();
    return null;
  }, kind);
  await page.waitForTimeout(700);
  if (kind === 'editor') {
    await page.evaluate(() => window.__terra.openStation('wheel'));
  }
  await page.waitForTimeout(1100);

  const measured = await page.evaluate(() => {
    const round = r => r && {x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height)};
    const box = el => (el ? round(el.getBoundingClientRect()) : null);
    const overlay = document.querySelector('.overlay:not(.hidden)');
    const panel = overlay?.querySelector('.task-panel,.help-panel');
    if (!panel) return {panel: null, skipped: true};
    const body = panel.querySelector('#task-body') || panel;
    const closeBtn = panel.querySelector('.close-button');
    const header = panel.querySelector('.task-header');
    const cs = el => getComputedStyle(el);

    const left = panel.querySelector('.work-area, .kiln-stage, .bowl-stage, .upgrade-detail');
    const right = panel.querySelector('.editor-reference, .kiln-control, .decal-details, .workbench-grid');
    const leftBox = box(left);
    const rightBox = box(right);
    const sideBySide = !!(leftBox && rightBox && rightBox.x >= leftBox.x + leftBox.w - 1);
    const gap = sideBySide ? Math.round(rightBox.x - (leftBox.x + leftBox.w)) : null;
    const ratio = sideBySide ? Number((leftBox.w / (leftBox.w + rightBox.w)).toFixed(3)) : null;

    let closeHit = null;
    if (closeBtn) {
      const r = closeBtn.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
      closeHit = !!hit && (hit === closeBtn || closeBtn.contains(hit));
    }

    const pr = panel.getBoundingClientRect();
    const overX = [];
    panel.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.right > pr.right + 1.5 || r.left < pr.left - 1.5) {
        const tag = el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
        if (overX.length < 6) overX.push({el: tag, x: Math.round(r.left), w: Math.round(r.width)});
      }
    });

    return {
      panel: box(panel),
      panelKind: panel.dataset.panel || null,
      body: box(body),
      bodyScroll: {scrollH: body.scrollHeight, clientH: body.clientHeight, clipped: body.scrollHeight > body.clientHeight + 1},
      header: box(header),
      title: box(panel.querySelector('.task-header h2')),
      close: box(closeBtn),
      closeHit,
      left: leftBox,
      right: rightBox,
      sideBySide,
      gap,
      ratio,
      rightScrollable: right ? cs(right).overflowY : null,
      rightBox: box(right),
      bodyOverflowY: cs(body).overflowY,
      columns: left && right ? cs(left.parentElement).gridTemplateColumns : null,
      overX,
      panelRadius: cs(panel).borderTopLeftRadius
    };
  });

  results[kind] = measured;
  await page.screenshot({path: `${OUT}/${ROTATE ? 'ls' : 'pt'}-${W}x${H}-${kind}.png`});

  await page.evaluate(() => {
    window.__terra.closeTask();
    window.__terra.hideHelp();
  });
  await page.waitForTimeout(400);
}

// 两栏只要求在横版（手横版）成立；竖屏/平板竖屏沿用原有单栏版面。
const twoCol = ROTATE ? ['editor', 'kiln', 'journey', 'upgrades'] : [];
const checks = [];
for (const kind of panels) {
  const r = results[kind];
  if (!r || r.skipped) { checks.push({kind, ok: false, issues: ['未打开']}); continue; }
  const issues = [];
  if (!r.closeHit) issues.push('× 不可点');
  if (r.title && r.close && r.title.x + r.title.w > r.close.x - 2) issues.push('标题压到 ×');
  if (r.overX.length) issues.push(`横向溢出 ${r.overX.length} 处`);
  if (r.bodyScroll && r.bodyScroll.clipped && !['auto', 'scroll'].includes(r.bodyOverflowY)) issues.push('#task-body 溢出但不可滚');
  if (twoCol.includes(kind)) {
    if (!r.left || !r.right) issues.push('缺两栏容器');
    else if (!r.sideBySide) issues.push('两栏未并排');
    else {
      if (!(r.ratio > 0.5 && r.ratio < 0.66)) issues.push(`左栏占比 ${r.ratio}`);
      if (r.gap !== null && r.gap < 4) issues.push(`栏间距 ${r.gap}`);
    }
    if (r.right && r.rightScrollable === 'visible' && r.rightBox && r.right.h > r.panel.h) issues.push('右栏内容超高但不可滚');
  }
  checks.push({kind, ok: issues.length === 0, issues, ratio: r.ratio, gap: r.gap, left: r.left, right: r.right});
}

const summary = {viewport: `${W}x${H}`, rotated: ROTATE, insets, errors, checks, pass: checks.every(c => c.ok)};
writeFileSync(`${OUT}/verify-${ROTATE ? 'ls' : 'pt'}-${W}x${H}.json`, JSON.stringify({summary, results}, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.pass && errors.length === 0 ? 0 : 1);
