// A small, deterministic relief canvas: 0 is empty, 1–5 are actual clay/paint colors.
export const SIZE = 112;
import {SCENES, DECAL_PRICE, rewardForScore} from './campaign.js';
export const PASS_SCORE = 80;
// Firing is a timing beat: a needle sweeps an annulus, Space locks the heat in.
export const KILN_SECONDS = 9;
export const KILN_WINDOWS = {perfect:[.62,.7],good:[.5,.8]};
export const KILN_GRADES = {
 perfect:{id:'perfect',label:'完美',multiplier:1.25},
 good:{id:'good',label:'成功',multiplier:1.1},
 plain:{id:'plain',label:'一般',multiplier:1},
};
export function kilnGradeAt(progress){
 // Timer arithmetic can put an exact boundary one floating-point step outside.
 const p=Math.round(Math.min(1,Math.max(0,progress))*1e12)/1e12;
 if(p>=KILN_WINDOWS.perfect[0]&&p<=KILN_WINDOWS.perfect[1])return KILN_GRADES.perfect;
 if(p>=KILN_WINDOWS.good[0]&&p<=KILN_WINDOWS.good[1])return KILN_GRADES.good;
 return KILN_GRADES.plain;
}
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
export const pixelsEqual=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
// Pick an exterior edge once, independently of the eventual drag direction.
export function clayEdge(pixels,x,y,radius=18){
 if(!Number.isFinite(x+y+radius))return null;
 radius=Math.max(14,Math.min(26,radius));let best=null,distance=radius;
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
export function pushClay(pixels,x0,y0,x1,y1,radius=18,grab=undefined){
 if(!Number.isFinite(x0+y0+x1+y1+radius))return false;
 radius=Math.max(14,Math.min(26,radius));
 const dx=x1-x0,dy=y1-y0;if(Math.hypot(dx,dy)<.75)return false;
 grab=grab===undefined?clayEdge(pixels,x0,y0,radius):grab;if(!grab)return false;
 const {horizontal,fromLeft}=grab,along=horizontal?grab.x:grab.y,cross=horizontal?grab.y:grab.x,delta=horizontal?dx:dy,before=pixels.slice();let changed=false;
 const index=(a,b)=>horizontal?b*SIZE+a:a*SIZE+b;
 // Compress/stretch whole bands of clay under a broad hand. Paint moves with the clay.
 for(let row=Math.max(0,Math.floor(cross-radius));row<Math.min(SIZE,Math.ceil(cross+radius));row++){
  let left=0,right=SIZE-1;while(left<SIZE&&!before[index(left,row)])left++;while(right>left&&!before[index(right,row)])right--;
  if(right-left<5)continue;const edge=fromLeft?left:right;if(Math.abs(along-edge)>radius)continue;
  const d=Math.abs(row+.5-cross)/radius;if(d>=1)continue;const influence=(1+Math.cos(d*Math.PI))/2;
  const newLeft=fromLeft?Math.max(0,Math.min(right-5,Math.round(left+delta*influence))):left;
  const newRight=fromLeft?right:Math.min(SIZE-1,Math.max(left+5,Math.round(right+delta*influence)));
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
 constructor(){this.scene=0;this.phase='levels';this.level=0;this.attempt=1;this.money=0;this.delivered=0;this.submissions=0;this.results=[];this.collection=[];this.kiln=null;this.revision=0;this.newPiece();}
 get completed(){return this.phase==='complete';}
 get sceneInfo(){return SCENES[this.scene];}
 get sceneResults(){return this.results.filter(r=>r.scene===this.scene);}
 get scenePassed(){return this.sceneResults.length;}
 get sceneComplete(){return this.scenePassed===PRESETS.length;}
 get canWork(){return this.phase==='levels'||this.phase==='practice';}
 get canSubmit(){return this.canWork&&this.hasClay&&!!this.kilnResult;}
 get canPurchase(){return this.phase==='ready'&&this.sceneComplete&&this.money>=DECAL_PRICE;}
 get preset(){return PRESETS[this.level];}
 get orders(){return Array.from({length:3},(_,i)=>({id:this.submissions+i+1,design:PRESETS[(this.level+i)%PRESETS.length].id}));}
 newPiece(){this.target=createTarget(this.preset.id);this.piece={design:this.preset.id,stage:'sculpting',pixels:makeBlank(),revision:++this.revision};this.undoStack=[];this.redoStack=[];this.pendingStroke=null;this.edits=0;this.hasClay=false;this.activeStation=null;this.fired=false;this.kiln=null;this.kilnResult=null;}
 collectClay(){if(!this.canWork)return false;this.newPiece();this.hasClay=true;return true;}
 startStation(station){if(!this.hasClay||!STATION_TOOLS[station]||!this.canWork)return false;this.finishStroke();this.activeStation=station;return true;}
 endStation(){this.finishStroke();this.activeStation=null;}
 beginStroke(){
  if(!this.hasClay||!this.activeStation)return false;this.finishStroke();
  this.pendingStroke={pixels:this.piece.pixels.slice(),station:this.activeStation,edits:this.edits,kiln:this.kiln,kilnResult:this.kilnResult};return true;
 }
 finishStroke(){
  const before=this.pendingStroke;if(!before)return false;this.pendingStroke=null;
  if(pixelsEqual(before.pixels,this.piece.pixels)){this.edits=before.edits;this.kiln=before.kiln;this.kilnResult=before.kilnResult;this.fired=!!this.kilnResult;return false;}
  this.undoStack.push({pixels:before.pixels,station:before.station});if(this.undoStack.length>50)this.undoStack.shift();this.redoStack=[];return true;
 }
 invalidateFiring(){this.kiln=null;this.kilnResult=null;this.fired=false;}
 stroke(x0,y0,x1,y1,radius,tool,color,base=null,grab=undefined){
  if(!this.hasClay||STATION_TOOLS[this.activeStation]!==tool)return false;
  const previous=this.piece.pixels.slice();if(tool==='push'&&base)this.piece.pixels=base.slice();
  if(tool==='push')pushClay(this.piece.pixels,x0,y0,x1,y1,radius,grab);else applyBrush(this.piece.pixels,x0,y0,x1,y1,radius,tool,color);
  const changed=!pixelsEqual(previous,this.piece.pixels);
  if(changed){this.piece.revision=++this.revision;this.edits++;this.invalidateFiring();}return changed;
 }
 undo(){this.finishStroke();const last=this.undoStack.at(-1);if(!last||last.station!==this.activeStation)return false;this.redoStack.push({pixels:this.piece.pixels.slice(),station:this.activeStation});this.piece.pixels=this.undoStack.pop().pixels;this.piece.revision=++this.revision;this.invalidateFiring();return true;}
 redo(){this.finishStroke();const last=this.redoStack.at(-1);if(!last||last.station!==this.activeStation)return false;this.undoStack.push({pixels:this.piece.pixels.slice(),station:this.activeStation});this.piece.pixels=this.redoStack.pop().pixels;this.piece.revision=++this.revision;this.invalidateFiring();return true;}
 restart(){if(!this.canWork)return false;this.attempt++;this.newPiece();return true;}
 nextStation(){return null;}
 fire(){this.finishStroke();if(this.kiln||this.kilnResult||!this.hasClay||!this.canWork)return false;this.kiln={design:this.preset.id,pixels:this.piece.pixels.slice(),remaining:KILN_SECONDS};return true;}
 kilnProgress(){if(this.kilnResult)return this.kilnResult.progress;return this.kiln?Math.min(1,Math.max(0,1-this.kiln.remaining/KILN_SECONDS)):0;}
 strike(){
  const k=this.kiln;
  if(!k||this.kilnResult)return null;
  const progress=this.kilnProgress(),grade=kilnGradeAt(progress);
  this.kilnResult={grade:grade.id,progress};this.kiln=null;this.fired=true;
  return {...this.kilnResult,label:grade.label,multiplier:grade.multiplier};
 }
 tick(dt){
  const k=this.kiln;
  if(!k||!Number.isFinite(dt))return;
  k.remaining=Math.max(0,k.remaining-Math.max(0,dt));
  if(!k.remaining)this.strike();
 }
 submit(){
  if(!this.canWork||!this.hasClay)return {valid:false,passed:false,complete:this.completed,earned:0};
  this.finishStroke();if(!this.canSubmit)return {valid:false,passed:false,earned:0,reason:'firing-required'};
  const practice=this.phase==='practice';
  const result={valid:true,...compareSculpture(this.piece.pixels,this.target),scene:this.scene,practice,level:this.level+1,attempt:this.attempt,design:this.preset.id,pixels:this.piece.pixels.slice(),target:this.target.slice()};
  const grade=KILN_GRADES[this.kilnResult.grade];
  result.kiln={...this.kilnResult,label:grade.label,multiplier:grade.multiplier};
  result.baseEarned=rewardForScore(result.score);result.earned=Math.round(result.baseEarned*grade.multiplier);result.kilnBonus=result.earned-result.baseEarned;
  this.money+=result.earned;
  this.submissions++;
  if(practice){this.phase='ready';this.level=4;this.attempt=1;this.newPiece();}
  else if(result.passed){
   this.delivered++;
   this.results.push({scene:this.scene,level:result.level,score:result.score,earned:result.earned,baseEarned:result.baseEarned,kiln:result.kiln});
   if(this.level===PRESETS.length-1)this.phase='ready';
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
 serialize(){return {version:5,scene:this.scene,phase:this.phase,collection:this.collection,level:this.level,attempt:this.attempt,money:this.money,delivered:this.delivered,submissions:this.submissions,results:this.results,pixels:Array.from(this.piece.pixels),hasClay:this.hasClay,fired:this.fired,kilnResult:this.kilnResult,kilnGrade:this.kilnResult?.grade||null,edits:this.edits};}
 static restore(data){
  const c=new SculptureChallenge();
  if(!data||![4,5].includes(data.version)||!Number.isInteger(data.level)||data.level<0||data.level>=PRESETS.length||!Array.isArray(data.pixels)||data.pixels.length!==SIZE*SIZE||data.pixels.some(p=>!Number.isInteger(p)||p<0||p>=PALETTE.length))return c;
  const integer=(v,fallback=0)=>Number.isSafeInteger(v)&&v>=0?v:fallback;
  const old=data.version===4;
  c.scene=old?0:integer(data.scene,0);
  c.phase=old?(data.completed?'ready':'levels'):data.phase;
  if(c.scene>=SCENES.length||!['levels','ready','practice','decal','crafted','complete'].includes(c.phase))return new SculptureChallenge();
  c.level=data.level;c.attempt=Math.max(1,integer(data.attempt,1));c.money=integer(data.money);c.submissions=integer(data.submissions,data.delivered||0);
  c.results=(Array.isArray(data.results)?data.results:[]).filter(r=>r&&Number.isInteger(r.level)&&r.level>=1&&r.level<=5&&Number.isFinite(r.score)&&r.score>=PASS_SCORE&&r.score<=100&&(old||(Number.isInteger(r.scene)&&r.scene>=0&&r.scene<=c.scene))).map(r=>({scene:old?0:r.scene,level:r.level,score:r.score,earned:integer(r.earned,rewardForScore(r.score)),baseEarned:integer(r.baseEarned,rewardForScore(r.score)),kiln:KILN_GRADES[r.kiln?.grade]?{...r.kiln}:null}));
  c.delivered=c.results.length;
  c.collection=old?[]:(Array.isArray(data.collection)?data.collection:[]).filter((item,i)=>item&&item.scene===i&&SCENES[i]?.id===item.id).map(item=>({scene:item.scene,id:SCENES[item.scene].id,product:SCENES[item.scene].product}));
  const expectedCollection=c.scene+(['crafted','complete'].includes(c.phase)?1:0);
  const unique=new Set(c.results.map(r=>`${r.scene}:${r.level}`));
  if(unique.size!==c.results.length||c.collection.length!==expectedCollection||(c.phase==='complete'&&c.scene!==3))return new SculptureChallenge();
  for(let scene=0;scene<c.scene;scene++)if(c.results.filter(r=>r.scene===scene).length!==5)return new SculptureChallenge();
  if(c.phase==='levels'?(c.scenePassed!==c.level||c.sceneResults.some(r=>r.level>c.level)):!c.sceneComplete)return new SculptureChallenge();
  c.newPiece();c.piece.pixels=Uint8Array.from(data.pixels);c.hasClay=c.canWork&&!!data.hasClay;c.fired=c.hasClay&&!!data.fired;c.edits=integer(data.edits);
  const savedGrade=data.kilnResult?.grade||data.kilnGrade,grade=Object.hasOwn(KILN_GRADES,savedGrade)?savedGrade:'plain';
  if(c.fired)c.kilnResult={grade,progress:Number.isFinite(data.kilnResult?.progress)?Math.max(0,Math.min(1,data.kilnResult.progress)):1};
  return c;
 }
}
