// Capture container probe results from the 小红书 minitool simulator workbench.
// Usage: node tools/minitool/probe/capture.mjs <workbench-url> [out.json]
import { chromium } from '../../../qa/pw/node_modules/playwright-core/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.argv[2];
const outFile = process.argv[3] || 'qa/minitool/probe-result.json';
if (!url) {
  console.error('usage: node tools/minitool/probe/capture.mjs <workbench-url> [out.json]');
  process.exit(2);
}

await mkdir(path.dirname(outFile), { recursive: true });
await mkdir('qa/minitool', { recursive: true });

const browser = await chromium.launch({
  channel: process.env.CHROME_CHANNEL || 'msedge',
  headless: true,
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

async function readAll() {
  let best = null;
  for (const frame of page.frames()) {
    const r = await frame.evaluate(() => window.__PROBE_RESULT || null).catch(() => null);
    if (!r) continue;
    if (!best || (r.done && !best.result.done)) best = { scope: frame.url(), result: r };
  }
  return best;
}

let result = null;
let scope = null;
const deadline = Date.now() + 90000;
while (Date.now() < deadline) {
  const hit = await readAll();
  if (hit) {
    result = hit.result;
    scope = hit.scope;
    if (result && result.done) break;
  }
  await page.waitForTimeout(1000);
}

// also collect any console JSON our page printed
const shot = 'qa/minitool/probe-page.png';
await page.screenshot({ path: shot, fullPage: false }).catch(() => {});

const payload = {
  url,
  capturedAt: new Date().toISOString(),
  scope,
  frames: page.frames().map((f) => f.url()).slice(0, 8),
  result,
  logs: logs.slice(-120),
};
await writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');
console.log(JSON.stringify(payload, null, 2));
await browser.close();
