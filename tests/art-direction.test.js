// 美术方向层守卫：色值只能来自令牌区，层必须排在 redesign.css 之后。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../src/art-direction.css', import.meta.url), 'utf8');
const redesign = readFileSync(new URL('../src/redesign.js', import.meta.url), 'utf8');
const tokenBlock = /:root\{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';

test('art-direction.css 在 redesign.css 之后加载', () => {
  const i = redesign.indexOf("'./redesign.css'");
  const j = redesign.indexOf("'./art-direction.css'");
  assert.ok(i >= 0 && j > i, 'art-direction.css 必须排在 redesign.css 之后');
});

test('令牌区之外没有硬编码色值', () => {
  const outside = css.split(tokenBlock).join('');
  const stray = [...outside.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
  assert.deepEqual(stray, [], '非令牌区色值: ' + stray.join(', '));
});

test('调色板不超过 16 色', () => {
  const palette = [...tokenBlock.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase());
  assert.ok(palette.length > 0, '令牌区应有色值');
  assert.ok(new Set(palette).size <= 16, '调色板超出 16 色: ' + new Set(palette).size);
});

test('旧令牌被重定向到新调色板', () => {
  for (const token of ['--scene-accent', '--scene-light', '--paper', '--border']) {
    assert.match(tokenBlock, new RegExp(token + ':\\s*var\\(--xz-'), token + ' 应指向 --xz-* 令牌');
  }
});
