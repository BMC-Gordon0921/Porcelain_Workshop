import test from 'node:test';
import assert from 'node:assert/strict';

// 最小的 classList 替身：只在 node 里验证开合状态机，不动真 DOM。
function fakeOverlay(initial = ['hidden']) {
  const set = new Set(initial);
  return {
    classList: {
      contains: (name) => set.has(name),
      add: (...names) => names.forEach((n) => set.add(n)),
      remove: (...names) => names.forEach((n) => set.delete(n)),
    },
    attrs: new Map(),
    setAttribute(k, v) { this.attrs.set(k, v); },
    removeAttribute(k) { this.attrs.delete(k); },
    get isClosing() { return set.has('is-closing'); },
    get isHidden() { return set.has('hidden'); },
  };
}

const { openOverlay, closeOverlay, isOverlayOpen, OVERLAY_MS } = await import('../src/overlay.js');

test('关闭先播退场动画，再挂 hidden', () => {
  const el = fakeOverlay([]);
  closeOverlay(el);
  assert.equal(el.isClosing, true);
  assert.equal(el.isHidden, false);
  assert.equal(isOverlayOpen(el), false, '退场中就当已关闭，面板开合状态立即生效');
  assert.equal(el.attrs.get('aria-hidden'), 'true');
  assert.ok(OVERLAY_MS >= 120 && OVERLAY_MS <= 180);
});

test('退场途中重新打开会取消定时器，不会又被藏起来', async () => {
  const el = fakeOverlay([]);
  closeOverlay(el);
  openOverlay(el);
  assert.equal(el.isClosing, false);
  assert.equal(isOverlayOpen(el), true);
  await new Promise((r) => setTimeout(r, OVERLAY_MS + 60));
  assert.equal(el.isHidden, false, '取消后不应残留 hidden');
});

test('已经关闭时再关一次不会重复排定时器', () => {
  const el = fakeOverlay(['hidden']);
  let done = 0;
  closeOverlay(el, () => { done += 1; });
  assert.equal(done, 1);
  assert.equal(el.isClosing, false);
});