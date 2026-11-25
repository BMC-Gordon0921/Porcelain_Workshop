import fs from 'fs';
import path from 'path';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):(e.name.endsWith('.css')?[path.join(d,e.name)]:[]));
for(const f of walk('src')){
 const raw=fs.readFileSync(f,'utf8');
 const s=raw.replace(/\/\*[\s\S]*?\*\//g,'');
 const o=(s.match(/\{/g)||[]).length,c=(s.match(/\}/g)||[]).length;
 if(o!==c)console.log('UNBALANCED',f,o,c);
}
console.log('done');