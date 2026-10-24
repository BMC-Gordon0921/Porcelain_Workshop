import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SculptureChallenge,clayEdge,pushClay,makeBlank,applyBrush,pixelsEqual,kilnGradeAt,KILN_SECONDS,compareSculpture} from '../src/sculpture.js';
import {KILN_ROUNDS,kilnWindows} from '../src/workshop.js';
import {HeroPlayback} from '../src/hero-playback.js';
import {translateText} from '../src/i18n.js';

const fire=(c,p=1)=>{assert.equal(c.fire(),true);if(p===1){c.tick(60);return;}while(c.kiln){const r=c.kiln.round,center=KILN_ROUNDS[r].center;c.tick(KILN_ROUNDS[r].seconds*(p===.66?center:center-.1));c.strike();c.tick(.45);}};
const restore=c=>SculptureChallenge.restore(JSON.parse(JSON.stringify(c.serialize())));
test('carousel waits five seconds, fades one specimen at a time and cycles all four',()=>{
 const c=new HeroPlayback();
 for(let i=0;i<4;i++){assert.equal(c.index,i);c.tick(4.99);assert.equal(c.opacity,1);c.tick(.16);assert.ok(c.opacity>0&&c.opacity<1);assert.equal(c.index,i);c.tick(.15);assert.equal(c.index,(i+1)%4);assert.ok(c.opacity<1e-8);c.tick(.3);assert.equal(c.opacity,1);}
});
test('carousel interactions restart inactivity and hidden time does not advance it',()=>{
 const c=new HeroPlayback();c.tick(4);c.interact();c.tick(20,{paused:true});assert.equal(c.index,0);c.tick(4.99);assert.equal(c.index,0);c.tick(.61);assert.equal(c.index,1);
 c.tick(3);c.tick(100,{paused:true});c.tick(2,{reduced:true});assert.equal(c.index,2);assert.equal(c.opacity,1);
});
test('kiln zones include boundaries, with perfect taking priority',()=>{
 for(let round=0;round<4;round++){const w=kilnWindows(round);for(const [p,grade] of [[0,'plain'],[w.good[0]-1e-6,'plain'],[w.good[0],'good'],[w.perfect[0],'perfect'],[w.perfect[1],'perfect'],[w.perfect[1]+1e-6,'good'],[w.good[1],'good'],[w.good[1]+1e-6,'plain'],[1,'plain']])assert.equal(kilnGradeAt(p,round).id,grade);}
});

test('new input and reward copy translate including dynamic kiln verdicts',()=>{
 assert.equal(translateText('按 F'),'Press F');assert.equal(translateText('火候成功 · 金币 ×1.1'),'Heat: Success · coins ×1.1');assert.equal(translateText('火候 完美 · 金币 ×1.25'),'Heat: Perfect · coins ×1.25');
});
test('firing is mandatory, cannot be repeated, and each submission pays once',()=>{
 const c=new SculptureChallenge();c.collectClay();c.piece.pixels=c.target.slice();assert.equal(c.submit().reason,'firing-required');assert.equal(c.money,0);assert.equal(c.attempt,1);
 c.fire();c.tick(2);assert.equal(c.submit().valid,false);c.tick(60);assert.equal(c.kilnResult.grade,'plain');assert.equal(c.fire(),false);assert.equal(c.strike(),null);
 const r=c.submit();assert.equal(r.earned,180);assert.equal(r.baseEarned,100);assert.equal(r.kilnBonus,0);assert.equal(c.submit().valid,false);assert.equal(c.money,180);
});
test('three grades multiply rewards, round to coins, and persist actual historic income',()=>{
 for(const [p,multiplier] of [[1,1],[.55,1.1],[.66,1.25]]){
  const c=new SculptureChallenge();c.collectClay();c.piece.pixels=c.target.slice();fire(c,p);const saved=restore(c);assert.equal(saved.canSubmit,true);assert.equal(saved.fire(),false);assert.deepEqual(saved.kilnResult,c.kilnResult);
  const r=saved.submit();assert.equal(r.regularEarned,Math.round(100*multiplier));assert.equal(r.kilnBonus,r.regularEarned-100);assert.equal(restore(saved).results[0].earned,r.earned);assert.equal(restore(saved).money,r.earned);
 }
 const c=new SculptureChallenge();c.collectClay();const total=[0,0,0],counts=[0,0,0];for(const v of c.target)total[v]++;c.piece.pixels=c.target.map(v=>v&&++counts[v]<=total[v]*.15?3-v:v);
 assert.equal(Math.floor(compareSculpture(c.piece.pixels,c.target).score/10),9);fire(c,.66);assert.equal(c.submit().regularEarned,113);
 const blank=new SculptureChallenge();blank.collectClay();fire(blank,.66);assert.equal(blank.submit().earned,0);
});
test('legacy fired work gets fair heat; unfinished firings restore clay without a timer',()=>{
 const c=new SculptureChallenge();c.collectClay();c.fire();c.tick(3);const loaded=restore(c);assert.equal(loaded.hasClay,true);assert.equal(loaded.kiln,null);assert.equal(loaded.canSubmit,false);assert.equal(loaded.fire(),true);
 const legacy={...c.serialize(),fired:true};delete legacy.kilnResult;delete legacy.kilnGrade;assert.deepEqual(SculptureChallenge.restore(legacy).kilnResult,{grade:'plain',progress:1,multiplier:1});
});
test('editing or undoing invalidates heat, but inspection and no-op strokes preserve it',()=>{
 const c=new SculptureChallenge();c.collectClay();fire(c,.66);c.startStation('wheel');const result=c.kilnResult,base=c.piece.pixels.slice(),grab=clayEdge(base,8,38);
 c.beginStroke();c.stroke(8,38,24,38,18,'push',2,base,grab);assert.equal(c.canSubmit,false);const revision=c.piece.revision;c.stroke(8,38,8,38,18,'push',2,base,grab);assert.ok(c.piece.revision>revision);assert.equal(c.finishStroke(),false);assert.equal(c.kilnResult,result);assert.equal(c.undoStack.length,0);assert.ok(pixelsEqual(c.piece.pixels,base));
 c.beginStroke();c.stroke(8,38,20,38,18,'push',2,base,grab);c.finishStroke();assert.equal(c.canSubmit,false);fire(c);c.undo();assert.equal(c.canSubmit,false);fire(c);c.redo();assert.equal(c.canSubmit,false);
});
test('all four exterior edges support push and pull; interior does not grab',()=>{
 const base=makeBlank();assert.equal(clayEdge(base,56,56),null);
 for(const [x,y,dx,dy] of [[8,56,12,0],[104,56,-12,0],[56,8,0,12],[56,104,0,-12]])for(const direction of [1,-1]){const p=base.slice();assert.equal(pushClay(p,x,y,x+dx*direction,y+dy*direction,18),true);assert.ok(p.every(v=>v===0||v===1));assert.equal(p[56*112+56],1);}
});
test('diagonal dragging is continuous and independent of pointer event frequency',()=>{
 const base=makeBlank();applyBrush(base,12,30,17,48,4,'paint',2);const edge=clayEdge(base,8,38),a=base.slice(),b=base.slice();pushClay(a,8,38,24,53.9,18,edge);pushClay(b,8,38,24,54.1,18,edge);assert.deepEqual(a,b);assert.ok(a.includes(2));
 const c=new SculptureChallenge();c.collectClay();c.piece.pixels=base.slice();c.startStation('wheel');c.beginStroke();for(let i=1;i<=40;i++)c.stroke(8,38,8+i*.4,38+i*.4,18,'push',2,base,edge,{symmetric:false});c.finishStroke();assert.deepEqual(c.piece.pixels,a);assert.equal(c.undoStack.length,1);c.undo();assert.deepEqual(c.piece.pixels,base);c.redo();assert.deepEqual(c.piece.pixels,a);
});
test('five minimum passes still pay for a decal with fair firing',()=>{
 const c=new SculptureChallenge();for(let level=0;level<5;level++){c.collectClay();const totals=[0,0,0];for(const v of c.target)totals[v]++;
  for(let fraction=.05;fraction<.8;fraction+=.01){const counts=[0,0,0];c.piece.pixels=c.target.map(v=>v&&++counts[v]<=totals[v]*fraction?3-v:v);const score=compareSculpture(c.piece.pixels,c.target).score;if(score>=80&&score<90)break;}
  fire(c);const r=c.submit();assert.equal(r.passed,true);assert.equal(r.baseEarned,80);}
 assert.equal(c.money,780);assert.equal(c.buyDecal(),true);assert.equal(c.money,380);
});
