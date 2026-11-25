// 校验当前圆体子集是否覆盖了取字范围，缺字时以非零码退出。
// 典型触发：手工往 CHANGELOG.md 加了一句带生僻字的说明。
// 源字体本身没有的装饰符号记在 xz-round-cmap.json 的 unsupported 里，不算缺字。
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {collectCodepoints} from './collect.mjs';

const root = process.cwd();
const cmapPath = join(root, 'src/assets/fonts/xz-round-cmap.json');
let data;
try {
  data = JSON.parse(readFileSync(cmapPath, 'utf8'));
} catch {
  console.error('缺少 ' + cmapPath + '：先跑 npm run font:round。');
  process.exit(2);
}
const cmap = new Set(data.codepoints);
const unsupported = new Set(data.unsupported || []);
const wanted = collectCodepoints(root);
const missing = wanted.filter((cp) => !cmap.has(cp) && !unsupported.has(cp));
if (missing.length) {
  const list = missing.map((cp) => String.fromCodePoint(cp) + ' U+' + cp.toString(16).toUpperCase()).join(' ');
  console.error('圆体子集缺 ' + missing.length + ' 个字：' + list);
  console.error('跑 npm run font:round 重新打包子集后再提交。');
  process.exit(1);
}
console.log('圆体子集覆盖 ' + wanted.length + ' 个码位，无缺字。（源字体缺 ' + unsupported.size + ' 个装饰符号，走系统字体）');