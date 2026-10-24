import fs from 'node:fs';
const p = 'src/main.js';
let s = fs.readFileSync(p, 'utf8');
const bad = ":'}<div class=\"earnings-banner\">";
const good = ":''}<div class=\"earnings-banner\">";
if (!s.includes(bad)) { console.log('pattern missing'); process.exit(1); }
s = s.replace(bad, good);
fs.writeFileSync(p, s);
console.log('patched');
