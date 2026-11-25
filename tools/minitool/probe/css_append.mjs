import fs from 'fs';
const add=fs.readFileSync('qa/audit/_append.css','utf8').trim();
const cur=fs.readFileSync('src/challenge.css','utf8');
if(!cur.includes(add)){fs.appendFileSync('src/challenge.css','\n'+add+'\n');console.log('appended');}else console.log('skipped');
console.log('size',fs.statSync('src/challenge.css').size);