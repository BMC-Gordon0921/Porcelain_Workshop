import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const files = [
  ...readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).map((f) => join(root, 'src', f)),
  join(root, 'index.html'),
];
const out = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const re = /'([^'\\\n]|\\.)*'|"([^"\\\n]|\\.)*"|`([^`\\]|\\.)*`/g;
    let m;
    while ((m = re.exec(line))) {
      const lit = m[0];
      if (!/[\u4e00-\u9fa5]/.test(lit)) continue;
      out.push(`${file.split(/[\\/]/).pop()}:${i + 1}\t${lit}`);
    }
  });
}
writeFileSync(join(root, 'tools', 'zh-literals.txt'), out.join('\n'), 'utf8');
const chars = out.reduce((n, s) => n + s.length, 0);
console.log(`literals=${out.length} chars=${chars}`);
