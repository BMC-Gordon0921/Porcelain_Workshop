import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SculptureChallenge,clayEdge,pushClay,makeBlank,applyBrush,pixelsEqual,compareSculpture} from '../src/sculpture.js';
import {fireBand,fireGrade,fireRatio,FIRE_DURATION} from '../src/workshop.js';
import {HeroPlayback} from '../src/hero-playback.js';
import {translateText} from '../src/i18n.js';

const shape=c=>{assert.equal(c.startStation('wheel'),true);assert.equal(c.stroke(8,40,24,40,18,'push'),true);c.endStation();};
const paint=c=>{assert.equal(c.startStation('paint'),true);assert.equal(c.stroke(45,50,60,50,4,'paint',2),true);c.endStation();};
const prepare=(c,pixels)=>{c.collectClay();shape(c);paint(c);if(pixels)c.piece.pixels=pixels.slice();};
const fire=(c,p=1)=>{assert.equal(c.fire(),true);if(p===1){c.tick(60);return;}c.kiln.seconds=p===.66?{perfect:10,good:1.5,fair:.5}:{perfect:0,good:10,fair:2};c.kiln.remaining=0;c.finishFiring();};
const restore=c=>SculptureChallenge.restore(JSON.parse(JSON.stringify(c.serialize())));
test('carousel waits five seconds, fades one specimen at a time and cycles all four',()=>{
 const c=new HeroPlayback();
 for(let i=0;i<4;i++){assert.equal(c.index,i);c.tick(4.99);assert.equal(c.opacity,1);c.tick(.16);assert.ok(c.opacity>0&&c.opacity<1);assert.equal(c.index,i);c.tick(.15);assert.equal(c.index,(i+1)%4);assert.ok(c.opacity<1e-8);c.tick(.3);assert.equal(c.opacity,1);}
});
test('carousel interactions restart inactivity and hidden time does not advance it',()=>{
 const c=new HeroPlayback();c.tick(4);c.interact();c.tick(20,{paused:true});assert.equal(c.index,0);c.tick(4.99);assert.equal(c.index,0);c.tick(.61);assert.equal(c.index,1);
 c.tick(3);c.tick(100,{paused:true});c.tick(2,{reduced:true});assert.equal(c.index,2);assert.equal(c.opacity,1);
});
test('drifting fire grades reward the share of perfect and good seconds',()=>{
 const grade=(r)=>fireGrade({perfect:r*12,good:0,fair:(1-r)*12});
 assert.equal(grade(1),'perfect');assert.equal(grade(.72),'perfect');assert.equal(grade(.7199),'good');assert.equal(grade(.38),'good');assert.equal(grade(.3799),'plain');assert.equal(grade(0),'plain');
 assert.equal(fireRatio({perfect:6,good:4,fair:2}),8/12);
 for(let level=1;level<=3;level++){const b=fireBand(level);assert.ok(b.perfect>0&&b.good>b.perfect);assert.ok(b.good<.2);}
});

test('new input and reward copy translate including dynamic kiln verdicts',()=>{
 assert.equal(translateText('按 F'),'Press F');assert.equal(translateText('火候成功 · 金币 ×1.1'),'Heat: Success · coins ×1.1');assert.equal(translateText('火候 完美 · 金币 ×1.25'),'Heat: Perfect · coins ×1.25');
});
test('firing is mandatory, cannot be repeated, and each submission pays once',()=>{
 const c=new SculptureChallenge();prepare(c,c.target);assert.equal(c.submit().reason,'firing-required');assert.equal(c.money,0);assert.equal(c.attempt,1);
 assert.equal(c.fire(),true);c.tick(2);assert.equal(c.submit().valid,false);c.tick(60);assert.equal(c.kilnResult.grade,'plain');assert.equal(c.fire(),false);assert.equal(c.setStoking(true),false);
 const r=c.submit();assert.equal(r.earned,180);assert.equal(r.baseEarned,100);assert.equal(r.kilnBonus,0);assert.equal(c.submit().valid,false);assert.equal(c.money,180);
});
test('three grades multiply rewards, round to coins, and persist actual historic income',()=>{
 for(const [p,multiplier] of [[1,1],[.55,1.1],[.66,1.25]]){
  const c=new SculptureChallenge();prepare(c,c.target);fire(c,p);const saved=restore(c);assert.equal(saved.canSubmit,true);assert.equal(saved.fire(),false);assert.deepEqual(saved.kilnResult,c.kilnResult);
  const r=saved.submit();assert.equal(r.regularEarned,Math.round(100*multiplier));assert.equal(r.kilnBonus,r.regularEarned-100);assert.equal(restore(saved).results[0].earned,r.earned);assert.equal(restore(saved).money,r.earned);
 }
 const c=new SculptureChallenge();prepare(c,null);const total=[0,0,0],counts=[0,0,0];for(const v of c.target)total[v]++;c.piece.pixels=c.target.map(v=>v&&++counts[v]<=total[v]*.15?3-v:v);
 assert.equal(Math.floor(compareSculpture(c.piece.pixels,c.target).score/10),9);fire(c,.66);assert.equal(c.submit().regularEarned,113);
 const blank=new SculptureChallenge();prepare(blank,makeBlank());blank.piece.pixels[56*112+56]=2;fire(blank,.66);assert.equal(blank.submit().earned,0);
});
test('legacy fired work gets fair heat; unfinished firings restore clay without a timer',()=>{
 const c=new SculptureChallenge();prepare(c,null);c.fire();c.tick(3);const loaded=restore(c);assert.equal(loaded.hasClay,true);assert.equal(loaded.kiln,null);assert.equal(loaded.canSubmit,false);assert.equal(loaded.fire(),true);
 const legacy={...c.serialize(),fired:true};delete legacy.kilnResult;delete legacy.kilnGrade;assert.deepEqual(SculptureChallenge.restore(legacy).kilnResult,{grade:'plain',progress:1,multiplier:1,legacy:true});
});
test('fired pieces refuse reshaping, while repainting and undo keep the heat',()=>{
 const c=new SculptureChallenge();prepare(c,c.target);fire(c,.66);const result=c.kilnResult,base=c.piece.pixels.slice();
 assert.equal(c.startStation('wheel'),false);assert.equal(c.startStation('carve'),false);assert.equal(c.startStation('paint'),true);
 c.beginStroke();c.stroke(56,56,66,56,4,'paint',2);assert.equal(c.finishStroke(),true);assert.equal(c.kilnResult,result);assert.equal(c.canSubmit,true);
 const painted=c.piece.pixels.slice();assert.equal(c.undo(),true);assert.deepEqual(c.piece.pixels,base);assert.equal(c.kilnResult,result);assert.equal(c.canSubmit,true);
 assert.equal(c.redo(),true);assert.deepEqual(c.piece.pixels,painted);assert.equal(c.kilnResult,result);assert.equal(c.canSubmit,true);
});
test('all four exterior edges support push and pull; interior does not grab',()=>{
 const base=makeBlank();assert.equal(clayEdge(base,56,56),null);
 for(const [x,y,dx,dy] of [[8,56,12,0],[104,56,-12,0],[56,8,0,12],[56,104,0,-12]])for(const direction of [1,-1]){const p=base.slice();assert.equal(pushClay(p,x,y,x+dx*direction,y+dy*direction,18),true);assert.ok(p.every(v=>v===0||v===1));assert.equal(p[56*112+56],1);}
});
test('diagonal dragging follows every pointer sample and stays reversible',()=>{
 const base=makeBlank();
 const c=new SculptureChallenge();c.collectClay();c.piece.pixels=base.slice();c.startStation('wheel');c.beginStroke();
 for(let i=1;i<=20;i++)c.stroke(8+(i-1)*.8,38+(i-1)*.8,8+i*.8,38+i*.8,18,'push',2);
 assert.equal(c.finishStroke(),true);const dragged=c.piece.pixels.slice();assert.ok(dragged.some((v,i)=>v!==base[i]));
 assert.equal(c.undoStack.length,1);c.undo();assert.deepEqual(c.piece.pixels,base);c.redo();assert.deepEqual(c.piece.pixels,dragged);
});
test('five minimum passes still pay for a decal with fair firing',()=>{
 const c=new SculptureChallenge();for(let level=0;level<5;level++){prepare(c,null);const totals=[0,0,0];for(const v of c.target)totals[v]++;
  for(let fraction=.05;fraction<.8;fraction+=.01){const counts=[0,0,0];c.piece.pixels=c.target.map(v=>v&&++counts[v]<=totals[v]*fraction?3-v:v);const score=compareSculpture(c.piece.pixels,c.target).score;if(score>=80&&score<90)break;}
  fire(c);const r=c.submit();assert.equal(r.passed,true);assert.equal(r.baseEarned,80);}
 assert.equal(c.money,780);assert.equal(c.buyDecal(),true);assert.equal(c.money,380);
});
