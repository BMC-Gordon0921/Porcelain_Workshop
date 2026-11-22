// 旋屏下的画布尺寸/指针换算：属性测试式为「本地点 → 屏幕点 → 反解回本地点」应当还原。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canvasPoint, canvasSize} from '../src/platform/canvas-metrics.js';

function fakeCanvas({w, h, rect}) {
  return {clientWidth: w, clientHeight: h, getBoundingClientRect: () => rect};
}

function setRotated(on) {
  if (on) globalThis.document = {documentElement: {dataset: {rotate: 'on'}}};
  else globalThis.document = {documentElement: {dataset: {}}};
}

test('未旋屏：直接减去 rect 左上角', () => {
  setRotated(false);
  const canvas = fakeCanvas({w: 400, h: 300, rect: {left: 20, top: 50, width: 400, height: 300}});
  assert.deepEqual(canvasPoint(canvas, 120, 150), {x: 100, y: 100, w: 400, h: 300});
});

test('旋屏 90°：四角与中心都能反解回原位', () => {
  setRotated(true);
  // 布局 400×300，绕中心旋转后包围盒变成 300×400。
  const w = 400, h = 300;
  const rect = {left: 246.5, top: 196, width: h, height: w};
  const canvas = fakeCanvas({w, h, rect});
  assert.deepEqual(canvasSize(canvas), {w, h});

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  // 顺时针 90°：(u,v) → 屏幕 (v - h/2 + cx, cy - (u - w/2))
  const toScreen = (u, v) => ({sx: cx + (v - h / 2), sy: cy - (u - w / 2)});

  const points = [
    [0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2], [SAMPLE_X, SAMPLE_Y],
  ];
  for (const [u, v] of points) {
    const {sx, sy} = toScreen(u, v);
    const back = canvasPoint(canvas, sx, sy);
    assert.ok(Math.abs(back.x - u) < 1e-6, `u ${u} → ${back.x}`);
    assert.ok(Math.abs(back.y - v) < 1e-6, `v ${v} → ${back.y}`);
  }
});

const SAMPLE_X = 137.25;
const SAMPLE_Y = 66.5;

test('旋屏只影响坐标，不影响尺寸来源（clientWidth 不受 transform 影响）', () => {
  setRotated(true);
  const canvas = fakeCanvas({w: 128, h: 96, rect: {left: 0, top: 0, width: 96, height: 128}});
  const {w, h} = canvasSize(canvas);
  assert.equal(w, 128);
  assert.equal(h, 96);
});

test('零尺寸画布不会给出 0（避免 setSize(0) 让缓冲失效）', () => {
  setRotated(false);
  const canvas = fakeCanvas({w: 0, h: 0, rect: {left: 0, top: 0, width: 0, height: 0}});
  assert.deepEqual(canvasSize(canvas), {w: 1, h: 1});
});
