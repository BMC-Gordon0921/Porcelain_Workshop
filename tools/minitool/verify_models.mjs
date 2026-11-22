// 容器内几何加载专项：四站分块是否都注入/解码成功、切章是否有「工坊加载失败」。
// 用法：node tools/minitool/verify_models.mjs <workbench-url> [outDir]
//   先起容器：redapp dev --dir dist-minitool --no-open --env prod --agent
import {chromium} from '../../qa/pw/node_modules/playwright-core/index.mjs';
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const url = process.argv[2];
const outDir = process.argv[3] || 'qa/minitool';
if (!url) throw new Error('usage: node tools/minitool/verify_models.mjs <workbench-url> [outDir]');
await mkdir(outDir, {recursive: true});

const errors = [];
const failedRequests = [];
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({viewport: {width: 430, height: 932}, deviceScaleFactor: 2});
page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('response', response => {
  if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
});

await page.goto(url, {waitUntil: 'domcontentloaded'});
let frame = null;
for (let attempt = 0; attempt < 120 && !frame; attempt += 1) {
  frame = page.frames().find(candidate => candidate.url().includes('/app/'));
  if (!frame) await page.waitForTimeout(250);
}
if (!frame) throw new Error('未找到小工具运行帧（iframe /app/）');

const summary = {workbench: url, appUrl: frame.url(), chapters: [], steps: {}, errors, failedRequests};
await frame.waitForFunction(() => !!document.getElementById('app'), null, {timeout: 30000});
await frame.waitForSelector('#opening-background canvas', {timeout: 30000});

// 首屏：主场景（第 1 站）加载
await frame.waitForFunction(
  () => document.querySelector('#opening-background canvas')?.dataset.loading === 'false',
  null,
  {timeout: 90000}
);
summary.steps.firstScene = true;

// 展开地图，逐章切换，看每一章的 3D 预览是否加载成功
await frame.evaluate(() => document.getElementById('unfold-map')?.click());
await frame.waitForTimeout(800);

const chapters = await frame.evaluate(() => {
  const list = [...document.querySelectorAll('[data-chapter]')].map(el => ({
    index: Number(el.dataset.chapter),
    label: (el.textContent || '').trim().slice(0, 20)
  }));
  return list.sort((a, b) => a.index - b.index);
});

for (const chapter of chapters) {
  const record = {index: chapter.index, label: chapter.label};
  await frame.evaluate(i => {
    const tab = document.querySelector(`[data-chapter="${i}"]`);
    tab?.click();
  }, chapter.index);
  await frame.waitForTimeout(400);
  try {
    await frame.waitForFunction(
      () => {
        const canvas = document.querySelector('#opening-scene-carousel canvas');
        if (!canvas) return false;
        if (canvas.dataset.loading === 'error') return true;
        return canvas.dataset.loading === 'false';
      },
      null,
      {timeout: 45000}
    );
  } catch {
    record.timeout = true;
  }
  record.state = await frame.evaluate(() => {
    const canvas = document.querySelector('#opening-scene-carousel canvas');
    const status = document.querySelector('#opening-scene-carousel .scene-load');
    const reason = status?.querySelector('small')?.textContent || null;
    const label = status?.textContent || null;
    return {
      canvasLoading: canvas?.dataset.loading ?? null,
      canvasAttr: canvas ? `${canvas.width}x${canvas.height}` : null,
      landmark: canvas?.dataset.landmark ?? null,
      statusVisible: status ? getComputedStyle(status).display !== 'none' && status.getBoundingClientRect().height > 0 : false,
      statusLabel: label ? label.trim().slice(0, 40) : null,
      reason,
      models: Object.fromEntries(Object.entries(window.__TERRA_MODEL || {}).map(([k, v]) => [k, v.filter(Boolean).length]))
    };
  });
  record.ok = record.state.canvasLoading === 'false' && !record.state.statusVisible;
  summary.chapters.push(record);
  await page.screenshot({path: join(outDir, `models-chapter-${chapter.index}.png`)});
}

summary.steps.allChapters = summary.chapters.every(c => c.ok);

// 进入工坊后，主世界场景也要能切；这里只确认浏览器侧的模型脚本全部注入完成
await frame.evaluate(() => {
  const start = document.getElementById('start-button');
  if (start) start.click();
});
await page.waitForTimeout(3000);
summary.afterEnter = await frame.evaluate(() => ({
  models: Object.fromEntries(Object.entries(window.__TERRA_MODEL || {}).map(([k, v]) => [k, v.filter(Boolean).length])),
  scripts: [...document.querySelectorAll('script[src*="models/"]')].map(s => s.getAttribute('src')),
  worldLoading: document.getElementById('world')?.dataset.loading ?? null
}));

summary.pass = summary.steps.firstScene && summary.steps.allChapters && errors.length === 0 && failedRequests.length === 0;
await writeFile(join(outDir, 'verify-models.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.pass ? 0 : 1);
