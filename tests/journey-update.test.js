import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SculptureChallenge,PRESETS,createTarget,makeBlank,compareSculpture} from '../src/sculpture.js';
import {SCENES,ORDERS_PER_SCENE} from '../src/campaign.js';
import {HeroPlayback} from '../src/hero-playback.js';

const restore=c=>SculptureChallenge.restore(JSON.parse(JSON.stringify(c.serialize())));
function stroke(c,station,coords,tool){assert.equal(c.startStation(station),true);c.beginStroke();assert.equal(c.stroke(...coords,tool,2),true);assert.equal(c.finishStroke(),true);}
function prepareTutorial(c){
 c.advanceTutorial('move');assert.equal(c.collectClay(),true);
 stroke(c,'wheel',[8,40,24,40,18],'push');
 stroke(c,'carve',[12,75,15,75,2],'cut');
 stroke(c,'paint',[45,50,60,50,4],'paint');c.endStation();
}
test('tutorial requires real ordered actions, persists, and undo restores its checkpoint',()=>{
 let c=new SculptureChallenge();assert.equal(c.collectClay(),false);assert.equal(c.tutorial.step,'move');
 c.advanceTutorial('move');c=restore(c);assert.equal(c.tutorial.step,'clay');c.collectClay();
 assert.equal(c.startStation('carve'),false);assert.equal(c.startStation('paint'),false);
 c.startStation('wheel');c.beginStroke();c.finishStroke();assert.equal(c.tutorial.step,'wheel');
 stroke(c,'wheel',[8,40,24,40,18],'push');assert.equal(c.tutorial.step,'carve');
 c.undo();assert.equal(c.tutorial.step,'wheel');c.redo();assert.equal(c.tutorial.step,'carve');
 c=restore(c);assert.equal(c.tutorial.step,'carve');assert.equal(c.startStation('paint'),false);
 stroke(c,'carve',[12,75,15,75,2],'cut');assert.equal(c.tutorial.step,'paint');
 c.collectClay();assert.equal(c.tutorial.step,'wheel');assert.deepEqual(c.piece.pixels,makeBlank());
});
test('first valid submission ends teaching even on failure, without completing an order',()=>{
 const c=new SculptureChallenge();prepareTutorial(c);assert.equal(c.tutorial.step,'kiln');
 assert.equal(c.submit().valid,false);assert.equal(c.tutorial.status,'active');
 c.fire();c.tick(3);let saved=restore(c);assert.equal(saved.tutorial.step,'kiln');assert.equal(saved.kiln.remaining,c.kiln.remaining);assert.equal(saved.kiln.stoking,false);
 c.tick(9);assert.equal(c.tutorial.step,'serve');saved=restore(c);assert.equal(saved.tutorial.step,'serve');
 const result=saved.submit();assert.equal(result.valid,true);assert.equal(result.passed,false);assert.equal(saved.tutorial.status,'complete');
 assert.equal(saved.scenePassed,0);assert.equal(saved.attempt,2);assert.equal(restore(saved).tutorial.status,'complete');
 assert.equal(saved.collectClay(),true);assert.equal(saved.startStation('carve'),true);
});
test('a passing tutorial is formal order one and cannot pay twice',()=>{
 const c=new SculptureChallenge();prepareTutorial(c);c.piece.pixels=c.target.slice();c.fire();c.tick(12);
 const result=c.submit();assert.equal(result.passed,true);assert.equal(c.scenePassed,1);assert.equal(c.level,1);assert.equal(c.tutorial.status,'complete');
 const balance=c.money;assert.equal(c.submit().valid,false);assert.equal(c.money,balance);assert.equal(c.orders.length,2);
});
function legacy({scene=0,level=3,phase='levels',hasClay=true,version=7}={}){
 const c=new SculptureChallenge({tutorial:false}),data=c.serialize();
 data.version=version;data.scene=scene;data.level=level;data.phase=phase;data.hasClay=hasClay;data.money=987;data.shapeEdits=2;data.edits=2;
 data.pixels=Array.from(createTarget(PRESETS[level].id));data.fired=hasClay;data.kilnResult={grade:'good',progress:.6,multiplier:1.1,legacy:true};
 data.results=[];
 for(let s=0;s<=scene;s++)for(let i=1;i<=(s<scene||phase!=='levels'?5:level);i++)data.results.push({scene:s,level:i,score:90,earned:177,baseEarned:90,firstPassBonus:60});
 data.collection=SCENES.slice(0,scene+(['crafted','complete'].includes(phase)?1:0)).map((s,i)=>({scene:i,id:s.id,product:s.product}));
 data.workshopLevels[0].paint=3;data.shelf=[5,4,3,2];return data;
}
test('v4-v7 unfinished fourth and fifth orders migrate to optional practice without loss',()=>{
 for(const version of [4,5,6,7])for(const level of [3,4]){
  const data=legacy({version,level});if(version===4)data.results=data.results.map(({scene,...r})=>r);
  let c=SculptureChallenge.restore(data);assert.equal(c.phase,'practice');assert.equal(c.preset.id,PRESETS[level].id);assert.equal(c.scenePassed,3);assert.equal(c.money,987);
  assert.deepEqual(Array.from(c.piece.pixels),data.pixels);assert.equal(c.kilnResult.grade,'good');assert.equal(c.tutorial.status,'complete');
  c=restore(c);assert.equal(c.phase,'practice');const result=c.submit();assert.equal(result.valid,true);assert.equal(result.firstPassBonus,0);assert.equal(c.scenePassed,3);assert.equal(c.phase,'ready');
 }
 const c=SculptureChallenge.restore(legacy({hasClay:false}));assert.equal(c.phase,'ready');assert.equal(c.canPurchase,true);
});
test('legacy purchased decals, complete collections and historic income survive migration',()=>{
 for(const phase of ['ready','decal','crafted','complete']){
  const data=legacy({scene:3,level:4,phase,hasClay:false}),c=SculptureChallenge.restore(data);
  assert.equal(c.phase,phase);assert.equal(c.money,987);assert.deepEqual(c.collection,data.collection);assert.equal(c.results.length,20);assert.equal(c.delivered,12);
  assert.ok(c.results.every(r=>r.earned===177));assert.equal(c.workshopLevels[0].paint,3);assert.deepEqual(c.shelf,data.shelf);assert.equal(restore(c).phase,phase);
  if(phase==='decal')assert.equal(c.buyDecal(),false);
 }
});
test('three minimum passes fund a decal without efficiency or kiln bonuses',()=>{
 const c=new SculptureChallenge({tutorial:false});
 for(let i=0;i<ORDERS_PER_SCENE;i++){
  c.collectClay();c.shapeEdits=1;
  const total=[0,0,0];for(const v of c.target)total[v]++;
  for(let fraction=.05;fraction<.8;fraction+=.01){const counts=[0,0,0];c.piece.pixels=c.target.map(v=>v&&++counts[v]<=total[v]*fraction?3-v:v);const score=compareSculpture(c.piece.pixels,c.target).score;if(score>=80&&score<90)break;}
  c.advanceEfficiency(300001);c.fire();c.tick(12);assert.equal(c.submit().earned,140);
 }
 assert.equal(c.money,420);assert.equal(c.orders.length,0);assert.equal(c.buyDecal(),true);assert.equal(c.money,20);
});
test('manual carousel selection wraps and cancels an in-progress fade',()=>{
 const c=new HeroPlayback(4);c.tick(5.1);c.show(-1);assert.equal(c.index,3);assert.equal(c.opacity,1);assert.equal(c.fade,null);
 c.tick(4.99);assert.equal(c.index,3);c.show(4);assert.equal(c.index,0);assert.equal(c.idle,0);
});
