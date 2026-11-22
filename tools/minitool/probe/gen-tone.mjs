// Generate a short MP3 tone for container probing (no ffmpeg available).
import fs from 'node:fs';
import path from 'node:path';
import { Mp3Encoder } from '@breezystack/lamejs';

const outDir = process.argv[2] || 'tools/minitool/probe/assets';
fs.mkdirSync(outDir, { recursive: true });

const sampleRate = 44100;
const channels = 2;
const seconds = 2;
const kbps = 128;
const total = sampleRate * seconds;

const left = new Int16Array(total);
const right = new Int16Array(total);
for (let i = 0; i < total; i++) {
  const t = i / sampleRate;
  const env = Math.min(1, t / 0.05) * Math.min(1, (seconds - t) / 0.2);
  const v = Math.sin(2 * Math.PI * 440 * t) * 0.25 * env;
  const s = Math.round(v * 32767);
  left[i] = s;
  right[i] = Math.round(s * 0.9);
}

const enc = new Mp3Encoder(channels, sampleRate, kbps);
const chunks = [];
const block = 1152;
for (let i = 0; i < total; i += block) {
  const l = left.subarray(i, i + block);
  const r = right.subarray(i, i + block);
  const buf = enc.encodeBuffer(l, r);
  if (buf.length) chunks.push(Buffer.from(buf));
}
const end = enc.flush();
if (end.length) chunks.push(Buffer.from(end));
const mp3 = Buffer.concat(chunks);
fs.writeFileSync(path.join(outDir, 'tone.mp3'), mp3);

// 16-bit PCM WAV of the same tone for comparison
const dataBytes = total * channels * 2;
const wav = Buffer.alloc(44 + dataBytes);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataBytes, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(channels, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * channels * 2, 28);
wav.writeUInt16LE(channels * 2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataBytes, 40);
for (let i = 0; i < total; i++) {
  wav.writeInt16LE(left[i], 44 + i * 4);
  wav.writeInt16LE(right[i], 44 + i * 4 + 2);
}
fs.writeFileSync(path.join(outDir, 'tone.wav'), wav);

console.log(`tone.mp3 ${mp3.length} B (${kbps}kbps ${sampleRate}Hz ${channels}ch ${seconds}s)`);
console.log(`tone.wav ${wav.length} B`);
