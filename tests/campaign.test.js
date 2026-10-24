import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SculptureChallenge, compareSculpture} from '../src/sculpture.js';
import {rewardForScore, SCENES} from '../src/campaign.js';
const pass=c=>{c.collectClay();c.piece.pixels=c.target.slice();c.fire();c.tick(9);return c.submit();};
const passFive=c=>{for(let i=0;i<5;i++)pass(c);};
const restore=c=>SculptureChallenge.restore(JSON.parse(JSON.stringify(c.serialize())));

test('reward brackets include every lower boundary and perfect scores',()=>{
 for(const [score,coins] of [[-1,0],[0,0],[59.999,0],[60,60],[60.1,60],[69.999,60],[70,70],[79.999,70],[80,80],[89.999,80],[90,90],[99.999,90],[100,100],[101,100],[NaN,0],[Infinity,0]])assert.equal(rewardForScore(score),coins,String(score));
});
test('60–79% submissions pay without unlocking the next level or paying twice',()=>{
 const c=new SculptureChallenge();c.collectClay();
 const counts=[0,0,0];const total=[0,0,0];for(const value of c.target)total[value]++;
 c.piece.pixels=c.target.map(v=>v&&++counts[v]<=total[v]*.8?3-v:v);
 const score=compareSculpture(c.piece.pixels,c.target).score;assert.ok(score>=60&&score<80,score);
 c.fire();c.tick(9);const r=c.submit();assert.equal(r.passed,false);assert.equal(r.earned,rewardForScore(score));assert.equal(c.money,r.earned);assert.equal(c.level,0);assert.equal(c.attempt,2);assert.equal(c.hasClay,false);assert.equal(c.submit().earned,0);assert.equal(c.money,r.earned);
});
test('the shop requires five passes and exactly 400 coins suffices',()=>{
 const c=new SculptureChallenge();c.money=400;assert.equal(c.buyDecal(),false);assert.equal(c.money,400);
 passFive(c);c.money=399;assert.equal(c.buyDecal(),false);assert.equal(c.money,399);
 c.money=400;assert.equal(c.canPurchase,true);assert.equal(c.buyDecal(),true);assert.equal(c.money,0);assert.equal(c.phase,'decal');assert.equal(c.buyDecal(),false);assert.equal(c.money,0);
 assert.equal(c.nextScene(),false);assert.equal(c.startStation('paint'),false);
});
test('only applying the purchased decal creates a bowl; scene changes require it',()=>{
 const c=new SculptureChallenge();assert.equal(c.applyDecal(),false);assert.equal(c.nextScene(),false);passFive(c);assert.equal(c.applyDecal(),false);
 c.buyDecal();assert.equal(c.collection.length,0);assert.equal(c.nextScene(),false);assert.equal(c.applyDecal(),true);assert.equal(c.applyDecal(),false);assert.equal(c.collection.length,1);assert.equal(c.collection[0].product,'青花瓷碗');assert.equal(c.phase,'crafted');
 assert.equal(c.nextScene(),true);assert.equal(c.scene,1);assert.equal(c.level,0);assert.equal(c.phase,'levels');assert.equal(c.scenePassed,0);assert.equal(c.money,100);assert.equal(c.nextScene(),false);assert.equal(c.hasClay,false);
});
test('all four scenes complete in reference order after 20 passes, four purchases and applications',()=>{
 let c=new SculptureChallenge();
 for(let scene=0;scene<4;scene++){
  assert.equal(c.sceneInfo.id,SCENES[scene].id);passFive(c);c=restore(c);assert.equal(c.completed,false);assert.equal(c.scenePassed,5);
  assert.equal(c.buyDecal(),true);c=restore(c);assert.equal(c.phase,'decal');assert.equal(c.applyDecal(),true);c=restore(c);assert.equal(c.collection.length,scene+1);
  assert.equal(c.nextScene(),true);c=restore(c);
 }
 assert.equal(c.completed,true);assert.equal(c.delivered,20);assert.equal(c.collection.length,4);assert.deepEqual(c.collection.map(x=>x.id),SCENES.map(x=>x.id));assert.equal(c.money,400);assert.equal(c.collectClay(),false);assert.equal(c.buyDecal(),false);assert.equal(c.applyDecal(),false);assert.equal(c.submit().earned,0);assert.equal(c.nextScene(),false);
});
test('saved progress restores every phase including a paid but unapplied decal',()=>{
 let c=new SculptureChallenge();pass(c);c.collectClay();c.piece.pixels[5000]=2;c=restore(c);assert.equal(c.level,1);assert.equal(c.hasClay,true);assert.equal(c.piece.pixels[5000],2);
 for(let i=0;i<4;i++)pass(c);c=restore(c);assert.equal(c.phase,'ready');c.buyDecal();const balance=c.money;c=restore(c);assert.equal(c.phase,'decal');assert.equal(c.money,balance);assert.equal(c.buyDecal(),false);assert.equal(c.applyDecal(),true);c=restore(c);assert.equal(c.phase,'crafted');assert.equal(c.collection.length,1);
});
test('practice can top up migrated low balances without increasing scene pass count',()=>{
 const c=new SculptureChallenge();assert.equal(c.beginPractice(),false);passFive(c);c.money=350;
 assert.equal(c.beginPractice(5),false);assert.equal(c.beginPractice(0),true);assert.equal(restore(c).phase,'practice');pass(c);assert.equal(c.money,450);assert.equal(c.scenePassed,5);assert.equal(c.delivered,5);assert.equal(c.phase,'ready');assert.equal(c.submit().earned,0);assert.equal(c.buyDecal(),true);
});
test('legacy saves preserve clay, passed levels and coins without treating five levels as final completion',()=>{
 const original=new SculptureChallenge();for(let i=0;i<2;i++)pass(original);original.collectClay();original.piece.pixels[5050]=2;
 const legacy={...original.serialize(),version:4,completed:false,results:original.results.map(({scene,...r})=>r)};
 let c=SculptureChallenge.restore(legacy);assert.equal(c.scene,0);assert.equal(c.level,2);assert.equal(c.money,200);assert.equal(c.piece.pixels[5050],2);
 for(let i=0;i<3;i++)pass(c);const oldComplete={...c.serialize(),version:4,completed:true,money:350};c=SculptureChallenge.restore(oldComplete);assert.equal(c.phase,'ready');assert.equal(c.scenePassed,5);assert.equal(c.completed,false);assert.equal(c.money,350);assert.equal(c.beginPractice(),true);
});
test('corrupt or inconsistent saves reset safely without breaking the UI',()=>{
 const c=new SculptureChallenge();const good=c.serialize();
 for(const corrupt of [null,{}, {...good,phase:'oops'}, {...good,scene:4}, {...good,pixels:[1]}, {...good,phase:'complete'}, {...good,level:4}, {...good,collection:[null]}]){
  const restored=SculptureChallenge.restore(corrupt);assert.equal(restored.scene,0);assert.equal(restored.level,0);assert.equal(restored.phase,'levels');
 }
 const numeric=SculptureChallenge.restore({...good,money:Infinity,attempt:NaN});assert.equal(numeric.money,0);assert.equal(numeric.attempt,1);
});
