import fs from 'node:fs';
const s = fs.readFileSync('src/city-map.js', 'utf8');
const ids = [...new Set([...s.matchAll(/id="([a-z0-9-]+)"/g)].map((m) => m[1]))];
console.log('ids:', ids.join(', '));
const i = s.indexOf('opening-actions');
console.log(s.slice(Math.max(0, i - 200), i + 400));
