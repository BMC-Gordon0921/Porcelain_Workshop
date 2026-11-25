// 存储适配层。
//
// 四种运行环境（mode）：
//   localStorage —— 普通网页构建；或者小工具产物部署在没有容器桥的普通网站上；
//   miniTool     —— 小红书容器（window.xhs.miniTool），只能走容器 Storage；
//   ps           —— 2AIGC Pages 站点数据服务（window.PS.me），访客私有、跨访问持久；
//   memory       —— 后端不可用时的兜底，本次会话有效。
// 规范禁止在小红书容器里用 localStorage / IndexedDB / Cookie，所以容器内绝不回退浏览器存储；
// 反过来，部署在普通网站上时没有 xhs 桥，就必须回退，否则每次刷新都丢档。
//
// 异步后端（容器 / 站点数据服务）与"游戏逻辑同步读写"的差距用这套办法抹平：
//   启动时 initStorage(keys) 一次性把已知 key 读进内存缓存，之后同步读缓存；
//   写入先进缓存，再以去抖方式异步落盘（存档每秒写一次，直接透传会打爆 IPC / 频率限制）。
const MINITOOL = typeof __MINITOOL__ !== 'undefined' && __MINITOOL__;
const cache = new Map();
const queue = new Map();
const chunkCount = new Map();
let tool = null;
let mode = MINITOOL ? 'memory' : 'localStorage';
let flushTimer = 0;
let psErrorAt = 0;

const FLUSH_DELAY = 600;
const PS_SDK_URL = 'https://pages.2aigc.space/ps-sdk.js';
// 站点数据服务单行上限 8KB，切片留出 JSON 包装的余量。
const PS_CHUNK = 7000;

function resolveTool() {
  const xhs = typeof window !== 'undefined' ? window.xhs : null;
  const miniTool = xhs && xhs.miniTool;
  if (!miniTool) return null;
  return typeof miniTool.setStorage === 'function' && typeof miniTool.getStorage === 'function' ? miniTool : null;
}

function parseStored(data) {
  if (typeof data !== 'string') return null;
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed === 'string') return parsed;
  } catch {}
  return data;
}

function readBrowser(key) {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {}
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeBrowser(key, text) {
  try { window.localStorage.setItem(key, text); } catch {}
  try { window.sessionStorage.setItem(key, text); } catch {}
}

function removeBrowser(key) {
  try { window.localStorage.removeItem(key); } catch {}
  try { window.sessionStorage.removeItem(key); } catch {}
}

function browserStorageUsable() {
  try {
    window.localStorage.setItem('__terra_probe__', '1');
    window.localStorage.removeItem('__terra_probe__');
    return true;
  } catch {
    return false;
  }
}

// ── 2AIGC Pages 站点数据服务 ──────────────────────────────────────────────
// SDK 是**同源**的：脚本可以从 pages.2aigc.space 拉，但请求打回站点自己的 /_ps，
// 所以必须实际跑在 2AIGC Pages 域名下才可用。本地 http 预览不拉外部脚本，免得拖慢启动。
async function loadSiteSdk() {
  if (typeof window === 'undefined') return null;
  if (window.PS && window.PS.me) return window.PS;
  if (typeof location === 'undefined' || location.protocol !== 'https:') return null;
  await new Promise(resolve => {
    const el = document.createElement('script');
    el.src = PS_SDK_URL;
    el.async = true;
    el.onload = el.onerror = () => resolve();
    document.head.appendChild(el);
    setTimeout(resolve, 2500);
  });
  return window.PS && window.PS.me ? window.PS : null;
}

function psError(message) {
  const now = Date.now();
  if (now - psErrorAt < 30000) return; // 网络抖动时不刷屏
  psErrorAt = now;
  try {
    window.dispatchEvent(new CustomEvent('terra:storage-error', {detail: {message}}));
  } catch {}
}

function toBase64(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

function fromBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// 像素快照占了存档九成体积（112×112 网格 × 4 站），gzip 之后通常只剩几 KB，
// 既压到 1–2 条记录里，也远离访客 50–500KB 的配额上限。
async function packText(text) {
  if (typeof CompressionStream !== 'function' || typeof Blob !== 'function') return text;
  try {
    const stream = new Blob([new TextEncoder().encode(text)]).stream().pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    return 'gz:' + toBase64(new Uint8Array(buffer));
  } catch {
    return text;
  }
}

async function unpackText(text) {
  if (typeof text !== 'string' || !text.startsWith('gz:')) return text;
  const bytes = fromBase64(text.slice(3));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

async function psRead(key) {
  const meta = await window.PS.me.get(key + '__n');
  if (!meta || !meta.n) return null;
  const count = Number(meta.n) || 0;
  const parts = await Promise.all(Array.from({length: count}, (_, i) => window.PS.me.get(key + '__c' + i)));
  chunkCount.set(key, count);
  return {text: await unpackText(parts.map(p => (typeof p === 'string' ? p : '')).join('')), at: Number(meta.at) || 0};
}

async function psWrite(key, text) {
  const packed = await packText(text);
  const chunks = [];
  for (let i = 0; i < packed.length; i += PS_CHUNK) chunks.push(packed.slice(i, i + PS_CHUNK));
  if (!chunks.length) chunks.push('');
  const previous = chunkCount.get(key) || 0;
  await Promise.all(chunks.map((chunk, i) => window.PS.me.set(key + '__c' + i, chunk)));
  await window.PS.me.set(key + '__n', {n: chunks.length, at: Date.now()});
  // 记录变短时清掉上一次留下的多余切片
  const stale = [];
  for (let i = chunks.length; i < previous; i++) stale.push(window.PS.me.del(key + '__c' + i));
  if (stale.length) await Promise.all(stale);
  chunkCount.set(key, chunks.length);
}

async function psInit(keys) {
  await Promise.all(keys.map(async key => {
    let remote = null;
    try {
      remote = await psRead(key);
    } catch (err) {
      psError('读取云端存档失败：' + ((err && err.message) || '网络异常'));
    }
    const local = readBrowser(key);
    const localAt = Number(readBrowser(key + '__at')) || 0;
    if (remote && (!local || remote.at >= localAt)) {
      // 云端更新（换设备回来 / 换了部署地址）：写回本地镜像
      cache.set(key, remote.text);
      writeBrowser(key, remote.text);
      writeBrowser(key + '__at', String(remote.at));
    } else if (local !== null) {
      // 本地比云端新（离线玩过一局）：启动后补一次上传
      cache.set(key, local);
      queue.set(key, local);
    }
  }));
  if (queue.size) scheduleFlush();
}

export async function initStorage(keys) {
  tool = resolveTool();
  // 不管哪个构建，只要没有容器桥、又跑在 2AIGC Pages 域名下，就用站点数据服务。
  if (!tool && (await loadSiteSdk())) {
    mode = 'ps';
    await psInit(keys);
    return mode;
  }
  if (!MINITOOL) return mode;
  if (tool) {
    mode = 'miniTool';
    await Promise.all(keys.map(async key => {
      try {
        const result = await tool.getStorage({key});
        const value = parseStored(result && result.data);
        if (value !== null) cache.set(key, value);
      } catch {}
    }));
    return mode;
  }
  // 没有容器桥也不是 2AIGC Pages：退浏览器存储，至少刷新不丢档。
  if (browserStorageUsable()) mode = 'localStorage';
  return mode;
}

export function storageMode() {
  return mode;
}

export function readStorage(key) {
  if (mode === 'localStorage') return readBrowser(key);
  if (cache.has(key)) return cache.get(key);
  return mode === 'ps' ? readBrowser(key) : null;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = 0;
    flushStorage();
  }, FLUSH_DELAY);
  flushTimer.unref?.();
}

// 返回 Promise，方便启动/卸载时等这一轮落盘（测试也用它）。
function flushKey(key) {
  const value = queue.get(key);
  queue.delete(key);
  if (value === undefined) return Promise.resolve();
  if (mode === 'ps') {
    return psWrite(key, value).catch(err => {
      queue.set(key, value); // 留着下次重试，别丢这次进度
      psError('存档上传失败：' + ((err && err.message) || '网络异常'));
      if (!flushTimer) {
        flushTimer = setTimeout(() => { flushTimer = 0; flushStorage(); }, 4000);
        flushTimer.unref?.(); // 浏览器里没有 unref；node 测试里别拿这个定时器吊住进程
      }
    });
  }
  if (!tool) return Promise.resolve();
  try {
    const pending = tool.setStorage({key, data: JSON.stringify(value)});
    return pending && typeof pending.catch === 'function' ? pending.catch(() => {}) : Promise.resolve();
  } catch {
    return Promise.resolve();
  }
}

export function flushStorage() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = 0;
  }
  const jobs = [...queue.keys()].map(flushKey);
  return Promise.all(jobs);
}

export function writeStorage(key, value) {
  const text = String(value);
  if (mode === 'localStorage') {
    writeBrowser(key, text);
    return;
  }
  if (mode === 'memory') {
    cache.set(key, text);
    return;
  }
  if (mode === 'ps') {
    writeBrowser(key, text); // 本地镜像：云端挂了也不丢
    writeBrowser(key + '__at', String(Date.now()));
  }
  if (cache.get(key) === text && !queue.has(key)) return;
  cache.set(key, text);
  queue.set(key, text);
  scheduleFlush();
}

export function removeStorage(key) {
  cache.delete(key);
  queue.delete(key);
  if (mode === 'localStorage') {
    removeBrowser(key);
    return;
  }
  if (mode === 'ps') {
    removeBrowser(key);
    removeBrowser(key + '__at');
    if (!window.PS || !window.PS.me) return;
    (async () => {
      const meta = await window.PS.me.get(key + '__n').catch(() => null);
      const jobs = [window.PS.me.del(key + '__n')];
      const count = Number((meta && meta.n) || chunkCount.get(key)) || 0;
      for (let i = 0; i < count; i++) jobs.push(window.PS.me.del(key + '__c' + i));
      await Promise.all(jobs).catch(() => {});
    })();
    chunkCount.delete(key);
    return;
  }
  if (!tool || typeof tool.removeStorage !== 'function') return;
  try {
    const pending = tool.removeStorage({key});
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  } catch {}
}
