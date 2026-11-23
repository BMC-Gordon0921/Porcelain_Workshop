// Encode the game BGM (WAV) to MP3 for the minitool package.
// No ffmpeg on this machine: lamejs (pure JS) does the encoding.
// Usage: node tools/minitool/encode_audio.mjs [--kbps 128] [--out minitool/gen/audio/bgm.mp3]
import fs from 'node:fs';
import path from 'node:path';
import { Mp3Encoder } from '@breezystack/lamejs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const src = arg('src', 'src/assets/pottery backround music.wav');
const out = arg('out', 'minitool/gen/audio/bgm.mp3');
const kbps = Number(arg('kbps', '128'));
const maxSeconds = Number(arg('seconds', '0'));

const wav = fs.readFileSync(src);
if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${src}: not a RIFF/WAVE file`);

let fmt = null;
let data = null;
let off = 12;
while (off + 8 <= wav.length) {
  const id = wav.toString('ascii', off, off + 4);
  const size = wav.readUInt32LE(off + 4);
  const body = off + 8;
  if (id === 'fmt ') {
    fmt = {
      format: wav.readUInt16LE(body),
      channels: wav.readUInt16LE(body + 2),
      sampleRate: wav.readUInt32LE(body + 4),
      bits: wav.readUInt16LE(body + 14),
    };
  } else if (id === 'data') {
    data = { start: body, size };
  }
  off = body + size + (size % 2);
}
if (!fmt || !data) throw new Error('missing fmt/data chunk');
if (fmt.format !== 1 || fmt.bits !== 16) throw new Error(`unsupported wav: format=${fmt.format} bits=${fmt.bits}`);

const frameBytes = fmt.channels * 2;
const totalFrames = Math.floor(data.size / frameBytes);
const frames = maxSeconds > 0 ? Math.min(totalFrames, Math.round(maxSeconds * fmt.sampleRate)) : totalFrames;

const left = new Int16Array(frames);
const right = fmt.channels > 1 ? new Int16Array(frames) : left;
for (let i = 0; i < frames; i++) {
  const p = data.start + i * frameBytes;
  left[i] = wav.readInt16LE(p);
  if (fmt.channels > 1) right[i] = wav.readInt16LE(p + 2);
}

const enc = new Mp3Encoder(fmt.channels > 1 ? 2 : 1, fmt.sampleRate, kbps);
const chunks = [];
const block = 1152;
const started = Date.now();
for (let i = 0; i < frames; i += block) {
  const l = left.subarray(i, Math.min(i + block, frames));
  const r = right.subarray(i, Math.min(i + block, frames));
  const buf = enc.encodeBuffer(l, r);
  if (buf.length) chunks.push(Buffer.from(buf));
  if (i % (block * 400) === 0 && i > 0) process.stderr.write(`  ${(i / frames * 100).toFixed(0)}%\r`);
}
const tail = enc.flush();
if (tail.length) chunks.push(Buffer.from(tail));
const mp3 = Buffer.concat(chunks);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, mp3);
const secs = frames / fmt.sampleRate;
console.log(JSON.stringify({
  src,
  out,
  wavBytes: wav.length,
  mp3Bytes: mp3.length,
  durationSeconds: Number(secs.toFixed(2)),
  sampleRate: fmt.sampleRate,
  channels: fmt.channels,
  kbps,
  encodeMs: Date.now() - started,
}, null, 2));
