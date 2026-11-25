// 新手试玩探针：13 个状态实拍 + 第一眼注意力排行榜 + 溢出/命中区/禁用原因度量。
// 用法：node tools/minitool/probe/newbie_playthrough.mjs [url] [desktop|phone|both]
import {chromium} from '../../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdirSync, writeFileSync} from 'node:fs';

const URL = process.argv[2] || 'http://127.0.0.1:5174/';
const WHICH = process.argv[3] || 'both';
const OUT = 'qa/newbie';
mkdirSync(OUT, {recursive: true});

const MEASURE = () => {
  const vw = innerWidth, vh = innerHeight, varea = vw * vh;
  const lum = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    const p = m[1].split(',').map(Number);
    const a = p.length > 3 ? p[3] : 1;
    if (a < 0.2) return null;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]);
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const L = lum(getComputedStyle(n).backgroundColor);
      if (L !== null) return L;
      n = n.parentElement;
    }
    return 1;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.15) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  };
  const sel = 'button,a,h1,h2,h3,h4,strong,b,p,span,li,summary,label,figcaption,small,kbd,output,td,th,em,i,figcaption';
  const seen = new Set();
  const items = [];
  for (const el of document.querySelectorAll(sel)) {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 70) continue;
    if (!visible(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
    if (!rects.length) continue;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const r of rects) { x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
    const w = Math.min(x1, vw) - Math.max(x0, 0), h = Math.min(y1, vh) - Math.max(y0, 0);
    if (w <= 1 || h <= 1) continue;
    const key = text.slice(0, 24) + '|' + Math.round(x0) + ',' + Math.round(y0) + ',' + Math.round(w) + ',' + Math.round(h);
    if (seen.has(key)) continue;
    seen.add(key);
    const cs = getComputedStyle(el);
    const font = parseFloat(cs.fontSize) || 14;
    const fg = lum(cs.color), bg = bgOf(el);
    const contrast = Math.abs((fg === null ? 1 : fg) - bg);
    const accent = (() => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = /rgba?\(([^)]+)\)/.exec(getComputedStyle(n).backgroundColor || '');
        if (c) { const p = c[1].split(',').map(Number); const mx = Math.max(p[0], p[1], p[2]), mn = Math.min(p[0], p[1], p[2]); if ((p.length > 3 ? p[3] : 1) > 0.5 && mx - mn > 28) return true; }
        n = n.parentElement;
      }
      return false;
    })();
    const anim = cs.animationName !== 'none' || (cs.transitionDuration !== '0s' && el.tagName === 'BUTTON');
    const areaFrac = (w * h) / varea;
    const score = (font / 16) * Math.sqrt(areaFrac * 100) * (1 + contrast * 2.2) * (accent ? 1.35 : 1) * (anim ? 1.15 : 1);
    items.push({
      text: text.slice(0, 46), tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 28),
      score: +score.toFixed(2), font: +font.toFixed(1), contrast: +contrast.toFixed(2), accent, areaPct: +(areaFrac * 100).toFixed(1),
      rect: [Math.round(x0), Math.round(y0), Math.round(w), Math.round(h)], inViewport: y1 <= vh + 1
    });
  }
  items.sort((a, b) => b.score - a.score);

  const body = document.querySelector('#task-body, .task-body, .reader-body');
  const overflow = body ? { scrollH: body.scrollHeight, clientH: body.clientHeight } : null;
  const clipped = [...document.querySelectorAll('button, .primary-button, .secondary-button')]
    .filter((b) => { const r = b.getBoundingClientRect(); return r.height > 4 && (r.bottom > vh + 1 || r.top < -1); })
    .map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24));
  const smallTargets = [...document.querySelectorAll('button, a, [role=button], input[type=range], input[type=checkbox]')]
    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44); })
    .map((b) => ({ text: (b.textContent || b.getAttribute('aria-label') || b.id || b.type || '?').replace(/\s+/g, ' ').trim().slice(0, 20), wh: [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)] }));
  const disabled = [...document.querySelectorAll('button:disabled')]
    .map((b) => ({ text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30), hint: (b.title || b.getAttribute('aria-describedby') || '').slice(0, 40) }));
  const screenText = [...document.querySelectorAll('h1,h2,h3,button,p,figcaption,small,label,summary,.kiln-grade,.score-label')]
    .filter(visible).map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    .filter((t, i, a) => a.indexOf(t) === i).slice(0, 22);
  const s = window.__terra?.state;
  return {
    rank: items.slice(0, 10),
    overflow, clipped, smallTargets: smallTargets.slice(0, 12), smallTargetCount: smallTargets.length,
    disabled, screenText,
    rotate: document.documentElement.dataset.rotate || 'off',
    state: s ? { level: s.level, scene: s.scene, money: s.money, hasClay: s.hasClay, hasShape: s.hasShape, hasPaint: s.hasPaint, kiln: !!s.kilnResult, passed: s.scenePassed, tutorial: s.tutorialStep && s.tutorialStep.id, coach: (document.querySelector('.coach-strip') || {}).textContent || '', coachFirst: ((document.querySelector('#task-body') || {}).firstElementChild || {}).className || '', coachRect: (() => { const s=document.querySelector('.coach-strip'); if(!s) return null; const r=s.getBoundingClientRect(); return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; })() } : null
  };
};

const b = await chromium.launch({channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const out = {};

async function run(tag, vp, touch) {
  const ctx = await b.newContext({viewport: vp, hasTouch: !!touch, isMobile: !!touch, deviceScaleFactor: 1});
  // 版本更新弹层会挡住流程截图：清掉「已看过」标记，首次访问会静默记下当前版本而不弹层。
  await ctx.addInitScript(() => { try { localStorage.removeItem('terra-changelog-seen'); } catch {} });
  const page = await ctx.newPage();
  const w = await page.evaluate(() => 0).catch(() => 0);
  await page.goto(URL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => !!window.__terra, null, {timeout: 30000});
  await page.waitForTimeout(1200);
  const rec = {};
  const snap = async (name) => {
    const data = await page.evaluate(MEASURE);
    rec[name] = data;
    await page.screenshot({path: OUT + '/' + tag + '-' + name + '.png'});
    console.log('[snap] ' + tag + ' ' + name + ' top=' + (data.rank[0]?.text || '-').slice(0, 24));
  };
  const drag = async (n, vertical) => {
    const box = await page.locator('#sculpt-canvas').boundingBox({timeout: 4000}).catch(() => null);
    if (!box) { console.log('  (no canvas to drag)'); return; }
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      if (vertical) {
        const x = box.x + box.width * t;
        await page.mouse.move(x, box.y + box.height * 0.35);
        await page.mouse.down(); await page.mouse.move(x, box.y + box.height * 0.65, {steps: 8}); await page.mouse.up();
      } else {
        const y = box.y + box.height * (0.32 + 0.36 * t);
        await page.mouse.move(box.x + box.width * 0.3, y);
        await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.72, y, {steps: 10}); await page.mouse.up();
      }
    }
  };

  await snap('00-opening');
  await page.locator('#skip-opening').click({timeout: 8000}).catch(() => console.log('no #skip-opening'));
  await page.waitForTimeout(700);
  await snap('01-after-skip');
  if (await page.locator('#start-button').isVisible().catch(() => false)) { await page.locator('#start-button').click(); await page.waitForTimeout(900); }
  await snap('02-world-before-move');
  // 新手必须自己走一步才会解锁取泥台：记录这一步的代价
  await page.keyboard.down('w'); await page.waitForTimeout(800); await page.keyboard.up('w');
  await page.waitForTimeout(500);
  await snap('02b-world-after-move');

  // 工位牌可读性：世界里所有 station 标记
  rec._worldPins = await page.evaluate(() => [...document.querySelectorAll('[class*=station], [class*=pin]')].map((e) => {
    const r = e.getBoundingClientRect();
    return { cls: (e.className || '').toString().slice(0, 30), text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20), wh: [Math.round(r.width), Math.round(r.height)] };
  }).filter((x) => x.wh[0] > 0).slice(0, 24));

  const station = async (id, name) => {
    await page.evaluate((sid) => window.__terra.teleport(sid), id);
    await page.waitForTimeout(500);
    await page.evaluate((sid) => window.__terra.openStation(sid), id);
    await page.waitForTimeout(900);
    await snap(name);
  };

  await page.evaluate(() => window.__terra.openStation('clay'));
  await page.waitForTimeout(800);
  await snap('03-clay');
  await page.locator('#fresh-clay').click({timeout: 6000}).catch(() => console.log('no #fresh-clay'));
  await page.waitForTimeout(700);
  await snap('03b-clay-collected');

  await station('wheel', '04-wheel');
  await drag(6, false);
  await page.waitForTimeout(400);
  await snap('04b-wheel-drawn');
  await page.locator('#save-editor').click().catch(() => {});
  await page.waitForTimeout(600);

  await station('carve', '05-carve');
  await drag(4, false);
  await page.waitForTimeout(400);
  await snap('05b-carve-drawn');
  await page.locator('#save-editor').click().catch(() => {});
  await page.waitForTimeout(600);

  await station('paint', '06-paint');
  await drag(9, false);
  await page.waitForTimeout(400);
  await snap('06b-paint-drawn');
  await page.locator('#save-editor').click().catch(() => {});
  await page.waitForTimeout(600);

  // 窑炉：先记录"教程门禁"能否挡住新手，再解除教程限制继续流程
  await page.evaluate(() => window.__terra.teleport('kiln'));
  rec._kilnGate = await page.evaluate(async () => {
    window.__terra.openKiln();
    await new Promise((r) => setTimeout(r, 400));
    return { tutorial: JSON.stringify(window.__terra.state.tutorial), toast: (document.querySelector('.toast, #toast') || {}).textContent || '' };
  });
  await page.evaluate(() => window.__terra.closeTask?.());
  await page.waitForTimeout(300);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__terra.openKiln());
  await page.waitForTimeout(800);
  await snap('07-kiln');
  await page.locator('#fire-button').click().catch(() => console.log('no fire'));
  await page.waitForTimeout(400);
  const stokeBox = await page.locator('#stoke-button').boundingBox().catch(() => null);
  if (stokeBox) {
    for (let i = 0; i < 9; i++) {
      await page.mouse.move(stokeBox.x + stokeBox.width / 2, stokeBox.y + stokeBox.height / 2);
      await page.mouse.down(); await page.waitForTimeout(1100); await page.mouse.up(); await page.waitForTimeout(450);
    }
  }
  await page.waitForTimeout(600);
  await snap('07b-kiln-done');
  await page.locator('#fire-button').click().catch(() => {});
  await page.waitForTimeout(700);

  // 预览 → 提交
  await page.evaluate(() => window.__terra.teleport('serve'));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__terra.openStation('serve'));
  await page.waitForTimeout(900);
  await snap('08-review');
  await page.locator('#confirm-review').click().catch(() => console.log('no confirm'));
  await page.waitForTimeout(1200);
  await snap('09-settlement');
  const det = page.locator('.settlement-details summary');
  if (await det.count()) { await det.click().catch(() => {}); await page.waitForTimeout(300); await snap('09b-settlement-open'); }
  await page.locator('#result-next').click().catch(() => {});
  await page.waitForTimeout(900);
  await snap('10-retry');

  await page.evaluate(() => window.__terra.closeTask());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__terra.openCityMap());
  await page.waitForTimeout(900);
  await snap('11-map');
  await page.evaluate(() => window.__terra.closeTask());
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__terra.openUpgrades());
  await page.waitForTimeout(800);
  await snap('12-upgrades');
  await page.evaluate(() => window.__terra.closeTask());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__terra.showHelp());
  await page.waitForTimeout(600);
  await snap('13-help');
  await page.evaluate(() => window.__terra.hideHelp());

  out[tag] = rec;
  await ctx.close();
}

try {
  if (WHICH !== 'phone') await run('desktop', {width: 1280, height: 800}, false);
  if (WHICH !== 'desktop') await run('phone', {width: 393, height: 852}, true);
} finally {
  await b.close();
  writeFileSync(OUT + '/playthrough.json', JSON.stringify(out, null, 1));
  for (const tag of Object.keys(out)) {
    for (const [k, v] of Object.entries(out[tag])) {
      if (k.startsWith('_')) continue;
      console.log('\n### ' + tag + ' / ' + k + (v.state ? ' ' + JSON.stringify(v.state) : ''));
      console.log('  top: ' + v.rank.slice(0, 6).map((r) => r.score + ' ' + r.text.slice(0, 18) + ' [' + r.font + 'px,' + r.areaPct + '%]').join(' | '));
      if (v.overflow && v.overflow.scrollH > v.overflow.clientH + 2) console.log('  OVERFLOW ' + JSON.stringify(v.overflow));
      if (v.clipped.length) console.log('  CLIPPED ' + JSON.stringify(v.clipped));
      if (v.disabled.length) console.log('  DISABLED ' + JSON.stringify(v.disabled.slice(0, 5)));
      console.log('  small=' + v.smallTargetCount + ' rotate=' + v.rotate);
      console.log('  text: ' + v.screenText.slice(0, 10).join(' / '));
    }
  }
}
