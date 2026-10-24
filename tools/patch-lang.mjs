import fs from 'node:fs';

const h = fs.readFileSync('index.html', 'utf8');
if (!h.includes('data-lang-toggle')) {
  fs.writeFileSync('index.html', h.replace('id="lang-toggle"', 'id="lang-toggle" data-lang-toggle'));
}

let m = fs.readFileSync('src/main.js', 'utf8');
const start = m.indexOf("$('lang-toggle').onclick=()=>toggleLang();");
if (start < 0) { console.log('lang block missing'); process.exit(1); }
const endMarker = "initI18n();$('lang-toggle').textContent=langButtonLabel();";
const end = m.indexOf(endMarker);
const neu = [
  "document.addEventListener('click',e=>{if(e.target.closest('[data-lang-toggle]'))toggleLang();});",
  "const refreshLang=()=>document.querySelectorAll('[data-lang-toggle]').forEach(b=>{b.textContent=langButtonLabel();b.setAttribute('aria-label',document.documentElement.lang==='en'?'切换到中文':'Switch to English');});",
  'onLangChange(refreshLang);initI18n();refreshLang();',
].join('\n');
m = m.slice(0, start) + neu + m.slice(end + endMarker.length);
fs.writeFileSync('src/main.js', m);
console.log('lang wiring replaced');
