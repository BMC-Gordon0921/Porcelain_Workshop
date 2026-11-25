import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {collectCodepoints} from '../tools/fonts/collect.mjs';

const root = process.cwd();
const fonts = join(root, 'src/assets/fonts');
const read = (name) => JSON.parse(readFileSync(join(fonts, name), 'utf8'));

test('圆体子集覆盖所有取字来源，缺字时 npm run font:round 才会通过', () => {
  const cmap = new Set(read('xz-round-cmap.json').codepoints);
  const unsupported = new Set(read('xz-round-cmap.json').unsupported || []);
  const wanted = collectCodepoints(root);
  const missing = wanted.filter((cp) => !cmap.has(cp) && !unsupported.has(cp));
  assert.deepEqual(missing.map((cp) => cp.toString(16)), [], '缺字码位');
});

test('取字清单是最新的（改了复制文案或 CHANGELOG 就要重跑）', () => {
  const recorded = read('xz-round-codepoints.json').codepoints;
  assert.deepEqual(recorded, collectCodepoints(root));
});

test('CHANGELOG 里的字必须在子集内：更新说明卡片直接渲染正文', () => {
  const data = read('xz-round-cmap.json');
  const cmap = new Set([...data.codepoints, ...(data.unsupported || [])]);
  const changelog = collectCodepoints(root).filter((cp) => cp > 0x2000);
  assert.ok(changelog.length > 100);
  const text = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const missing = [...new Set([...text].map((ch) => ch.codePointAt(0)))]
    .filter((cp) => cp > 0x20 && !cmap.has(cp));
  assert.deepEqual(missing.filter((cp) => cp < 0x1f000).map((cp) => cp.toString(16)), []);
});