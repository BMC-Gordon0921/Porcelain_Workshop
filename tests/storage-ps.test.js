import test from 'node:test';
import assert from 'node:assert/strict';

// 假的 2AIGC Pages 站点数据服务：只实现 PS.me 的 get/set/del，值放 Map 里。
// 换一次 import 但复用同一个 store，就等于"关掉页面再打开"。
function makePS({store = new Map(), failSet = false} = {}) {
  const calls = [];
  const ps = {
    me: {
      async get(k) { calls.push('get:' + k); return store.has(k) ? store.get(k) : null; },
      async set(k, v) { calls.push('set:' + k); if (failSet) throw new Error('rate limited'); store.set(k, v); },
      async del(k) { calls.push('del:' + k); store.delete(k); },
    },
  };
  return {ps, store, calls};
}

function makeWindow(ps, {browserStore = new Map()} = {}) {
  const events = [];
  const storage = {
    setItem(k, v) { browserStore.set(k, String(v)); },
    getItem(k) { return browserStore.has(k) ? browserStore.get(k) : null; },
    removeItem(k) { browserStore.delete(k); },
  };
  globalThis.window = {
    PS: ps,
    localStorage: storage,
    sessionStorage: storage,
    dispatchEvent(e) { events.push(e && e.detail); return true; },
  };
  globalThis.__MINITOOL__ = true;
  return {browserStore, events};
}

let seq = 0;
const fresh = () => import(`../src/platform/storage.js?ps=${++seq}`);

const SAVE_KEY = 'terra-porcelain-journey-v6';
// 造一个和真实存档同量级的负载：像素网格是数字数组，gzip 压得动
const bigSave = () => JSON.stringify({
  pixels: Array.from({length: 12544}, (_, i) => i % 4),
  sceneProgress: Array.from({length: 4}, () => Array.from({length: 12544}, (_, i) => (i * 7) % 4)),
  money: 120,
});

test('站点数据服务：存档切片上传，重新打开页面能读回', async () => {
  const {ps, store} = makePS();
  makeWindow(ps);
  const first = await fresh();
  assert.equal(await first.initStorage([SAVE_KEY]), 'ps');
  const payload = bigSave();
  first.writeStorage(SAVE_KEY, payload);
  await first.flushStorage();
  const meta = store.get(SAVE_KEY + '__n');
  assert.ok(meta && meta.n >= 1, '写了元数据');
  assert.ok(payload.length > 50000, '负载是真实量级');

  // 只保留云端数据，模拟换设备 / 清掉本地缓存
  const reopened = makePS({store});
  makeWindow(reopened.ps);
  const second = await fresh();
  assert.equal(await second.initStorage([SAVE_KEY]), 'ps');
  assert.equal(second.readStorage(SAVE_KEY), payload, '读回来的存档逐字节一致');
  // 每片都必须在 8KB 以内
  for (const [key, value] of store) if (key.endsWith('__c0') || key.includes('__c')) assert.ok(String(value).length <= 8192, key + ' 超过 8KB');
});

test('记录变短时清掉上一次的多余切片', async () => {
  const {ps, store} = makePS();
  makeWindow(ps);
  const mod = await fresh();
  await mod.initStorage([SAVE_KEY]);
  // 必须用压不动的负载才有多个切片：随机串 gzip 也瘦不下去
  const fat = Array.from({length: 800}, () => crypto.randomUUID()).join('');
  mod.writeStorage(SAVE_KEY, fat);
  await mod.flushStorage();
  const wide = store.get(SAVE_KEY + '__n').n;
  assert.ok(wide > 1, '第一次是多片，实际 ' + wide);
  mod.writeStorage(SAVE_KEY, 'small');
  await mod.flushStorage();
  assert.equal(store.get(SAVE_KEY + '__n').n, 1);
  assert.equal([...store.keys()].filter(k => k.startsWith(SAVE_KEY + '__c')).length, 1, '旧切片删掉了');
});

test('本地比云端新时，启动后把本地进度补传上去', async () => {
  const {ps, store} = makePS();
  store.set(SAVE_KEY + '__c0', 'old');
  store.set(SAVE_KEY + '__n', {n: 1, at: 1000});
  makeWindow(ps, {browserStore: new Map([[SAVE_KEY, 'new'], [SAVE_KEY + '__at', '2000']])});
  const mod = await fresh();
  assert.equal(await mod.initStorage([SAVE_KEY]), 'ps');
  assert.equal(mod.readStorage(SAVE_KEY), 'new', '本地更新的那份优先');
  await mod.flushStorage();
  // 补传之后用一次全新启动读回来核对（云端存的是 gzip 过的切片，不直接比对字符串）
  const reopened = makePS({store});
  makeWindow(reopened.ps);
  const second = await fresh();
  await second.initStorage([SAVE_KEY]);
  assert.equal(second.readStorage(SAVE_KEY), 'new', '本地进度补传成功');
});

test('云端写入失败时不丢数据，并抛出可提示的错误事件', async () => {
  const {ps} = makePS({failSet: true}); // 只让 set 失败，读取正常
  const {events} = makeWindow(ps);
  const mod = await fresh();
  await mod.initStorage([SAVE_KEY]);
  mod.writeStorage(SAVE_KEY, 'progress');
  await mod.flushStorage();
  assert.equal(mod.readStorage(SAVE_KEY), 'progress', '内存里还在');
  assert.equal(events.length, 1, '只提示一次，不刷屏');
  assert.match(events[0].message, /存档上传失败/);
});
