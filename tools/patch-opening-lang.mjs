import fs from 'node:fs';

let s = fs.readFileSync('src/city-map.js', 'utf8');
const needle = '<button class="opening-skip" id="skip-opening">跳过动画 <span>↗</span></button>';
if (!s.includes('data-lang-toggle') ) {
  s = s.replace(needle, '<button class="opening-lang" data-lang-toggle type="button" aria-label="切换语言">EN</button>' + needle);
  fs.writeFileSync('src/city-map.js', s);
  console.log('opening lang button added');
} else {
  console.log('already present');
}
