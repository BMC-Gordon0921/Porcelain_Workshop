import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SculptureChallenge,SIZE,PRESETS,createTarget,makeBlank,applyBrush,pushClay,compareSculpture} from '../src/sculpture.js';
test('all five designs receive the identical full, unpainted clay clump',()=>{
 assert.equal(PRESETS.length,5);const blank=makeBlank();assert.ok(blank.filter(Boolean).length>SIZE*SIZE*.65);
 for(const p of PRESETS){const target=createTarget(p.id),r=compareSculpture(blank,target);assert.deepEqual(makeBlank(target),blank);assert.equal(r.passed,false,`${p.id} needs real work`);assert.ok(target.every(v=>v===0||v===1||v===2),'presets use only porcelain white and cobalt blue');assert.ok(r.excess>0);assert.equal(r.missing,0);assert.equal(compareSculpture(target,target).score,100);}
});
test('clay must be collected before any work station can be used',()=>{
 const c=new SculptureChallenge();assert.equal(c.hasClay,false);assert.equal(c.startStation('carve'),false);assert.equal(c.fire(),false);assert.equal(c.stroke(30,50,70,50,5,'cut'),false);c.collectClay();assert.equal(c.hasClay,true);assert.equal(c.startStation('carve'),true);
});
test('each station permits only its own operation, in any visitation order',()=>{
 const c=new SculptureChallenge();c.collectClay();const original=c.piece.pixels.slice();
 c.startStation('paint');assert.equal(c.stroke(45,50,60,50,4,'cut'),false);assert.equal(c.stroke(10,40,25,40,18,'push'),false);assert.equal(c.stroke(45,50,60,50,4,'paint',2),true);
 const painted=c.piece.pixels.slice();assert.notDeepEqual(painted,original);c.endStation();assert.equal(c.stroke(45,50,60,50,3,'paint',2),false);
 c.startStation('carve');assert.equal(c.stroke(45,50,60,50,4,'paint',2),false);assert.equal(c.stroke(45,50,60,50,2,'cut'),true);
 c.startStation('wheel');assert.equal(c.stroke(45,50,60,50,4,'cut'),false);assert.equal(c.stroke(8,40,22,40,18,'push'),true);
});
test('rough pushing deforms an edge instead of painting or snapping to a target',()=>{
 const clay=makeBlank(),before=clay.slice();assert.equal(pushClay(clay,8,38,24,38,18),true);assert.notDeepEqual(clay,before);assert.equal(clay[56*SIZE+80],before[56*SIZE+80]);assert.ok(!clay.some(v=>v>1));assert.ok(clay.filter(Boolean).length>0);const small=makeBlank(),broad=makeBlank();pushClay(small,8,38,24,38,1);pushClay(broad,8,38,24,38,14);assert.deepEqual(small,broad,'shaping cannot use a precise tiny hand tool');
});
test('cut strokes are continuous and paint cannot create missing clay',()=>{
 const a=new Uint8Array(SIZE*SIZE).fill(1);applyBrush(a,20,40,80,40,3,'cut');for(let x=20;x<80;x++)assert.equal(a[40*SIZE+x],0);applyBrush(a,50,40,50,40,2,'paint',2);assert.equal(a[40*SIZE+50],0);
});
test('undo and redo cannot perform another station’s task',()=>{
 const c=new SculptureChallenge();c.collectClay();c.startStation('paint');const original=c.piece.pixels.slice();c.beginStroke();c.stroke(45,50,60,50,4,'paint',2);const painted=c.piece.pixels.slice();c.startStation('carve');assert.equal(c.undo(),false);c.startStation('paint');assert.equal(c.undo(),true);assert.deepEqual(c.piece.pixels,original);assert.equal(c.redo(),true);assert.deepEqual(c.piece.pixels,painted);
});
test('90% passes, below 90% fails, and the displayed score cannot round a failure up',()=>{
 const target=Uint8Array.from([1,1,1,1,1,1,1,2,2,2,2,2,2,2]),boundary=target.slice();for(const i of [0,1,7,8])boundary[i]=3-boundary[i];assert.equal(compareSculpture(boundary,target).score,90);assert.equal(compareSculpture(boundary,target).passed,true);boundary[2]=2;assert.equal(compareSculpture(boundary,target).passed,false);
});
test('a failed submission restarts the same level and requires a new clump',()=>{
 const c=new SculptureChallenge();c.collectClay();const submitted=c.piece.pixels.slice(),r=c.submit();assert.equal(r.passed,false);assert.deepEqual(r.pixels,submitted);assert.equal(c.level,0);assert.equal(c.attempt,2);assert.equal(c.hasClay,false);assert.equal(c.money,0);assert.deepEqual(c.piece.pixels,makeBlank());c.collectClay();assert.equal(c.hasClay,true);
});
test('only passing sculptures pay and unlock all five levels',()=>{
 const c=new SculptureChallenge();for(let i=0;i<5;i++){assert.equal(c.level,i);c.collectClay();c.piece.pixels=c.target.slice();const r=c.submit();assert.equal(r.passed,true);assert.equal(r.score,100);assert.equal(c.delivered,i+1);}assert.equal(c.completed,true);assert.equal(c.money,350);assert.equal(c.submit().earned,0);
});
test('firing adds no similarity and saved work retains the actual cuts and colors',()=>{
 const c=new SculptureChallenge();c.collectClay();c.startStation('paint');c.beginStroke();c.stroke(40,40,60,60,4,'paint',2);const before=compareSculpture(c.piece.pixels,c.target);c.fire();c.tick(9);assert.equal(c.fired,true);assert.deepEqual(compareSculpture(c.piece.pixels,c.target),before);const saved=SculptureChallenge.restore(JSON.parse(JSON.stringify(c.serialize())));assert.equal(saved.hasClay,true);assert.deepEqual(saved.piece.pixels,c.piece.pixels);assert.equal(saved.activeStation,null);assert.equal(SculptureChallenge.restore({version:2}).hasClay,false);
});
