// 小工具构建管线（S3）：vite 打包 -> 资源合规化 -> HTML 后处理 -> 审计 -> 打 zip。
//
// 用法：node tools/minitool/build_minitool.mjs [--skip-audit]
import {spawnSync} from 'node:child_process';
import {copyFile, mkdir, readdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {legacyCss} from './css_legacy.mjs';

const ROOT = resolve('.');
const DIST = join(ROOT, 'dist-minitool');
const GEN = join(ROOT, 'minitool', 'gen');
const ZIP = join(ROOT, 'dist-minitool.zip');
const AUDIT = join(ROOT, '.skill', 'minitool-zip-builder', 'scripts', 'audit_artifact.mjs');

// WAV/PNG 的替换逻辑在 tools/minitool/minitool-plugins.mjs，由 vite.minitool.config.js 装配。

function run(label, command, args, options = {}) {
  const result = spawnSync(command, args, {stdio: 'inherit', ...options});
  if (result.status !== 0) throw new Error(`${label} failed with code ${result.status}`);
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

async function copyInto(sourceDir, targetDir, filter = () => true) {
  let count = 0;
  for (const file of await walk(sourceDir)) {
    if (!filter(file)) continue;
    const target = join(targetDir, relative(sourceDir, file));
    await mkdir(dirname(target), {recursive: true});
    await copyFile(file, target);
    count += 1;
  }
  return count;
}

async function main() {
  const skipAudit = process.argv.includes('--skip-audit');

  console.log('[1/6] 预处理资源（WebP 位图、模型打包、BGM 编码按需）');
  run('prepare_assets', process.env.PYTHON || 'C:/Python314/python.exe', [join(ROOT, 'tools', 'minitool', 'prepare_assets.py')]);
  run('pack_models', process.execPath, [join(ROOT, 'tools', 'minitool', 'pack_models.mjs')]);
  const bgm96 = join(GEN, 'audio', 'bgm-96.mp3');
  if (!existsSync(bgm96)) {
    console.log('      编码 BGM（96 kbps）：minitool/gen/audio/bgm-96.mp3');
    run('encode_audio', process.execPath, [join(ROOT, 'tools', 'minitool', 'encode_audio.mjs'),
      '--kbps', '96', '--out', bgm96]);
  }

  console.log('[2/6] vite 构建（three r150 / chrome61 / iife）');
  const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  run('vite build', process.execPath, [viteBin, 'build', '--config', join(ROOT, 'vite.minitool.config.js')]);

  console.log('[3/6] 灌入自带几何、WebP 位图与 BGM（base64 进 .js，平台不允许音频扩展名）');
  const models = await copyInto(join(GEN, 'models'), join(DIST, 'models'), name => name.endsWith('.js'));
  const images = await copyInto(join(GEN, 'img'), DIST);
  run('embed_audio', process.execPath, [join(ROOT, 'tools', 'minitool', 'embed_audio.mjs'),
    '--src', join(GEN, 'audio', 'bgm-96.mp3'),
    '--out', join(DIST, 'assets', 'bgm.js')]);

  console.log('[4/6] 后处理 index.html');
  const htmlPath = join(DIST, 'index.html');
  let html = await readFile(htmlPath, 'utf8');
  // vite 把入口放在 <head>（module 天然 defer）；去掉 type=module 后必须补 defer，
  // 否则经典脚本在 <body> 解析前执行，取 #world 得到 null，整局初始化中断。
  html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '<script defer src="$1"></script>');
  html = html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/, '<link rel="stylesheet" href="$1">');
  // vite 会把 favicon 的 PNG 原图打进来；小工具包里同一张图是 WebP
  html = html.replace('./assets/logo-mark.png', './assets/logo-mark.webp');
  if (!html.includes('models/manifest.js')) {
    html = html.replace('<script defer src="./assets/app.js"></script>', '<script defer src="./models/manifest.js"></script>\n  <script defer src="./assets/app.js"></script>');
  }
  await writeFile(htmlPath, html, 'utf8');
  await rm(join(DIST, 'assets', 'logo-mark.png'), {force: true});

  // CSS 基线兜底：dvh -> vh、inset -> 四条长属性（安卓 WebView 61 不认识新写法）
  const cssPath = join(DIST, 'assets', 'style.css');
  const css = await readFile(cssPath, 'utf8');
  const patched = legacyCss(css);
  if (patched !== css) await writeFile(cssPath, patched, 'utf8');
  console.log(`      CSS 基线兜底：dvh ${(css.match(/dvh(?![a-z])/g) || []).length} 处、inset ${(css.match(/inset\s*:/g) || []).length} 处`);

  console.log('[5/6] 扩展名与体积自检');
  // 平台白名单：jpg css gif svg png js jpeg json html woff2 webp woff（无音频扩展名）
  const allowed = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2', '.json']);
  const files = await walk(DIST);
  const bad = files.filter(file => !allowed.has(file.slice(file.lastIndexOf('.')).toLowerCase()));
  const total = (await Promise.all(files.map(async file => (await stat(file)).size))).reduce((a, b) => a + b, 0);
  const byExt = {};
  for (const file of files) {
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
    byExt[ext] = (byExt[ext] || 0) + (await stat(file)).size;
  }
  const bigText = [];
  for (const file of files) {
    if (!/\.(js|css|html|json)$/.test(file)) continue;
    const size = (await stat(file)).size;
    if (size > 2 * 1024 * 1024) bigText.push(`${relative(DIST, file)} ${(size / 1048576).toFixed(2)} MiB`);
  }
  const report = {
    files: files.length,
    bytes: total,
    mib: +(total / 1048576).toFixed(2),
    byExtKiB: Object.fromEntries(Object.entries(byExt).map(([k, v]) => [k, Math.round(v / 1024)])),
    disallowedExtensions: bad.map(file => relative(DIST, file)),
    textOver2MiB: bigText
  };
  console.log(JSON.stringify(report, null, 2));
  if (bad.length) throw new Error(`不允许的扩展名: ${report.disallowedExtensions.join(', ')}`);

  console.log('[6/6] 官方审计 + 打 zip');
  if (!skipAudit) run('audit', process.execPath, [AUDIT, DIST]);
  await rm(ZIP, {force: true});
  run('zip', process.env.PYTHON || 'C:/Python314/python.exe', [join(ROOT, 'tools', 'minitool', 'make_zip.py'), DIST, ZIP]);
  const zipSize = (await stat(ZIP)).size;
  report.zipBytes = zipSize;
  report.zipMiB = +(zipSize / 1048576).toFixed(2);
  report.zipPath = ZIP;
  await writeFile(join(ROOT, 'minitool', 'gen', 'build-report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(`zip: ${ZIP} ${report.zipMiB} MiB (${zipSize} B)`);
}

await main();
