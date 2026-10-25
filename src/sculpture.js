// A small, deterministic relief canvas: 0 is empty, 1–5 are actual clay/paint colors.
export const SIZE = 112;
import {SCENES, DECAL_PRICE, ORDERS_PER_SCENE, rewardForScore} from './campaign.js';
import {freshTutorial,completedTutorial,tutorialInfo,nextTutorialStep,tutorialAllows} from './tutorial.js';
import {WORKBENCH_IDS,UPGRADE_COSTS,freshWorkshopLevels,restoreWorkshopLevels,FIRE_DURATION,FIRE_HEAT_RATE,FIRE_COOL_RATE,FIRE_START_HEAT,fireBand,fireGrade,fireRatio,fireSeed,createFireDrift,orderIncome,EFFICIENCY_LIMIT_MS} from './workshop.js';
export const PASS_SCORE = 80;
// Firing is one continuous, twelve-second stoking beat: hold to heat, release to
// cool, and bank as much time as possible inside the drifting good/perfect band.
export const KILN_SECONDS = FIRE_DURATION;
export const KILN_GRADES = {
 perfect:{id:'perfect',label:'完美',multiplier:1.25},
 good:{id:'good',label:'成功',multiplier:1.1},
 plain:{id:'plain',label:'一般',multiplier:1},
};
export const PALETTE = [null, '#f2efe5', '#315fa9'];
export const COLOR_NAMES = ['', '瓷白', '钴蓝'];
export const PRESETS = [
 {id:'band-pot',name:'一抹青花罐',customer:'Mabel',species:'rabbit',task:'把瓷泥做成圆润的罐子，在中间画一条宽宽的蓝色横带，其余保持白色。',hint:'横带保持平整，上下留出白色。'},
 {id:'tall-pot',name:'双环青花瓶',customer:'Bramble',species:'bear',task:'做一个细高、短颈的白瓷瓶，在瓶身画两条宽蓝色横带。',hint:'两条横带中间留出清楚的白色间隔。'},
 {id:'dot-jar',name:'三点青花坛',customer:'Clover',species:'cat',task:'做一个宽肚瓷坛，在白色瓶身的中间画三个大蓝点。',hint:'用中等画笔，分别画出三个圆点。'},
 {id:'rim-pot',name:'蓝沿瓷罐',customer:'Juniper',species:'bear',task:'把罐口做宽、底部收窄，再沿顶部画一圈宽蓝边。',hint:'只需要在宽罐口上画一条厚实的蓝边。'},
 {id:'moon-jar',name:'青带月光罐',customer:'Hazel',species:'rabbit',task:'做一个短颈的圆形月光罐，在瓶身画两条宽的竖向蓝带。',hint:'两条蓝带中间留出一条白色区域。'}
];
export const DESIGNS = Object.fromEntries(PRESETS.map(p=>[p.id,p]));
export const CAMPAIGN_PRESETS = PRESETS.slice(0,ORDERS_PER_SCENE);
const ellipse=(x,y,cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
const rect=(x,y,l,t,r,b)=>x>=l&&x<=r&&y>=t&&y<=b;
function poly(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [xi,yi]=points[i],[xj,yj]=points[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
export function targetPixel(id,x,y){
 let shape=false,color=1;
 if(id==='band-pot'){
  const r=y<31?14:y<53?14+15*Math.sin((y-31)/22*Math.PI/2):29*Math.sqrt(Math.max(0,1-((y-53)/43)**2));
  shape=y>=19&&y<=84&&Math.abs(x-50)<=r;if(y>=54&&y<=66)color=2;
 }else if(id==='tall-pot'){
  const r=y<29?12:y<43?12+(y-29)*.65:y<76?21.1:21.1-(y-76)*.2;
  shape=y>=12&&y<=88&&Math.abs(x-50)<=r;if((y>=46&&y<=56)||(y>=69&&y<=79))color=2;
 }else if(id==='dot-jar'){
  shape=poly(x,y,[[29,23],[71,23],[80,36],[80,76],[70,85],[30,85],[20,76],[20,36]]);
  if(ellipse(x,y,33,55,6,6)||ellipse(x,y,50,55,6,6)||ellipse(x,y,67,55,6,6))color=2;
 }else if(id==='rim-pot'){
  shape=poly(x,y,[[18,24],[82,24],[82,37],[76,37],[68,85],[32,85],[24,37],[18,37]]);
  if(y<=37)color=2;
 }else if(id==='moon-jar'){
  shape=ellipse(x,y,50,56,31,31)||rect(x,y,39,18,61,36);
  if(y>=38&&y<=77&&((x>=33&&x<=43)||(x>=57&&x<=67)))color=2;
 }
 return shape?color:0;
}
export function createTarget(id){if(!DESIGNS[id])throw new Error('Unknown sculpture preset');const pixels=new Uint8Array(SIZE*SIZE);for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)pixels[y*SIZE+x]=targetPixel(id,(x+.5)/SIZE*100,(y+.5)/SIZE*100);return pixels;}
export function makeBlank(){
 const pixels=new Uint8Array(SIZE*SIZE);
 // The same full lump is supplied for every design. It contains no target geometry.
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const nx=Math.abs((x+.5-SIZE/2)/(SIZE*.455)),ny=Math.abs((y+.5-SIZE/2)/(SIZE*.445));
  if(nx**4+ny**4<=1)pixels[y*SIZE+x]=1;
 }
 return pixels;
}
export const STATION_TOOLS={wheel:'push',carve:'cut',paint:'paint'};
function rowBounds(pixels,row,horizontal=true){
 const at=a=>horizontal?pixels[row*SIZE+a]:pixels[a*SIZE+row];
 let left=0,right=SIZE-1;while(left<SIZE&&!at(left))left++;while(right>=left&&!at(right))right--;
 return {left,right};
}
export function suppliedClay(target,level=1){
 const blank=makeBlank(),amount=[0,.3,.5][level-1]||0;if(!amount)return blank;
 const result=new Uint8Array(SIZE*SIZE);
 const vertical=p=>{let top=0,bottom=SIZE-1;while(top<SIZE&&rowBounds(p,top).right<rowBounds(p,top).left)top++;while(bottom>top&&rowBounds(p,bottom).right<rowBounds(p,bottom).left)bottom--;return {top,bottom};};
 const b=vertical(blank),t=vertical(target),top=Math.round(b.top+(t.top-b.top)*amount),bottom=Math.round(b.bottom+(t.bottom-b.bottom)*amount);
 for(let y=top;y<=bottom;y++){
  const f=(y-top)/(bottom-top),br=rowBounds(blank,Math.round(b.top+f*(b.bottom-b.top))),tr=rowBounds(target,Math.round(t.top+f*(t.bottom-t.top)));
  const left=Math.round(br.left+(tr.left-br.left)*amount),right=Math.round(br.right+(tr.right-br.right)*amount);
  for(let x=left;x<=right;x++)result[y*SIZE+x]=1;
 }return result;
}
export function protectedCut(pixels,before,target,level){
 if(level<2)return;
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const i=y*SIZE+x;if(!target[i]||!before[i]||pixels[i])continue;
  const interior=x>0&&y>0&&x<SIZE-1&&y<SIZE-1&&target[i-1]&&target[i+1]&&target[i-SIZE]&&target[i+SIZE];
  if(level===3||interior)pixels[i]=before[i];
 }
}
export const pixelsEqual=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
// Pick an exterior edge once, independently of the eventual drag direction.
export function clayEdge(pixels,x,y,radius=18,tolerance=0){
 if(!Number.isFinite(x+y+radius))return null;
 radius=Math.max(14,Math.min(26,radius))+tolerance;let best=null,distance=radius;
 for(const horizontal of [true,false]){
  const cross=horizontal?y:x;
  const index=(a,b)=>horizontal?b*SIZE+a:a*SIZE+b;
  for(let row=Math.max(0,Math.floor(cross-radius));row<Math.min(SIZE,Math.ceil(cross+radius));row++){
   let left=0,right=SIZE-1;while(left<SIZE&&!pixels[index(left,row)])left++;while(right>left&&!pixels[index(right,row)])right--;
   if(right-left<5)continue;
   for(const fromLeft of [true,false]){
    const along=(fromLeft?left:right)+.5,px=horizontal?along:row+.5,py=horizontal?row+.5:along,d=Math.hypot(px-x,py-y);
    if(d<distance){distance=d;best={x:px,y:py,horizontal,fromLeft};}
   }
  }
 }
 return best;
}
export function pushClay(pixels,x0,y0,x1,y1,radius=18,grab=undefined,options={}){
 if(!Number.isFinite(x0+y0+x1+y1+radius))return false;
 radius=Math.max(14,Math.min(26,radius));
 const dx=x1-x0,dy=y1-y0;if(Math.hypot(dx,dy)<.75)return false;
 grab=grab===undefined?clayEdge(pixels,x0,y0,radius):grab;if(!grab)return false;
 const {horizontal,fromLeft}=grab,along=horizontal?grab.x:grab.y,cross=horizontal?grab.y:grab.x,rawDelta=horizontal?dx:dy,delta=options.target?Math.max(-28,Math.min(28,rawDelta)):rawDelta,before=pixels.slice();let changed=false;
 const index=(a,b)=>horizontal?b*SIZE+a:a*SIZE+b;
 // Compress/stretch whole bands of clay under a broad hand. Paint moves with the clay.
 for(let row=Math.max(0,Math.floor(cross-radius));row<Math.min(SIZE,Math.ceil(cross+radius));row++){
  let left=0,right=SIZE-1;while(left<SIZE&&!before[index(left,row)])left++;while(right>left&&!before[index(right,row)])right--;
  if(right-left<5)continue;const edge=fromLeft?left:right;if(Math.abs(along-edge)>radius)continue;
  const d=Math.abs(row+.5-cross)/radius;if(d>=1)continue;const influence=(1+Math.cos(d*Math.PI))/2;
  let shift=delta*influence;
  if(options.target&&Math.abs(delta)>=.75){const target=rowBounds(options.target,row,horizontal),wanted=fromLeft?target.left:target.right,proposed=edge+shift,level=options.level||1;if(target.right>=target.left&&Math.abs(wanted-proposed)<=level)shift+=(wanted-proposed)*[.25,.4,.55][level-1];}
  let newLeft=fromLeft?Math.max(0,Math.min(right-5,Math.round(left+shift))):left;
  let newRight=fromLeft?right:Math.min(SIZE-1,Math.max(left+5,Math.round(right+shift)));
  if(options.symmetric&&horizontal){if(fromLeft)newRight=Math.min(SIZE-1,Math.max(newLeft+5,right-(newLeft-left)));else newLeft=Math.max(0,Math.min(newRight-5,left-(newRight-right)));}
  for(let a=Math.min(left,newLeft);a<=Math.max(right,newRight);a++)pixels[index(a,row)]=0;
  for(let a=newLeft;a<=newRight;a++){const src=Math.round(left+(a-newLeft)/(newRight-newLeft)*(right-left));pixels[index(a,row)]=before[index(src,row)];}
 }
 for(let i=0;i<pixels.length;i++)if(pixels[i]!==before[i]){changed=true;break;}return changed;
}
export function applyBrush(pixels,x0,y0,x1,y1,radius,tool,color=2){
 if(!Number.isFinite(x0+y0+x1+y1+radius)||radius<=0)return false;
 const left=Math.max(0,Math.floor(Math.min(x0,x1)-radius)),right=Math.min(SIZE-1,Math.ceil(Math.max(x0,x1)+radius));
 const top=Math.max(0,Math.floor(Math.min(y0,y1)-radius)),bottom=Math.min(SIZE-1,Math.ceil(Math.max(y0,y1)+radius));
 const vx=x1-x0,vy=y1-y0,length=vx*vx+vy*vy;let changed=false;
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
  const t=length?Math.max(0,Math.min(1,((x+.5-x0)*vx+(y+.5-y0)*vy)/length)):0;
  if((x+.5-(x0+t*vx))**2+(y+.5-(y0+t*vy))**2>radius*radius)continue;
  const i=y*SIZE+x,old=pixels[i],next=tool==='cut'?0:tool==='add'?(old||1):old?color:0;
  if(next!==old){pixels[i]=next;changed=true;}
 }
 return changed;
}
export function compareSculpture(actual,target){
 let intersection=0,union=0,missing=0,excess=0;
 const expected=new Uint32Array(PALETTE.length),predicted=new Uint32Array(PALETTE.length),correct=new Uint32Array(PALETTE.length);
 for(let i=0;i<target.length;i++){const a=actual[i]||0,b=target[i];if(a||b)union++;if(a&&b)intersection++;if(a&&!b)excess++;if(b&&!a)missing++;if(b)expected[b]++;if(a)predicted[a]++;if(a===b&&b)correct[b]++;}
 const shape=union?intersection/union*100:0;
 let paint=0,classes=0;for(let c=1;c<PALETTE.length;c++)if(expected[c]||predicted[c]){paint+=(2*correct[c]/(expected[c]+predicted[c]))*100;classes++;}
 paint=classes?paint/classes:0;
 const raw=shape*.65+paint*.35;
 // Floor the displayed tenth so a failing 79.99 cannot look like a passing 80.
 return {score:Math.floor(raw*10+1e-8)/10,shape:Math.floor(shape*10+1e-8)/10,paint:Math.floor(paint*10+1e-8)/10,passed:raw+1e-9>=PASS_SCORE,missing,excess};
}
export class SculptureChallenge {
 constructor({tutorial=true}={}){this.tutorial=tutorial?freshTutorial():completedTutorial();this.scene=0;this.phase='levels';this.level=0;this.attempt=1;this.money=0;this.delivered=0;this.submissions=0;this.results=[];this.collection=[];this.workshopLevels=freshWorkshopLevels();this.shelf=[0,0,0,0];this.kiln=null;this.revision=0;this.newPiece();}
 get tutorialStep(){return tutorialInfo(this.tutorial);}
 advanceTutorial(action){this.tutorial=nextTutorialStep(this.tutorial,action);}
 allowsStation(station){return tutorialAllows(this.tutorial,station);}
 stationLevel(id){return this.workshopLevels[this.scene][id]||1;}
 upgradeStation(id,expectedLevel=this.stationLevel(id)){
  if(!WORKBENCH_IDS.includes(id)||this.completed||this.stationLevel(id)!==expectedLevel||expectedLevel>=3)return false;
  const cost=UPGRADE_COSTS[expectedLevel];if(this.money<cost)return false;
  this.finishStroke();this.money-=cost;this.workshopLevels[this.scene][id]++;return true;
 }
 advanceEfficiency(ms){if(this.hasClay&&this.canWork&&this.efficiency.eligible&&Number.isFinite(ms)&&ms>0)this.efficiency.elapsedMs+=ms;}
 get completed(){return this.phase==='complete';}
 get sceneInfo(){return SCENES[this.scene];}
 get sceneResults(){return this.results.filter(r=>r.scene===this.scene&&r.level<=ORDERS_PER_SCENE);}
 get scenePassed(){return this.sceneResults.length;}
 get sceneComplete(){return this.scenePassed===ORDERS_PER_SCENE;}
 get canWork(){return this.phase==='levels'||this.phase==='practice';}
 get canSubmit(){return this.canWork&&this.hasClay&&!!this.kilnResult&&this.allowsStation('serve');}
 get canPurchase(){return this.phase==='ready'&&this.sceneComplete&&this.money>=DECAL_PRICE;}
 get preset(){return PRESETS[this.level];}
 get hasPaint(){return this.piece.pixels.includes(2);}
 get hasShape(){return this.shapeEdits>0;}
 get stageIndex(){return this.kilnResult?3:this.hasPaint?2:this.hasShape?1:0;}
 get orders(){return this.phase==='levels'?CAMPAIGN_PRESETS.slice(this.level).map((p,i)=>({id:this.scene*ORDERS_PER_SCENE+this.level+i+1,design:p.id})):this.phase==='practice'?[{id:SCENES.length*ORDERS_PER_SCENE+this.submissions+1,design:this.preset.id}]:[];}
 newPiece(){this.target=createTarget(this.preset.id);this.piece={design:this.preset.id,stage:'sculpting',pixels:suppliedClay(this.target,this.stationLevel('clay')),revision:++this.revision};this.undoStack=[];this.redoStack=[];this.pendingStroke=null;this.edits=0;this.shapeEdits=0;this.hasClay=false;this.activeStation=null;this.fired=false;this.kiln=null;this.kilnResult=null;this._fireDrift=null;this.efficiency={elapsedMs:0,limitMs:EFFICIENCY_LIMIT_MS,eligible:false};}
 collectClay(){if(!this.canWork||!this.allowsStation('clay'))return false;this.newPiece();this.hasClay=true;this.efficiency.eligible=true;if(this.tutorialStep)this.tutorial={status:'active',step:'wheel'};return true;}
 stationLock(station){
  if(!this.canWork||!STATION_TOOLS[station])return null;
  if(!this.allowsStation(station))return 'tutorial';
  if(!this.hasClay)return 'clay';
  if(this.kilnResult)return station==='paint'?null:'fired';
  if(this.hasPaint&&(station==='wheel'||station==='carve'))return 'painted';
  if(station==='paint'&&!this.hasShape)return 'shape';
  return null;
 }
 startStation(station){if(!this.hasClay||!STATION_TOOLS[station]||!this.canWork||this.stationLock(station))return false;this.finishStroke();this.activeStation=station;return true;}
 endStation(){this.finishStroke();this.activeStation=null;}
 beginStroke(){
  if(!this.hasClay||!this.activeStation)return false;this.finishStroke();
  this.pendingStroke={pixels:this.piece.pixels.slice(),station:this.activeStation,edits:this.edits,kiln:this.kiln,kilnResult:this.kilnResult,tutorial:{...this.tutorial}};return true;
 }
 finishStroke(){
  const before=this.pendingStroke;if(!before)return false;this.pendingStroke=null;
  if(pixelsEqual(before.pixels,this.piece.pixels)){this.edits=before.edits;this.kiln=before.kiln;this.kilnResult=before.kilnResult;this.fired=!!this.kilnResult;return false;}
  this.undoStack.push({pixels:before.pixels,station:before.station,tutorial:before.tutorial});if(this.undoStack.length>50)this.undoStack.shift();this.redoStack=[];this.advanceTutorial(before.station);return true;
 }
 invalidateFiring(){this.kiln=null;this.kilnResult=null;this.fired=false;}
 stroke(x0,y0,x1,y1,radius,tool,color,base=null,grab=undefined,options={}){
  if(!this.hasClay||STATION_TOOLS[this.activeStation]!==tool)return false;
  if(this.fired&&tool!=='paint')return false;
  if(tool==='paint'&&!this.hasShape)return false;
  const previous=this.piece.pixels.slice();if(tool==='push'&&base)this.piece.pixels=base.slice();
  if(tool==='paint'&&options.line&&base&&this.stationLevel('paint')>=2)this.piece.pixels=base.slice();
  if(tool==='push')pushClay(this.piece.pixels,x0,y0,x1,y1,radius,grab,{target:this.target,level:this.stationLevel('wheel'),symmetric:options.symmetric!==false});
  else {
   const before=this.piece.pixels.slice();applyBrush(this.piece.pixels,x0,y0,x1,y1,radius,tool,color);
   if(tool==='cut'&&options.protect!==false)protectedCut(this.piece.pixels,before,this.target,this.stationLevel('carve'));
   if(tool==='paint'&&options.mirror&&this.stationLevel('paint')===3)applyBrush(this.piece.pixels,SIZE-x0,y0,SIZE-x1,y1,radius,tool,color);
  }
  const changed=!pixelsEqual(previous,this.piece.pixels);
  if(changed){
   this.piece.revision=++this.revision;this.edits++;
   if(tool==='paint')this.piece.stage=this.fired?'fired':'painted';
   else{this.shapeEdits++;this.piece.stage=this.hasPaint?'painted':'shaped';this.invalidateFiring();}
  }return changed;
 }
 undo(){
  this.finishStroke();const last=this.undoStack.at(-1);if(!last||last.station!==this.activeStation||this.fired&&last.station!=='paint')return false;
  this.redoStack.push({pixels:this.piece.pixels.slice(),station:this.activeStation,tutorial:{...this.tutorial}});
  this.piece.pixels=this.undoStack.pop().pixels;this.piece.revision=++this.revision;
  if(this.tutorialStep&&last.tutorial)this.tutorial={...last.tutorial};
  if(last.station!=='paint')this.invalidateFiring();this.piece.stage=this.fired?'fired':this.hasPaint?'painted':this.hasShape?'shaped':'sculpting';return true;
 }
 redo(){
  this.finishStroke();const last=this.redoStack.at(-1);if(!last||last.station!==this.activeStation||this.fired&&last.station!=='paint')return false;
  this.undoStack.push({pixels:this.piece.pixels.slice(),station:this.activeStation,tutorial:{...this.tutorial}});
  this.piece.pixels=this.redoStack.pop().pixels;this.piece.revision=++this.revision;
  if(this.tutorialStep&&last.tutorial)this.tutorial={...last.tutorial};
  if(last.station!=='paint')this.invalidateFiring();this.piece.stage=this.fired?'fired':this.hasPaint?'painted':this.hasShape?'shaped':'sculpting';return true;
 }
 restart(){if(!this.canWork)return false;this.attempt++;this.newPiece();if(this.tutorialStep)this.tutorial={status:'active',step:'clay'};return true;}
 nextStation(){if(!this.canWork)return null;if(this.tutorialStep)return this.tutorial.step==='move'?'clay':this.tutorial.step;if(!this.hasClay)return 'clay';if(!this.hasShape)return 'wheel';if(!this.hasPaint)return 'paint';if(!this.kilnResult)return 'kiln';return 'serve';}
 fire(){
  this.finishStroke();
  if(this.kiln||this.kilnResult||!this.hasClay||!this.canWork||!this.hasShape||!this.hasPaint||!this.allowsStation('kiln'))return false;
  const level=this.stationLevel('kiln'),seed=fireSeed();this._fireDrift=createFireDrift(seed);
  this.kiln={design:this.preset.id,revision:this.piece.revision,pixels:this.piece.pixels.slice(),duration:FIRE_DURATION,remaining:FIRE_DURATION,heat:FIRE_START_HEAT,center:.6,stoking:false,seed,bands:fireBand(level),seconds:{perfect:0,good:0,fair:0},upgradeBonus:(level-1)*.1};
  return true;
 }
 kilnProgress(){if(this.kilnResult)return this.kilnResult.progress;const k=this.kiln;return k?k.heat:0;}
 setStoking(value){const k=this.kiln;if(!k)return false;k.stoking=!!value;return k.stoking;}
 tick(dt){
  if(!this.kiln||!Number.isFinite(dt)||dt<=0)return;
  const step=1/120;let left=Math.min(dt,this.kiln.remaining);
  while(this.kiln&&left>1e-9){
   const k=this.kiln,h=Math.min(left,step);left-=h;k.remaining=Math.max(0,k.remaining-h);
   k.heat=Math.min(1,Math.max(0,k.heat+(k.stoking?FIRE_HEAT_RATE:-FIRE_COOL_RATE)*h));
   const drift=this._fireDrift||(this._fireDrift=createFireDrift(k.seed));
   k.center=drift(k.duration-k.remaining);
   const d=Math.abs(k.heat-k.center);
   if(d<=k.bands.perfect)k.seconds.perfect+=h;else if(d<=k.bands.good)k.seconds.good+=h;else k.seconds.fair+=h;
   if(k.remaining<=1e-9)this.finishFiring();
  }
 }
 finishFiring(){
  const k=this.kiln;if(!k)return;
  const seconds={perfect:+k.seconds.perfect.toFixed(4),good:+k.seconds.good.toFixed(4),fair:+k.seconds.fair.toFixed(4)};
  const grade=fireGrade(seconds),ratio=fireRatio(seconds);
  this.kilnResult={grade,multiplier:Number((KILN_GRADES[grade].multiplier+k.upgradeBonus).toFixed(2)),duration:k.duration,seconds,ratio:Number(ratio.toFixed(3)),progress:k.heat,center:k.center,zones:{...k.bands},seed:k.seed};
  this.kiln=null;this.fired=true;this.piece.stage='fired';this._fireDrift=null;this.advanceTutorial('kiln');
 }
 submit(){
  if(!this.canWork||!this.hasClay)return {valid:false,passed:false,complete:this.completed,earned:0};
  this.finishStroke();if(!this.canSubmit)return {valid:false,passed:false,earned:0,reason:'firing-required'};
  this.advanceTutorial('serve');
  const practice=this.phase==='practice';
  const result={valid:true,...compareSculpture(this.piece.pixels,this.target),scene:this.scene,practice,level:this.level+1,attempt:this.attempt,design:this.preset.id,pixels:this.piece.pixels.slice(),target:this.target.slice()};
  const grade=KILN_GRADES[this.kilnResult.grade];
  result.kiln={...this.kilnResult,label:grade.label,multiplier:this.kilnResult.multiplier??grade.multiplier};
  result.baseEarned=rewardForScore(result.score);result.serveMultiplier=1+(this.stationLevel('serve')-1)*.1;
  Object.assign(result,orderIncome(result.baseEarned,{kiln:result.kiln.multiplier,serve:result.serveMultiplier,passed:result.passed,...this.efficiency,firstPass:!practice&&result.passed}));
  this.money+=result.earned;
  this.submissions++;
  if(result.passed)this.shelf[this.scene]=Math.min(9,(this.shelf[this.scene]||0)+1);
  if(practice){this.phase='ready';this.level=ORDERS_PER_SCENE-1;this.attempt=1;this.newPiece();}
  else if(result.passed){
   this.delivered++;
   this.results.push({scene:this.scene,level:result.level,score:result.score,earned:result.earned,baseEarned:result.baseEarned,kiln:result.kiln,serveMultiplier:result.serveMultiplier,regularEarned:result.regularEarned,serveBonus:result.serveBonus,efficiency:result.efficiency,efficiencyBonus:result.efficiencyBonus,firstPassBonus:result.firstPassBonus});
   if(this.level===ORDERS_PER_SCENE-1)this.phase='ready';
   else this.level++;
   this.attempt=1;this.newPiece();
  }else this.restart();
  return result;
 }
 beginPractice(level=0){
  if(this.phase!=='ready'||!this.sceneComplete||!Number.isInteger(level)||level<0||level>=PRESETS.length)return false;
  this.phase='practice';this.level=level;this.attempt=1;this.newPiece();return true;
 }
 buyDecal(){
  if(!this.canPurchase)return false;
  this.money-=DECAL_PRICE;this.phase='decal';this.newPiece();return true;
 }
 applyDecal(){
  if(this.phase!=='decal')return false;
  this.collection.push({scene:this.scene,id:this.sceneInfo.id,product:this.sceneInfo.product});
  this.phase='crafted';return true;
 }
 nextScene(){
  if(this.phase!=='crafted')return false;
  if(this.scene===SCENES.length-1){this.phase='complete';return true;}
  this.scene++;this.phase='levels';this.level=0;this.attempt=1;this.newPiece();return true;
 }
 serialize(){return {version:8,tutorial:{...this.tutorial},workshopLevels:this.workshopLevels,efficiency:this.efficiency,scene:this.scene,phase:this.phase,collection:this.collection,level:this.level,attempt:this.attempt,money:this.money,delivered:this.delivered,submissions:this.submissions,results:this.results,shelf:this.shelf,pixels:Array.from(this.piece.pixels),hasClay:this.hasClay,fired:this.fired,kilnResult:this.kilnResult,kilnGrade:this.kilnResult?.grade||null,edits:this.edits,shapeEdits:this.shapeEdits,stage:this.piece.stage};}
 static restore(data){
  const c=new SculptureChallenge();
  if(!data||![4,5,6,7,8].includes(data.version)||!Number.isInteger(data.level)||data.level<0||data.level>=PRESETS.length||!Array.isArray(data.pixels)||data.pixels.length!==SIZE*SIZE||data.pixels.some(p=>!Number.isInteger(p)||p<0||p>=PALETTE.length))return c;
  const integer=(v,fallback=0)=>Number.isSafeInteger(v)&&v>=0?v:fallback;
  const old=data.version===4;
  c.scene=old?0:integer(data.scene,0);
  c.phase=old?(data.completed?'ready':'levels'):data.phase;
  if(c.scene>=SCENES.length||!['levels','ready','practice','decal','crafted','complete'].includes(c.phase))return new SculptureChallenge();
  c.level=data.level;c.attempt=Math.max(1,integer(data.attempt,1));c.money=integer(data.money);c.submissions=integer(data.submissions,data.delivered||0);
  c.results=(Array.isArray(data.results)?data.results:[]).filter(r=>r&&Number.isInteger(r.level)&&r.level>=1&&r.level<=5&&Number.isFinite(r.score)&&r.score>=PASS_SCORE&&r.score<=100&&(old||(Number.isInteger(r.scene)&&r.scene>=0&&r.scene<=c.scene))).map(r=>({scene:old?0:r.scene,level:r.level,score:r.score,earned:integer(r.earned,rewardForScore(r.score)),baseEarned:integer(r.baseEarned,rewardForScore(r.score)),kiln:KILN_GRADES[r.kiln?.grade]?{...r.kiln}:null}));
  c.delivered=c.results.filter(r=>r.level<=ORDERS_PER_SCENE).length;
  c.collection=old?[]:(Array.isArray(data.collection)?data.collection:[]).filter((item,i)=>item&&item.scene===i&&SCENES[i]?.id===item.id).map(item=>({scene:item.scene,id:SCENES[item.scene].id,product:SCENES[item.scene].product}));
  const expectedCollection=c.scene+(['crafted','complete'].includes(c.phase)?1:0);
  const unique=new Set(c.results.map(r=>`${r.scene}:${r.level}`));
  if(unique.size!==c.results.length||c.collection.length!==expectedCollection||(c.phase==='complete'&&c.scene!==3))return new SculptureChallenge();
  const legacy=data.version<8,required=legacy?PRESETS.length:ORDERS_PER_SCENE;
  for(let scene=0;scene<c.scene;scene++){
   const levels=new Set(c.results.filter(r=>r.scene===scene).map(r=>r.level));
   if(!Array.from({length:required},(_,i)=>i+1).every(level=>levels.has(level)))return new SculptureChallenge();
  }
  const current=c.results.filter(r=>r.scene===c.scene),count=legacy?current.length:c.scenePassed;
  if(c.phase==='levels'?(count!==c.level||current.some(r=>r.level>c.level)||(!legacy&&c.level>=ORDERS_PER_SCENE)):count<required)return new SculptureChallenge();
  if(legacy&&c.phase==='levels'&&c.sceneComplete)c.phase=data.hasClay?'practice':'ready';
  if(!c.canWork)c.level=ORDERS_PER_SCENE-1;
  c.newPiece();c.piece.pixels=Uint8Array.from(data.pixels);c.hasClay=c.canWork&&!!data.hasClay;c.fired=c.hasClay&&!!data.fired;c.edits=integer(data.edits);
  c.shapeEdits=Math.max(integer(data.shapeEdits),c.edits>0?1:0);
  c.piece.stage=c.fired?'fired':c.hasPaint?'painted':c.shapeEdits>0?'shaped':'sculpting';
  const savedGrade=data.kilnResult?.grade||data.kilnGrade,grade=Object.hasOwn(KILN_GRADES,savedGrade)?savedGrade:'plain';
  if(c.fired){
   const k=data.kilnResult,s=k?.seconds,seconds=s&&['perfect','good','fair'].every(key=>Number.isFinite(s[key])&&s[key]>=0)?{perfect:s.perfect,good:s.good,fair:s.fair}:null;
   const progress=Number.isFinite(k?.progress)?Math.max(0,Math.min(1,k.progress)):1;
   const multiplier=Number.isFinite(k?.multiplier)&&k.multiplier>=1&&k.multiplier<=1.45?k.multiplier:KILN_GRADES[grade].multiplier;
   c.kilnResult=seconds&&seconds.perfect+seconds.good+seconds.fair>0
    ?{grade,progress,multiplier,duration:Number.isFinite(k.duration)&&k.duration>0?k.duration:FIRE_DURATION,seconds,ratio:Number.isFinite(k.ratio)?Math.max(0,Math.min(1,k.ratio)):fireRatio(seconds),zones:{good:Number.isFinite(k.zones?.good)?k.zones.good:fireBand(1).good,perfect:Number.isFinite(k.zones?.perfect)?k.zones.perfect:fireBand(1).perfect},center:Number.isFinite(k.center)?Math.max(.4,Math.min(.8,k.center)):fireBand(1).center,seed:integer(k.seed)}
    :{grade,progress,multiplier,legacy:true};
  }
  if(data.version>=6){c.workshopLevels=restoreWorkshopLevels(data.workshopLevels);const e=data.efficiency;if(c.hasClay&&e?.eligible===true&&Number.isFinite(e.elapsedMs)&&e.elapsedMs>=0)c.efficiency={elapsedMs:e.elapsedMs,limitMs:EFFICIENCY_LIMIT_MS,eligible:true};
   c.results=c.results.map(r=>{const source=(data.results||[]).find(v=>v.scene===r.scene&&v.level===r.level)||{};return {...r,regularEarned:integer(source.regularEarned,r.earned),serveBonus:integer(source.serveBonus),serveMultiplier:[1,1.1,1.2].includes(source.serveMultiplier)?source.serveMultiplier:1,efficiency:source.efficiency&&Number.isFinite(source.efficiency.elapsedMs)&&source.efficiency.elapsedMs>=0?{elapsedMs:source.efficiency.elapsedMs,limitMs:EFFICIENCY_LIMIT_MS,eligible:!!source.efficiency.eligible,qualified:!!source.efficiency.qualified}:null,efficiencyBonus:integer(source.efficiencyBonus),firstPassBonus:integer(source.firstPassBonus)};});}
  const savedShelf=Array.isArray(data.shelf)?data.shelf.map(v=>Math.min(9,integer(v))):null;
  c.shelf=data.version>=7&&savedShelf&&savedShelf.length===4?savedShelf:Array.from({length:4},(_,i)=>Math.min(9,c.results.filter(r=>r.scene===i).length));
  c.tutorial=completedTutorial();
  if(data.version===8&&c.scene===0&&c.level===0&&c.phase==='levels'&&c.submissions===0){
   const saved=tutorialInfo(data.tutorial);
   if(saved){
    c.tutorial={status:'active',step:saved.id};
    if(!c.hasClay&&saved.id!=='move')c.tutorial.step='clay';
    else if(c.hasClay&&['move','clay'].includes(saved.id))c.tutorial.step='wheel';
    if(c.tutorial.step==='serve'&&!c.kilnResult)c.tutorial.step='kiln';
   }else if(data.tutorial?.status!=='complete')c.tutorial=c.hasClay?{status:'active',step:'wheel'}:freshTutorial();
  }
  return c;
 }
}
