import test from 'node:test';
import assert from 'node:assert/strict';
import {PLACES} from '../src/places.js';
import {PALETTE, COLOR_NAMES, setGlaze} from '../src/sculpture.js';

test('每个站点都有自己的釉色与名称', () => {
  for (const place of PLACES) {
    assert.match(place.color, /^#[0-9a-f]{6}$/i, place.id + ' 缺少站点色');
    assert.ok(place.glaze, place.id + ' 缺少釉色名');
  }
  assert.equal(new Set(PLACES.map(p => p.color)).size, PLACES.length);
});

test('setGlaze 把站点色调色板与名称写进上色台', () => {
  setGlaze('#aa553f', '朱砂釉');
  assert.equal(PALETTE[2], '#aa553f');
  assert.equal(COLOR_NAMES[2], '朱砂釉');
  setGlaze('#315fa9', '钴蓝');
});
