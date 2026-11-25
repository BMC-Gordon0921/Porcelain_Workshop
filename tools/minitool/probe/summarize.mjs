import {readFileSync} from 'node:fs';
const j=JSON.parse(readFileSync('qa/newbie/playthrough.json','utf8'));
for(const tag of ['desktop','phone']){
 console.log('== '+tag);
 for(const [k,v] of Object.entries(j[tag]||{})){
  const of=v.overflow&&v.overflow.scrollH>v.overflow.clientH+2? v.overflow.scrollH+'/'+v.overflow.clientH : '-';
  const top=v.rank&&v.rank[0]? v.rank[0].text.slice(0,20)+'('+v.rank[0].score+')' : '(none)';
  console.log(k.padEnd(20),'of:'+String(of).padEnd(9),'clip:'+(v.clipped||[]).length,'small:'+v.smallTargetCount,'| '+top);
 }
}