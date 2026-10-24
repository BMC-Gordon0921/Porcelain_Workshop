import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const files = [
  ...readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).map((f) => join(root, 'src', f)),
  join(root, 'index.html'),
];
const seen = new Map();
function add(raw, where) {
  // strip ${...} expressions, remembering their position as a slot
  let s = raw.replace(/\$\{((?:[^{}]|\{[^{}]*\})*)\}/g, '\u0001');
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, '\n'); // tags become line breaks
  for (const line of s.split(/\n/)) {
    const frag = line.replace(/\u0001/g, '{}').replace(/\s+/g, ' ').trim();
    if (!/[\u4e00-\u9fa5]/.test(frag)) continue;
    const key = frag;
    const rec = seen.get(key) || {frag, count: 0, where: where};
    rec.count++;
    seen.set(key, rec);
  }
}
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const re = /'([^'\\\n]|\\.)*'|"([^"\\\n]|\\.)*"|`([^`\\]|\\.)*`/g;
    let m;
    while ((m = re.exec(line))) {
      if (!/[\u4e00-\u9fa5]/.test(m[0])) continue;
      add(m[0], `${file.split(/[\\/]/).pop()}:${i + 1}`);
    }
  });
}
const list = [...seen.values()].sort((a, b) => b.count - a.count);
writeFileSync(join(root, 'tools', 'zh-fragments.json'), JSON.stringify(list, null, 1), 'utf8');
console.log(`fragments=${list.length} chars=${list.reduce((n, r) => n + r.frag.length, 0)}`);
