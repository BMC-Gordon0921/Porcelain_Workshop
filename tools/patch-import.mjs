import fs from 'node:fs';
const p = 'src/main.js';
let s = fs.readFileSync(p, 'utf8');
const before = "import {initI18n, toggleLang, onLangChange, langButtonLabel} from './i18n.js';";
const after = "import {initI18n, setLang, toggleLang, onLangChange, langButtonLabel} from './i18n.js';";
if (!s.includes(before)) { console.log('import line already patched?', s.includes('setLang, toggleLang')); process.exit(0); }
fs.writeFileSync(p, s.replace(before, after));
console.log('setLang imported');
