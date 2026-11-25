import fs from 'fs';
const blk=fs.readFileSync('qa/audit/_append_mt.css','utf8').trim();
const f='src/platform/minitool.css';
const cur=fs.readFileSync(f,'utf8');
if(!cur.includes(blk)){fs.appendFileSync(f,'\n'+blk+'\n');console.log('appended');}else console.log('skipped');
console.log('size',fs.statSync(f).size);