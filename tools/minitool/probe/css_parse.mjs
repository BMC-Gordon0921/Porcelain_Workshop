import fs from 'fs';
import path from 'path';
import {transform} from 'lightningcss';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):(e.name.endsWith('.css')?[path.join(d,e.name)]:[]));
for(const f of walk('src')){
 try{transform({filename:f,code:fs.readFileSync(f),minify:true});}
 catch(e){console.log('FAIL',f,String(e.message).slice(0,160));}
}
console.log('scan done');