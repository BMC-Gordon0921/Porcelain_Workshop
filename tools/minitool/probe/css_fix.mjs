import fs from 'fs';
import {execSync} from 'child_process';
const head=execSync('git show HEAD:src/challenge.css',{encoding:'utf8'});
const cur=fs.readFileSync('src/challenge.css','utf8');
const lines=cur.split('\n');
lines[0]=head.split('\n')[0];
fs.writeFileSync('src/challenge.css',lines.join('\n'));
console.log('restored, bytes',fs.statSync('src/challenge.css').size);