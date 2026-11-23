import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseChangelog,latestVersion} from '../src/changelog.js';

const SAMPLE=[
  '# 更新说明',
  '<!-- 新版本段落加到最前面',
  '仍在校验注释',
  '-->',
  '## 0.1.2 · 2026-12-01',
  '- 新增图鉴',
  '* 相机修复',
  '## 0.1.1',
  '- 对称塑形',
  '### 更深的小标题会被忽略',
  '段落文字不算条目',
].join('\n');

test('changelog parses sections in file order with version and date',()=>{
  const sections=parseChangelog(SAMPLE);
  assert.equal(sections.length,2);
  assert.deepEqual(sections.map(s=>s.version),['0.1.2','0.1.1']);
  assert.equal(sections[0].date,'2026-12-01');
  assert.equal(sections[1].date,'');
  assert.equal(latestVersion(sections),'0.1.2');
});

test('changelog strips bullet markers and ignores headings, comments and blanks',()=>{
  const [first,second]=parseChangelog(SAMPLE);
  assert.deepEqual(first.items,['新增图鉴','相机修复']);
  assert.deepEqual(second.items,['对称塑形']);
});

test('empty changelog yields no sections',()=>{
  assert.deepEqual(parseChangelog(''),[]);
  assert.deepEqual(parseChangelog(null),[]);
  assert.equal(latestVersion([]),'');
});

test('shipped CHANGELOG.md keeps the documented format',()=>{
  const text=readFileSync(new URL('../CHANGELOG.md',import.meta.url),'utf8');
  const sections=parseChangelog(text);
  assert.ok(sections.length>=1,'CHANGELOG.md 至少要有一段');
  assert.ok(sections[0].version.length>0,'最新一版要有版本号');
  assert.ok(sections[0].items.length>0,'最新一版至少要有改动条目');
});
