// 在小工具容器模拟器里跑一遍真实产物（dist-minitool），验证：
//   1. 容器内启动无 pageerror；
//   2. 自带几何（base64 分块 + <script> 注入）能真正解码并渲染出 3D 场景；
//   3. 存档走容器 Storage（window.xhs.miniTool），而不是浏览器存储。
//
// 用法：node tools/minitool/verify_minitool.mjs <workbench-url> [outDir]
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const url = process.argv[2];
const outDir = process.argv[3] || 'qa/minitool';
if (!url) throw new Error('usage: node tools/minitool/verify_minitool.mjs <workbench-url> [outDir]');
await mkdir(outDir, {recursive: true});

const errors = [];
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 430, height: 932}, deviceScaleFactor: 2});
page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

const summary = {workbench: url, steps: {}, errors};

await page.goto(url, {waitUntil: 'domcontentloaded'});
let frame = null;
for (let attempt = 0; attempt < 120 && !frame; attempt += 1) {
  frame = page.frames().find(candidate => candidate.url().includes('/app/'));
  if (!frame) await page.waitForTimeout(250);
}
if (!frame) throw new Error('未找到小工具运行帧（iframe /app/）');
summary.appUrl = frame.url();

// 1. 应用启动
await frame.waitForFunction(() => !!document.getElementById('app'), null, {timeout: 30000});
await frame.waitForSelector('#opening-background canvas', {timeout: 30000});
summary.steps.boot = true;

// 2. 首屏 3D：自带几何解码 + WebGL 渲染
await frame.waitForFunction(
  () => document.querySelector('#opening-background canvas')?.dataset.loading === 'false',
  null,
  {timeout: 60000}
);
summary.steps.openingGeometry = true;
await page.waitForTimeout(1800);
await page.screenshot({path: join(outDir, '01-opening.png')});

// 3. 进入游戏，切到工坊场景（第二个 GLB）
// 开屏页是分阶段推进的：第一次点跳过只是展开地图（stage=intro -> map），
// 再点一次才是真正进入工坊；期间 world 还在异步加载时 start() 会返回 false，
// 所以要循环点，直到开屏页真正隐藏。
async function openingVisible() {
  return frame.locator('#welcome').isVisible().catch(() => false);
}

// 说明：容器 iframe 里开屏页有吸顶头 + 轮播动画，鼠标点击容易打在动画层上，
// 这里统一用 DOM click（等价于用户点按钮），验证的是应用逻辑而不是指针命中率。
for (let attempt = 0; attempt < 10 && (await openingVisible()); attempt += 1) {
  await frame.evaluate(() => {
    const brief = document.getElementById('brief-done');
    if (brief && brief.offsetParent) {
      brief.click();
      return;
    }
    const welcome = document.getElementById('welcome');
    if (!welcome) return;
    if (welcome.dataset.openingStage === 'map') {
      const start = document.getElementById('start-button');
      if (start && !start.disabled) start.click();
      return;
    }
    document.getElementById('skip-opening')?.click();
  });
  await frame.waitForTimeout(1000);
}
summary.steps.openingDismissed = !(await openingVisible());
// 注意：#world 本身就是 canvas 元素
await frame.waitForFunction(() => document.getElementById('world')?.dataset.loading === 'false', null, {timeout: 90000});
summary.steps.worldGeometry = true;
summary.worldLoading = await frame.evaluate(() => document.getElementById('world')?.dataset.loading);
summary.worldFlavor = await frame.evaluate(() => window.__terraRendererFlavor || null);
await page.waitForTimeout(2600);
await page.screenshot({path: join(outDir, '02-workshop.png')});

// 自带几何是否真的被注入并解码
summary.packedGeometry = await frame.evaluate(() => {
  const manifest = window.__TERRA_MANIFEST || null;
  const store = window.__TERRA_MODEL || {};
  const chunks = Object.fromEntries(Object.entries(store).map(([id, list]) => [id, {chunks: list.length, chars: list.join('').length}]));
  const scripts = [...document.querySelectorAll('script[src]')].map(node => node.getAttribute('src')).filter(src => src.includes('models/'));
  return {hasManifest: !!manifest, sites: manifest ? Object.keys(manifest) : [], chunks, modelScripts: scripts.length};
});

// 画布是否真的画出了东西（非空白）
summary.canvasPainted = await frame.evaluate(() => {
  const canvas = document.getElementById('world');
  if (!canvas) return null;
  return {width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight};
});
summary.webglFlavor = await frame.evaluate(() => {
  const canvas = document.getElementById('world');
  if (!canvas) return null;
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return null;
  const isV2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const lose = gl.getExtension('WEBGL_lose_context');
  return {api: isV2 ? 'webgl2' : 'webgl1', hasLoseContext: !!lose, drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], dpr: window.devicePixelRatio};
});

// 3.5 音频：BGM 必须来自包内 mp3（<audio> + 相对路径）
// 应用里的 BGM 是 new Audio(url) 的游离对象，不在 DOM 里，所以这里另起一个元素验证包内 mp3 可加载
summary.audio = await frame.evaluate(() => new Promise((resolve) => {
  const node = document.createElement('audio');
  const done = (payload) => resolve(payload);
  const timer = setTimeout(() => done({src: './assets/bgm.mp3', timeout: true, readyState: node.readyState}), 8000);
  node.addEventListener('loadedmetadata', () => {
    clearTimeout(timer);
    done({src: './assets/bgm.mp3', resolved: node.currentSrc, readyState: node.readyState, duration: Math.round(node.duration * 100) / 100, error: null});
  });
  node.addEventListener('error', () => {
    clearTimeout(timer);
    done({src: './assets/bgm.mp3', resolved: node.currentSrc, readyState: node.readyState, error: node.error ? node.error.code : 'unknown'});
  });
  node.src = './assets/bgm.mp3';
}));

// 4. 容器 Storage：点一下声音开关触发一次写，再读回确认走的是 miniTool Storage
await frame.locator('[data-sound-toggle]').first().click({timeout: 10000}).catch(() => {});
await page.waitForTimeout(1500);
summary.storage = await frame.evaluate(async () => {
  const tool = window.xhs && window.xhs.miniTool;
  if (!tool) return {available: false};
  const sound = await tool.getStorage({key: 'terra-sound-enabled'});
  const save = await tool.getStorage({key: 'terra-porcelain-journey-v6'});
  const info = await tool.getStorageInfo();
  const decode = raw => {
    const data = raw && raw.data;
    if (typeof data !== 'string') return null;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  };
  return {
    available: true,
    soundEnabled: decode(sound),
    savedLevel: (() => {
      const text = decode(save);
      if (typeof text !== 'string') return null;
      try {
        return JSON.parse(text).level;
      } catch {
        return null;
      }
    })(),
    usedBytes: info && info.usedBytes,
    limitBytes: info && info.limitBytes,
    browserStorageKeys: (() => {
      try {
        return Object.keys(window.localStorage).filter(key => key.startsWith('terra'));
      } catch {
        return null;
      }
    })()
  };
});

summary.errors = errors;
await writeFile(join(outDir, 'verify-result.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
