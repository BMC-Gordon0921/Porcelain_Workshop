import test from 'node:test';
import assert from 'node:assert/strict';

// storage.js 在模块顶层读 __MINITOOL__ 和 window，所以每个场景都要先造环境再全新 import。
// 返回的 store 就是"浏览器"里那份持久数据：第二次 import 复用它，等价于刷新页面。
function browserEnv({ bridge = null, throwing = false } = {}) {
  const store = new Map();
  const jitter = throwing ? { setItem() { throw new Error('storage denied'); }, getItem() { return null; }, removeItem() {} } : null;
  const localStorage = jitter || {
    setItem(k, v) { store.set(k, String(v)); },
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    removeItem(k) { store.delete(k); },
  };
  globalThis.window = { xhs: bridge ? { miniTool: bridge } : undefined, localStorage, sessionStorage: localStorage };
  globalThis.__MINITOOL__ = true;
  return store;
}

let seq = 0;
const fresh = () => import(`../src/platform/storage.js?case=${++seq}`);

test('小工具产物放到普通网站：没有容器桥就回退 localStorage，刷新后存档还在', async () => {
  const store = browserEnv();
  const first = await fresh();
  assert.equal(await first.initStorage(['k']), 'localStorage');
  first.writeStorage('k', 'hello');
  assert.equal(store.get('k'), 'hello', '确实写进了 localStorage');

  const second = await fresh(); // 模拟刷新：新模块实例，同一份 store
  assert.equal(await second.initStorage(['k']), 'localStorage');
  assert.equal(second.readStorage('k'), 'hello', '刷新后读回存档');
  second.removeStorage('k');
  assert.equal(store.has('k'), false);
});

test('容器里有 xhs.miniTool 桥时仍走容器存储，不碰 localStorage', async () => {
  const saved = new Map();
  let localCalls = 0;
  const store = browserEnv({
    bridge: {
      async getStorage({ key }) { return { data: saved.has(key) ? JSON.stringify(saved.get(key) + '') : null }; },
      async setStorage({ key, data }) { saved.set(key, data); },
      async removeStorage({ key }) { saved.delete(key); },
    },
  });
  store.set = store.set.bind(store);
  const mod = await fresh();
  const realSet = window.localStorage.setItem;
  window.localStorage.setItem = (...a) => { localCalls++; return realSet(...a); };
  assert.equal(await mod.initStorage(['k']), 'miniTool');
  mod.writeStorage('k', 'in-container');
  assert.equal(localCalls, 0, '容器里一行都不写 localStorage');
  assert.equal(mod.readStorage('k'), 'in-container');
});

test('浏览器存储被禁用时不崩，退化成内存态', async () => {
  browserEnv({ throwing: true });
  const mod = await fresh();
  assert.equal(await mod.initStorage(['k']), 'memory');
  mod.writeStorage('k', 'only-this-session');
  assert.equal(mod.readStorage('k'), 'only-this-session');
});
