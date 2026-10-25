import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SculptureChallenge,SIZE,PRESETS,makeBlank,createTarget,suppliedClay,compareSculpture,clayEdge,pixelsEqual} from '../src/sculpture.js';
import {WORKBENCH_IDS,FIRE_DURATION,fireBand,fireRatio,fireGrade,orderIncome,clockPolicy} from '../src/workshop.js';
import {createKilnModel} from '../src/kiln-view.js';
const restore=c=>SculptureChallenge.restore(JSON.parse(JSON.stringify(c.serialize())));
function shape(c){c.startStation('wheel');c.beginStroke();c.stroke(8,40,24,40,18,'push',2);c.finishStroke();}
function paint(c){c.startStation('paint');c.beginStroke();c.stroke(45,50,60,50,4,'paint',2);c.finishStroke();}
function fire(c,seconds=null){c.fire();if(!seconds){c.tick(60);return;}c.kiln.seconds=seconds;c.kiln.remaining=0;c.finishFiring();}
function pass(c,ms=0){c.collectClay();shape(c);paint(c);c.piece.pixels=c.target.slice();c.advanceEfficiency(ms);fire(c);return c.submit();}

test('all six upgrades debit exact costs once, cap at three, and do not alter current clay',()=>{
 const c=new SculptureChallenge({tutorial:false});c.collectClay();const before=c.piece.pixels.slice();c.money=99;assert.equal(c.upgradeStation('clay'),false);c.money=1800;
 for(const id of WORKBENCH_IDS){assert.equal(c.upgradeStation(id,1),true);const balance=c.money;assert.equal(c.upgradeStation(id,1),false);assert.equal(c.money,balance);assert.equal(c.upgradeStation(id,2),true);assert.equal(c.upgradeStation(id,3),false);}
 assert.equal(c.money,0);assert.ok(pixelsEqual(before,c.piece.pixels));assert.equal(c.upgradeStation('invalid'),false);assert.deepEqual(restore(c).workshopLevels,c.workshopLevels);
});
test('upgrades remain local to each scene and practice can fund a decal after investment',()=>{
 let c=new SculptureChallenge({tutorial:false});c.money=1580;for(let i=0;i<3;i++)pass(c,300001);for(const id of WORKBENCH_IDS){c.upgradeStation(id,1);c.upgradeStation(id,2);}assert.equal(c.money,260);assert.equal(c.canPurchase,false);
 assert.equal(c.beginPractice(),true);const r=pass(c);assert.equal(r.firstPassBonus,0);assert.equal(r.efficiencyBonus,29);assert.equal(c.scenePassed,3);assert.ok(c.canPurchase);c.buyDecal();c.applyDecal();c.nextScene();c=restore(c);assert.equal(c.stationLevel('clay'),1);assert.equal(c.workshopLevels[0].clay,3);
});
test('supplied white clay becomes progressively closer for all five targets',()=>{
 for(const p of PRESETS){const target=createTarget(p.id),clays=[1,2,3].map(l=>suppliedClay(target,l)),scores=clays.map(c=>compareSculpture(c,target).shape);assert.ok(scores[0]<scores[1]&&scores[1]<scores[2],p.id);assert.ok(clays.every(c=>c.every(v=>v===0||v===1)));assert.ok(!pixelsEqual(clays[2],target));}
});
test('symmetric shaping preserves symmetry, paint, undo and a no-op return',()=>{
 const c=new SculptureChallenge({tutorial:false});c.collectClay();c.startStation('wheel');const b=c.piece.pixels.slice(),g=clayEdge(b,8,56);c.beginStroke();c.stroke(8,56,24,56,18,'push',2,b,g);c.finishStroke();
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)assert.equal(c.piece.pixels[y*SIZE+x],c.piece.pixels[y*SIZE+SIZE-1-x]);
 assert.ok(!pixelsEqual(b,c.piece.pixels));c.undo();assert.ok(pixelsEqual(b,c.piece.pixels));c.redo();const shaped=c.piece.pixels.slice();c.beginStroke();c.stroke(8,56,24,56,18,'push',2,shaped,g);c.stroke(8,56,8,56,18,'push',2,shaped,g);assert.equal(c.finishStroke(),false);assert.ok(pixelsEqual(shaped,c.piece.pixels));
});
test('shaping displacement is bounded and identical for sparse or dense pointer streams',()=>{
 function run(steps,dx=80){const c=new SculptureChallenge({tutorial:false});c.collectClay();c.startStation('wheel');const b=c.piece.pixels.slice(),g=clayEdge(b,8,38);c.beginStroke();for(let i=1;i<=steps;i++)c.stroke(8,38,8+dx*i/steps,38+14*i/steps,18,'push',2,b,g);c.finishStroke();return c;}
 assert.ok(pixelsEqual(run(1).piece.pixels,run(50).piece.pixels));assert.ok(pixelsEqual(run(1).piece.pixels,run(1,28).piece.pixels));
});
test('carving protection removes excess but preserves the target, and can be disabled',()=>{
 const c=new SculptureChallenge({tutorial:false});c.workshopLevels[0].carve=3;c.collectClay();c.shapeEdits=1;c.startStation('carve');c.stroke(56,0,56,112,60,'cut');assert.ok(c.piece.pixels.every((v,i)=>!!v===!!c.target[i]));c.stroke(56,0,56,112,60,'cut',2,null,undefined,{protect:false});assert.equal(c.piece.pixels.filter(Boolean).length,0);
 const d=new SculptureChallenge({tutorial:false});d.workshopLevels[0].carve=2;d.collectClay();d.shapeEdits=1;d.startStation('carve');d.stroke(56,0,56,112,60,'cut');assert.ok(d.piece.pixels[56*SIZE+56]);assert.ok(d.piece.pixels.filter(Boolean).length<c.target.filter(Boolean).length);
});
test('straight painting replaces the live preview and mirror paint respects clay bounds',()=>{
 const c=new SculptureChallenge({tutorial:false});c.workshopLevels[0].paint=3;c.collectClay();shape(c);c.startStation('paint');const b=c.piece.pixels.slice();c.beginStroke();c.stroke(30,35,45,60,3,'paint',2,b,undefined,{line:true,mirror:true});c.stroke(30,35,30,60,3,'paint',2,b,undefined,{line:true,mirror:true});c.finishStroke();assert.equal(c.piece.pixels[58*SIZE+43],1);assert.equal(c.piece.pixels[45*SIZE+30],2);assert.equal(c.piece.pixels[45*SIZE+81],2);assert.equal(c.piece.pixels[0],0);c.undo();assert.ok(pixelsEqual(c.piece.pixels,b));
});
test('firing lasts a fixed twelve seconds and needs both shaping and painting',()=>{
 const c=new SculptureChallenge({tutorial:false});c.collectClay();assert.equal(c.fire(),false);shape(c);assert.equal(c.fire(),false);paint(c);assert.equal(c.fire(),true);
 assert.equal(c.kiln.duration,FIRE_DURATION);assert.equal(c.kiln.remaining,FIRE_DURATION);assert.ok(c.kiln.center>=.48&&c.kiln.center<=.72);
 c.setStoking(true);c.tick(1);assert.ok(c.kiln.heat>.18);c.setStoking(false);const hot=c.kiln.heat;c.tick(1);assert.ok(c.kiln.heat<hot);
 c.tick(10);assert.equal(c.kiln,null);assert.ok(c.kilnResult);assert.equal(c.kilnResult.duration,FIRE_DURATION);assert.equal(c.canSubmit,true);assert.equal(c.fire(),false);
});
test('grade thresholds reward the share of perfect and good seconds',()=>{
 assert.equal(fireGrade({perfect:9,good:0,fair:3}),'perfect');assert.equal(fireGrade({perfect:5,good:4,fair:3}),'good');assert.equal(fireGrade({perfect:0,good:0,fair:12}),'plain');
 assert.ok(Math.abs(fireRatio({perfect:6,good:4,fair:2})-8/12)<1e-12);assert.ok(Math.abs(fireBand(2).good-.132)<1e-9);assert.ok(Math.abs(fireBand(2).perfect-.049)<1e-9);assert.ok(fireBand(3).good>fireBand(2).good);
 const c=new SculptureChallenge({tutorial:false});c.collectClay();shape(c);paint(c);c.fire();c.kiln.seconds={perfect:8,good:3,fair:1};c.kiln.remaining=0;c.finishFiring();assert.equal(c.kilnResult.grade,'perfect');assert.equal(c.kilnResult.multiplier,1.25);
 const d=new SculptureChallenge({tutorial:false});d.collectClay();shape(d);paint(d);d.money=100;d.upgradeStation('kiln');d.fire();d.kiln.seconds={perfect:12,good:0,fair:0};d.kiln.remaining=0;d.finishFiring();assert.equal(d.kilnResult.multiplier,1.35);assert.deepEqual(restore(d).kilnResult,d.kilnResult);
});
test('efficiency includes exactly five minutes, never discounts, and excludes failed work',()=>{
 for(const [ms,bonus] of [[299999,20],[300000,20],[300000.001,0],[600000,0]]){const c=new SculptureChallenge({tutorial:false}),r=pass(c,ms);assert.equal(r.efficiencyBonus,bonus);assert.equal(r.earned,160+bonus);assert.equal(r.regularEarned,100);}
 const c=new SculptureChallenge({tutorial:false});c.collectClay();shape(c);paint(c);fire(c);const r=c.submit();assert.equal(r.passed,false);assert.equal(r.efficiencyBonus,0);assert.equal(r.firstPassBonus,0);
 const failed=orderIncome(70,{passed:false,eligible:true,elapsedMs:100,kiln:1.25,serve:1.2});assert.equal(failed.regularEarned,105);assert.equal(failed.earned,105);
});
test('reward rounding and first pass bonuses remain outside efficiency multiplication',()=>{
 const r=orderIncome(90,{passed:true,eligible:true,elapsedMs:300000,kiln:1.45,serve:1.2,firstPass:true});assert.equal(r.regularEarned,157);assert.equal(r.efficiencyBonus,31);assert.equal(r.earned,248);assert.equal(90+r.kilnBonus+r.serveBonus+r.efficiencyBonus+r.firstPassBonus,r.earned);
});
test('efficiency survives saves and edits, resets only for new clay, and pays once',()=>{
 let c=new SculptureChallenge({tutorial:false});c.collectClay();shape(c);c.advanceEfficiency(1000.25);c=restore(c);assert.equal(c.efficiency.elapsedMs,1000.25);c.startStation('paint');c.beginStroke();c.stroke(40,40,60,60,3,'paint',2);c.finishStroke();c.undo();c.redo();assert.equal(c.efficiency.elapsedMs,1000.25);c.collectClay();assert.equal(c.efficiency.elapsedMs,0);shape(c);paint(c);c.piece.pixels=c.target.slice();fire(c);const r=c.submit(),balance=c.money;assert.equal(r.efficiencyBonus,20);assert.equal(c.submit().earned,0);assert.equal(c.money,balance);assert.equal(restore(c).results[0].efficiencyBonus,20);
});
test('old saves retain income and clay, with efficiency starting on the next new piece',()=>{
 const c=new SculptureChallenge({tutorial:false});pass(c);c.collectClay();c.advanceEfficiency(12);for(const version of [4,5]){const legacy={...c.serialize(),version};if(version===4)legacy.results=legacy.results.map(({scene,...r})=>r);const d=SculptureChallenge.restore(legacy);assert.equal(d.money,c.money);assert.equal(d.hasClay,true);assert.equal(d.efficiency.eligible,false);assert.equal(d.stationLevel('clay'),1);d.collectClay();assert.equal(d.efficiency.eligible,true);}
});
test('unfinished firings resume paused on reload without resetting efficiency, bad optional fields do not erase progress',()=>{
 const c=new SculptureChallenge({tutorial:false});c.collectClay();shape(c);paint(c);c.advanceEfficiency(12345);c.fire();c.setStoking(true);c.tick(.5);const saved=c.serialize();saved.workshopLevels=[{clay:99}];const d=SculptureChallenge.restore(saved);assert.equal(d.kiln.remaining,c.kiln.remaining);assert.equal(d.kiln.stoking,false);assert.equal(d.efficiency.elapsedMs,12345);assert.equal(d.stationLevel('clay'),1);
});
test('clock policy separates workshop efficiency time from kiln-only time and all pauses',()=>{
 const base={started:true,helpOpen:false,hidden:false,focused:true,hasClay:true,canWork:true};
 for(const kind of [null,'editor','review','brief','supply'])assert.deepEqual(clockPolicy({...base,kind}),{efficiency:true,kiln:false});assert.deepEqual(clockPolicy({...base,kind:'kiln'}),{efficiency:true,kiln:true});
 for(const kind of ['citymap','travel','upgrades'])assert.deepEqual(clockPolicy({...base,kind}),{efficiency:false,kiln:false});
 for(const changes of [{helpOpen:true},{hidden:true},{focused:false},{started:false}])assert.deepEqual(clockPolicy({...base,kind:'kiln',...changes}),{efficiency:false,kiln:false});
});
test('passed orders add one display piece per scene up to nine and persist',()=>{
 let c=new SculptureChallenge({tutorial:false});for(let i=0;i<3;i++){assert.equal(pass(c).passed,true);assert.equal(c.shelf[0],i+1);}
 for(let i=0;i<6;i++){assert.equal(c.beginPractice(),true);assert.equal(pass(c).passed,true);}assert.equal(c.shelf[0],9);
 assert.equal(c.buyDecal(),true);assert.equal(c.applyDecal(),true);assert.equal(c.nextScene(),true);assert.deepEqual(restore(c).shelf,[9,0,0,0]);
 const failed=new SculptureChallenge({tutorial:false});failed.collectClay();shape(failed);paint(failed);fire(failed);assert.equal(failed.submit().passed,false);assert.equal(failed.shelf[0],0);
});
test('kiln replaces a new piece even if its revision repeats and disposes the old geometry',()=>{
 const kiln=createKilnModel(),first=new Uint8Array(SIZE*SIZE),next=first.slice();first[56*SIZE+56]=1;next[56*SIZE+60]=2;
 const find=()=>{let result;kiln.group.traverse(m=>{if(m.userData.customRelief)result=m;});return result;};
 kiln.setPiece(first,2);const original=find();let disposed=false;original.geometry.addEventListener('dispose',()=>disposed=true);kiln.setPiece(first,2);assert.equal(find(),original);
 kiln.setPiece(next,2);assert.notEqual(find(),original);assert.equal(disposed,true);assert.notEqual(find().geometry.attributes.position.getX(0),original.geometry.attributes.position.getX(0));kiln.dispose();
});
