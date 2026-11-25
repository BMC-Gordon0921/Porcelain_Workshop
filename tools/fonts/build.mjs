// 重建圆体子集：npm pack 取原始 975 圆体 → fontTools 子集化 → 导出 cmap。
// 原始 17 MB TTF 落在 tools/fonts/.cache（已 gitignore），不进仓库。
import {execFileSync, execSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, renameSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {collectCodepoints, collectFiles} from './collect.mjs';

const root = process.cwd();
const cache = join(root, 'tools/fonts/.cache');
const fonts = join(root, 'src/assets/fonts');
mkdirSync(cache, {recursive: true});

const tgz = readdirSync(cache).find((name) => name.endsWith('.tgz'));
if (!tgz) {
  execSync('npm pack @fontpkg/975-maru-sc --pack-destination "' + cache + '"', {stdio: 'inherit'});
}
const archive = join(cache, readdirSync(cache).find((name) => name.endsWith('.tgz')));
execFileSync('tar', ['-xf', archive, '-C', cache], {stdio: 'inherit'});
const ttf = join(cache, 'package', '975MaruSC-Medium.ttf');
if (!existsSync(ttf)) throw new Error('没找到 ' + ttf);

const codepoints = collectCodepoints(root);
writeFileSync(join(fonts, 'xz-round-codepoints.json'), JSON.stringify({inputs: ['src', 'index.html', 'CHANGELOG.md'], count: codepoints.length, codepoints}) + '\n');
const unicodes = join(cache, 'unicodes.txt');
writeFileSync(unicodes, codepoints.map((cp) => cp.toString(16)).join('\n'));

execFileSync('python', [join(root, 'tools/fonts/py_build_woff2.py'), ttf, unicodes,
  join(fonts, 'xz-round-subset.woff2'), join(fonts, 'xz-round-cmap.json')], {stdio: 'inherit'});
console.log('取字文件 ' + collectFiles(root).length + ' 个，码位 ' + codepoints.length + ' 个。');