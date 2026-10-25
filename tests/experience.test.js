import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SculptureChallenge} from '../src/sculpture.js';
import {WorkshopDemo,demoFrame} from '../src/workshop-demo.js';
import {createWorkbenchModel} from '../src/workbench-model.js';
const reload=c=>SculptureChallenge.restore(JSON.parse(JSON.stringify(c.serialize())));
function pass(c){c.collectClay();c.shapeEdits=1;c.piece.pixels=c.target.slice();assert.equal(c.fire(),true);c.tick(12);assert.equal(c.submit().passed,true);}
const permutations=a=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>i!==j)).map(rest=>[v,...rest])):[[]];
test('all 24 orders of four scenes require three commissions and a paid, applied decal',()=>{
 for(const order of permutations([0,1,2,3])){
  let c=new SculptureChallenge({tutorial:false});assert.equal(c.selectScene(order[0]),true);assert.equal(c.firstScene,order[0]);
  for(const scene of order){
   assert.equal(c.selectScene(scene),true);assert.equal(c.scene,scene);assert.equal(c.canSelectScene((scene+1)%4),false);
   for(let i=0;i<3;i++)pass(c);
   assert.equal(c.canSelectScene((scene+1)%4),false);assert.equal(c.buyDecal(),true);assert.equal(c.canSelectScene((scene+1)%4),false);
   assert.equal(c.applyDecal(),true);const money=c.money;assert.equal(c.applyDecal(),false);assert.equal(c.buyDecal(),false);assert.equal(c.money,money);c=reload(c);assert.equal(c.scene,scene);
  }
  assert.equal(c.completed,true);assert.equal(c.delivered,12);assert.equal(c.results.length,12);
  c.selectScene(order[0]);const firstBonuses=c.results.reduce((sum,r)=>sum+r.firstPassBonus,0);
  assert.equal(c.beginPractice(4),true);pass(c);assert.equal(c.results.length,12);assert.equal(c.results.reduce((sum,r)=>sum+r.firstPassBonus,0),firstBonuses);
  c.money=300;assert.equal(c.upgradeStation('clay',1),true);assert.equal(c.upgradeStation('clay',2),true);assert.equal(c.money,0);
 }
});
test('revisited practice retains its clay, fire drift and efficiency without advancing away',()=>{
 let c=new SculptureChallenge({tutorial:false});c.selectScene(2);for(let i=0;i<3;i++)pass(c);c.buyDecal();c.applyDecal();
 c.beginPractice(3);c.collectClay();c.shapeEdits=1;c.piece.pixels=c.target.slice();c.advanceEfficiency(1234);c.fire();c.setStoking(true);c.tick(3);
 const remaining=c.kiln.remaining,heat=c.kiln.heat;c.selectScene(1);c=reload(c);assert.equal(c.scene,1);
 for(let i=0;i<3;i++)pass(c);c.buyDecal();c.applyDecal();assert.equal(c.selectScene(2),true);assert.equal(c.level,3);assert.equal(c.phase,'practice');assert.equal(c.kiln.remaining,remaining);assert.equal(c.kiln.heat,heat);assert.equal(c.kiln.stoking,false);assert.equal(c.efficiency.elapsedMs,1234);c.tick(9);assert.equal(c.canSubmit,true);const result=c.submit();assert.equal(result.firstPassBonus,0);assert.equal(c.phase,'crafted');
});
test('tutorial follows any first scene and restores each real editing checkpoint',()=>{
 for(let scene=0;scene<4;scene++){
  let c=new SculptureChallenge();c.selectScene(scene);c=reload(c);assert.equal(c.firstScene,scene);assert.equal(c.tutorial.step,'move');
  c.advanceTutorial('move');c.collectClay();c.startStation('wheel');c.beginStroke();c.stroke(8,40,24,40,18,'push');c.finishStroke();c=reload(c);assert.equal(c.scene,scene);assert.equal(c.tutorial.step,'carve');assert.equal(c.stationAccess('paint').allowed,false);
  c.collectClay();assert.equal(c.tutorial.step,'wheel');
 }
});
test('v8 migration retains current scene, active tutorial and historical income',()=>{
 const c=new SculptureChallenge();c.advanceTutorial('move');c.collectClay();const data={...c.serialize(),version:8};const migrated=reload(SculptureChallenge.restore(data));assert.equal(migrated.tutorial.step,'wheel');assert.equal(migrated.firstScene,0);assert.deepEqual(migrated.piece.pixels,c.piece.pixels);
});
test('demo continuity, full cycle switching, interaction cooldown and pause',()=>{
 const d=new WorkshopDemo();d.tick(27);const before=d.frame;d.interact();assert.deepEqual(d.frame,before);assert.equal(d.frame.step,'kiln');assert.equal(d.frame.firing,true);d.tick(2,{paused:true});assert.equal(d.time,27);assert.equal(d.tick(13),true);assert.equal(d.frame.step,'clay');
 d.tick(39);d.interact();assert.equal(d.tick(1),false);d.tick(39);assert.equal(d.tick(1,{blocked:true}),false);
 for(const [t,step] of [[0,'clay'],[5,'wheel'],[10,'carve'],[15,'paint'],[24,'kiln'],[36,'serve']])assert.equal(demoFrame(t).step,step);
});
test('all station tiers use releasable models and progressively visible additions',()=>{
 for(const id of ['clay','wheel','carve','paint','kiln','serve']){
  const m=createWorkbenchModel({id});let previous=0;
  for(const level of [1,2,3]){m.update(0,{level,reduced:true});let count=0;m.group.traverseVisible(o=>{if(o.isMesh)count++;});assert.ok(count>previous,id+' level '+level);previous=count;}
  let released=0;m.group.traverse(o=>o.geometry?.addEventListener('dispose',()=>released++));m.dispose();assert.ok(released>0);
 }
});
