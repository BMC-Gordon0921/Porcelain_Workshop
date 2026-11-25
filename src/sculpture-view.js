import {canvasPoint,containedCanvasPoint} from './platform/canvas-metrics.js';
import {SIZE,PALETTE,clayEdge} from './sculpture.js';
// 画布上的颜色一律从 art-direction.css 的令牌读取，避免在 JS 里再抄一份调色板。
let toneCache=null;
function tones(){
  const css=getComputedStyle(document.documentElement),v=(n,f)=>css.getPropertyValue(n).trim()||f;
  // 坯板底色随站点主题变，所以缓存要带上站点色做键。
  const key=v('--xz-station','');
  if(toneCache&&toneCache.key===key)return toneCache;
  return toneCache={key,paper0:v('--xz-paper-0','#fdf9f0'),paper2:v('--xz-paper-2','#ece2ca'),board0:v('--xz-clay-0','#f2ead9'),board1:v('--xz-clay-1','#e2d5bb'),ink:v('--xz-ink','#20262c'),zhu:v('--xz-zhu','#ad3a2c'),qing1:v('--xz-qing-1','#26548c')};
}
// 目标轮廓之外的区域压一层墨色遮罩：看得出「这块不在单子里」，也不会和纸底混成一片。
let scrimCache=null,scrimSource=null;
function outsideScrim(target){
  if(scrimCache&&scrimSource===target)return scrimCache;
  const c=document.createElement('canvas');c.width=c.height=SIZE;
  const ctx=c.getContext('2d'),img=ctx.createImageData(SIZE,SIZE),n=parseInt(tones().ink.slice(1),16);
  for(let i=0;i<SIZE*SIZE;i++){if(target[i])continue;const o=i*4;img.data[o]=n>>16;img.data[o+1]=(n>>8)&255;img.data[o+2]=n&255;img.data[o+3]=88;}
  ctx.putImageData(img,0,0);scrimSource=target;scrimCache=c;return c;
}
function layer(pixels,flatColor){const c=document.createElement('canvas');c.width=c.height=SIZE;const ctx=c.getContext('2d'),img=ctx.createImageData(SIZE,SIZE);for(let i=0;i<pixels.length;i++){if(!pixels[i])continue;const color=flatColor||PALETTE[pixels[i]],n=parseInt(color.slice(1),16);img.data[i*4]=n>>16;img.data[i*4+1]=(n>>8)&255;img.data[i*4+2]=n&255;img.data[i*4+3]=255;}ctx.putImageData(img,0,0);return c;}
export function drawSculpture(canvas,pixels,{cursor=null,grid=false,target=null,line=null,background=true}={}){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const t=tones();
 // 参考图要透出卡片底色，不铺坯板底。
 if(background){const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,t.board0);bg.addColorStop(1,t.board1);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);}
 if(grid){ctx.strokeStyle='#aa977315';ctx.lineWidth=1;for(let i=0;i<=16;i++){const p=i*w/16;ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,h);ctx.moveTo(0,p);ctx.lineTo(w,p);ctx.stroke();}}
 ctx.imageSmoothingEnabled=false;
 const depth=layer(pixels,t.ink);ctx.save();ctx.globalAlpha=.3;ctx.shadowColor=t.ink;ctx.shadowBlur=w*.03;ctx.shadowOffsetY=w*.018;ctx.drawImage(depth,w*.009,w*.013,w,h);ctx.restore();ctx.drawImage(layer(pixels),0,0,w,h);
 if(target){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(outsideScrim(target),0,0,w,h);ctx.restore();}
 if(target){
  const sx=w/SIZE,sy=h/SIZE;
  // 目标差分：多出来的瓷泥填暖色、还缺的填冷色，不必再对照一张小图。
  const diff=ctx.createImageData(SIZE,SIZE);
  for(let i=0;i<SIZE*SIZE;i++){const a=pixels[i]?1:0,b=target[i]?1:0;if(a===b)continue;const n=parseInt((a?tones().zhu:tones().qing1).slice(1),16),o=i*4;diff.data[o]=n>>16;diff.data[o+1]=(n>>8)&255;diff.data[o+2]=n&255;diff.data[o+3]=a?150:130;}
  const diffCanvas=document.createElement('canvas');diffCanvas.width=diffCanvas.height=SIZE;diffCanvas.getContext('2d').putImageData(diff,0,0);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(diffCanvas,0,0,w,h);ctx.restore();
  ctx.save();ctx.strokeStyle=tones().qing1;ctx.lineWidth=2.4;ctx.beginPath();let top=SIZE,bottom=0;
  const has=(x,y)=>x>=0&&x<SIZE&&y>=0&&y<SIZE&&target[y*SIZE+x];
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(has(x,y)){top=Math.min(top,y);bottom=Math.max(bottom,y+1);if(!has(x-1,y)){ctx.moveTo(x*sx,y*sy);ctx.lineTo(x*sx,(y+1)*sy);}if(!has(x+1,y)){ctx.moveTo((x+1)*sx,y*sy);ctx.lineTo((x+1)*sx,(y+1)*sy);}if(!has(x,y-1)){ctx.moveTo(x*sx,y*sy);ctx.lineTo((x+1)*sx,y*sy);}if(!has(x,y+1)){ctx.moveTo(x*sx,(y+1)*sy);ctx.lineTo((x+1)*sx,(y+1)*sy);}}
  ctx.stroke();ctx.strokeStyle='#315f9b70';ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);for(const y of [top,bottom]){ctx.moveTo(0,y*sy);ctx.lineTo(w,y*sy);}ctx.stroke();ctx.restore();
 }
 if(line){ctx.save();ctx.strokeStyle='#315fa980';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(line.from.x/SIZE*w,line.from.y/SIZE*h);ctx.lineTo(line.to.x/SIZE*w,line.to.y/SIZE*h);ctx.stroke();ctx.restore();}
 if(cursor){
  ctx.save();ctx.strokeStyle=cursor.tool==='cut'?tones().zhu:cursor.tool==='push'?(cursor.edge?tones().qing1:tones().qing1):cursor.color||tones().zhu;ctx.lineWidth=2;ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=3;
  const x=cursor.x/SIZE*w,y=cursor.y/SIZE*h;
  ctx.beginPath();ctx.arc(x,y,cursor.radius/SIZE*w,0,Math.PI*2);ctx.stroke();
  if(cursor.edge){const edge=cursor.edge,ex=edge.x/SIZE*w,ey=edge.y/SIZE*h;ctx.fillStyle=tones().qing1;ctx.beginPath();ctx.arc(ex,ey,5,0,Math.PI*2);ctx.fill();ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(x,y);ctx.stroke();ctx.setLineDash([]);ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText(edge.horizontal?'↔':'↕',x,y+8);}
  else {ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}
  ctx.restore();
 }
}
export function thumbnail(pixels,size=224,options={}){const c=document.createElement('canvas');c.width=c.height=size;drawSculpture(c,pixels,options);return c.toDataURL('image/png');}
export function loupeSample(x,y,w,h){
 const size=Math.min(w,h)/3;
 return {size,left:x-size/2,top:y-size/2};
}
export function attachEditor(canvas,challenge,{mode='cut',loupe=null,onChange=()=>{},onFinish=()=>{},onHint=()=>{},canInteract=()=>true}={}){
 const tool=mode;let color=2,radius=mode==='push'?18:mode==='paint'?5:4,dragging=false,last=null,origin=null,strokeBase=null,cursor=null,grab=null,pointerId=null,touchStroke=false;
 const options={guides:tool!=='paint',symmetric:true,protect:false,line:false,mirror:false};
 const pos=e=>{const {x,y,inside}=containedCanvasPoint(canvasPoint(canvas,e.clientX,e.clientY),SIZE,SIZE);return {x:Math.max(0,Math.min(SIZE,x)),y:Math.max(0,Math.min(SIZE,y)),inside};};
 const loupeCtx=loupe?.getContext('2d');
 function renderLoupe(){
  if(!loupeCtx)return;
  if(!touchStroke||!cursor){delete loupe.dataset.visible;return;}
  const {size,left,top}=loupeSample(cursor.x/SIZE*canvas.width,cursor.y/SIZE*canvas.height,canvas.width,canvas.height);
  loupeCtx.fillStyle=tones().paper0;loupeCtx.fillRect(0,0,loupe.width,loupe.height);
  loupeCtx.imageSmoothingEnabled=false;loupeCtx.drawImage(canvas,left,top,size,size,0,0,loupe.width,loupe.height);
  loupe.dataset.visible='';
 }
 function render(){drawSculpture(canvas,challenge.piece.pixels,{cursor,grid:true,target:options.guides?challenge.target:null,line:dragging&&options.line?{from:origin,to:last}:null});canvas.dataset.edits=String(challenge.edits);canvas.dataset.guides=String(options.guides);renderLoupe();}
 function apply(p){const from=tool==='push'||options.line?origin:last;if(challenge.stroke(from.x,from.y,p.x,p.y,radius,tool,color,(tool==='push'||options.line)?strokeBase:null,grab,options))onChange();last=p;}
 function hover(p){const edge=tool==='push'?(dragging?grab:clayEdge(challenge.piece.pixels,p.x,p.y,radius,5)):null;cursor={...p,radius,tool,edge,color:tool==='paint'?PALETTE[color]:null};if(tool==='push')onHint(edge?(edge.horizontal?'左右拖动，推拉这一侧的轮廓':'上下拖动，推拉这一段的轮廓'):'按住拖动，推开或收拢瓷泥');}
 canvas.addEventListener('pointerdown',e=>{if(!canInteract()||e.button!==0||!e.isPrimary||pointerId!==null)return;e.preventDefault();last=pos(e);if(!last.inside)return;grab=tool==='push'?clayEdge(challenge.piece.pixels,last.x,last.y,radius,5):null;pointerId=e.pointerId;touchStroke=e.pointerType==='touch';canvas.setPointerCapture(pointerId);dragging=true;origin={...last};strokeBase=challenge.piece.pixels.slice();challenge.beginStroke();if(tool!=='push')apply(last);hover(last);render();});
 canvas.addEventListener('pointermove',e=>{if(!canInteract()||(pointerId!==null&&e.pointerId!==pointerId))return;const p=pos(e);if(dragging)apply(p);if(p.inside||dragging)hover(p);else cursor=null;render();});
 const finish=event=>{if(pointerId===null||(event&&event.pointerId!==pointerId))return;const id=pointerId,hadStroke=dragging;pointerId=null;dragging=false;last=null;touchStroke=false;if(hadStroke)challenge.finishStroke();if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);if(hadStroke)onFinish();render();};
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);canvas.addEventListener('pointerleave',()=>{if(!dragging){cursor=null;render();}});
 render();return {render,setOption(name,value){finish();if(Object.hasOwn(options,name))options[name]=!!value;render();},setColor(value){finish();color=Number(value);},setRadius(value){finish();radius=Number(value);if(cursor)hover(cursor);render();},undo(){finish();challenge.undo();render();onFinish();},redo(){finish();challenge.redo();render();onFinish();},finish};
}
