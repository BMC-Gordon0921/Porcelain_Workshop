// 存储适配层。
//
// 桌面/原生构建：继续用 localStorage（并兼容读取历史 sessionStorage），行为与改造前一致。
// 小工具构建：只能走容器 Storage（window.xhs.miniTool.setStorage/getStorage）。
// 规范明确禁止在容器里回退到 localStorage / sessionStorage / IndexedDB / Cookie / Cache API，
// 因此这里在 SDK 缺失或调用失败时只保留内存态（本次会话有效），不做浏览器存储回退。
//
// 容器 Storage 是异步 API，而游戏逻辑是同步读写，所以策略是：
//   启动时 initStorage(keys) 一次性把已知 key 读进内存缓存，之后同步读缓存；
//   写入先进缓存，再以去抖方式异步落盘（存档每秒写一次，直接透传会打爆 IPC）。
const MINITOOL = typeof __MINITOOL__ !== 'undefined' && __MINITOOL__;
const cache = new Map();
const queue = new Map();
let tool = null;
let mode = MINITOOL ? 'memory' : 'localStorage';
let flushTimer = 0;

const FLUSH_DELAY = 600;

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

export async function initStorage(keys) {
  if (!MINITOOL) return mode;
  tool = resolveTool();
  if (!tool) return mode;
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

export function storageMode() {
  return mode;
}

export function readStorage(key) {
  if (!MINITOOL) {
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
  return cache.has(key) ? cache.get(key) : null;
}

function flushKey(key) {
  const value = queue.get(key);
  queue.delete(key);
  if (value === undefined || !tool) return;
  try {
    const pending = tool.setStorage({key, data: JSON.stringify(value)});
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  } catch {}
}

export function flushStorage() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = 0;
  }
  for (const key of [...queue.keys()]) flushKey(key);
}

export function writeStorage(key, value) {
  const text = String(value);
  if (!MINITOOL) {
    try {
      window.localStorage.setItem(key, text);
    } catch {}
    try {
      window.sessionStorage.setItem(key, text);
    } catch {}
    return;
  }
  if (cache.get(key) === text && !queue.has(key)) return;
  cache.set(key, text);
  queue.set(key, text);
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = 0;
      flushStorage();
    }, FLUSH_DELAY);
  }
}

export function removeStorage(key) {
  cache.delete(key);
  queue.delete(key);
  if (!MINITOOL) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
    try {
      window.sessionStorage.removeItem(key);
    } catch {}
    return;
  }
  if (!tool || typeof tool.removeStorage !== 'function') return;
  try {
    const pending = tool.removeStorage({key});
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  } catch {}
}
