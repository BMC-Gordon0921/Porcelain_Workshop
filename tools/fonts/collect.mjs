// 收集圆体子集的取字范围：src/**/* 与 index.html、CHANGELOG.md。
// 更新说明卡片由 CHANGELOG.md 在运行时渲染，漏了它就会出现「一部分字不圆」。
import {readFileSync, writeFileSync, readdirSync, statSync} from 'node:fs';
import {join, sep} from 'node:path';

export const FONT_INPUTS = ['src', 'index.html', 'CHANGELOG.md'];
const EXTS = /\.(js|css|html|md)$/;
const OUTPUT = 'src/assets/fonts/xz-round-codepoints.json';

export function collectFiles(root = process.cwd()) {
  const files = [];
  const walk = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) { for (const name of readdirSync(p)) walk(join(p, name)); return; }
    const rel = p.slice(root.length).split(sep).join('/');
    if (EXTS.test(p) && !rel.includes('/assets/fonts/')) files.push(p);
  };
  walk(join(root, 'src'));
  files.push(join(root, 'index.html'), join(root, 'CHANGELOG.md'));
  return files;
}

export function collectCodepoints(root = process.cwd()) {
  const set = new Set();
  for (const file of collectFiles(root)) {
    for (const ch of readFileSync(file, 'utf8')) {
      const cp = ch.codePointAt(0);
      if (cp > 0x20 && cp !== 0x7f) set.add(cp);
    }
  }
  return [...set].sort((a, b) => a - b);
}

if (process.argv[1]?.endsWith('collect.mjs')) {
  const codepoints = collectCodepoints();
  writeFileSync(join(process.cwd(), OUTPUT), JSON.stringify({inputs: FONT_INPUTS, count: codepoints.length, codepoints}) + '\n');
  console.log('圆体取字：' + codepoints.length + ' 个码位 → ' + OUTPUT);
}