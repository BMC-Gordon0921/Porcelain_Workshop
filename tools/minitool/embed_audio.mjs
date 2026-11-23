// 小工具平台只允许 jpg/css/gif/svg/png/js/jpeg/json/html/woff2/webp/woff，
// 音频扩展名一律被拒。这里把 MP3 以 base64 塞进一个 .js 文件，运行时注入脚本后
// 交给 WebAudio 解码播放——扩展名合规，音轨本身不变。
// Usage: node tools/minitool/embed_audio.mjs [--src minitool/gen/audio/bgm-96.mp3] [--out dist-minitool/assets/bgm.js]
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const src = arg('src', 'minitool/gen/audio/bgm-96.mp3');
const out = arg('out', 'dist-minitool/assets/bgm.js');

const bytes = fs.readFileSync(src);
fs.mkdirSync(path.dirname(out), { recursive: true });
const base64 = bytes.toString('base64');
fs.writeFileSync(out, `window.__TERRA_BGM=${JSON.stringify(base64)};\n`, 'utf8');
console.log(JSON.stringify({src, out, srcBytes: bytes.length, jsBytes: fs.statSync(out).size}));
