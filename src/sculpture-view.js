import {SIZE,PALETTE,clayEdge} from './sculpture.js';
function layer(pixels,flatColor){const c=document.createElement('canvas');c.width=c.height=SIZE;const ctx=c.getContext('2d'),img=ctx.createImageData(SIZE,SIZE);for(let i=0;i<pixels.length;i++){if(!pixels[i])continue;const color=flatColor||PALETTE[pixels[i]],n=parseInt(color.slice(1),16);img.data[i*4]=n>>16;img.data[i*4+1]=(n>>8)&255;img.data[i*4+2]=n&255;img.data[i*4+3]=255;}ctx.putImageData(img,0,0);return c;}
export function drawSculpture(canvas,pixels,{cursor=null,grid=false}={}){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#eee5d1');bg.addColorStop(1,'#e4d8bc');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 if(grid){ctx.strokeStyle='#aa977315';ctx.lineWidth=1;for(let i=0;i<=16;i++){const p=i*w/16;ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,h);ctx.moveTo(0,p);ctx.lineTo(w,p);ctx.stroke();}}
 ctx.imageSmoothingEnabled=false;
 const depth=layer(pixels,'#b6b2a6');ctx.save();ctx.shadowColor='#75603d35';ctx.shadowBlur=w*.03;ctx.shadowOffsetY=w*.018;ctx.drawImage(depth,w*.009,w*.013,w,h);ctx.restore();ctx.drawImage(layer(pixels),0,0,w,h);
 if(cursor){
  ctx.save();ctx.strokeStyle=cursor.tool==='cut'?'#fff7d8':cursor.tool==='push'?(cursor.edge?'#4b735b':'#a47d64'):'#fff8e6';ctx.lineWidth=2;ctx.shadowColor='#44321f80';ctx.shadowBlur=3;
  const x=cursor.x/SIZE*w,y=cursor.y/SIZE*h;
  ctx.beginPath();ctx.arc(x,y,cursor.radius/SIZE*w,0,Math.PI*2);ctx.stroke();
  if(cursor.edge){const edge=cursor.edge,ex=edge.x/SIZE*w,ey=edge.y/SIZE*h;ctx.fillStyle='#4b735b';ctx.beginPath();ctx.arc(ex,ey,5,0,Math.PI*2);ctx.fill();ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(x,y);ctx.stroke();ctx.setLineDash([]);ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText(edge.horizontal?'↔':'↕',x,y+8);}
  else {ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}
  ctx.restore();
 }
}
export function thumbnail(pixels,size=224){const c=document.createElement('canvas');c.width=c.height=size;drawSculpture(c,pixels);return c.toDataURL('image/png');}
export function attachEditor(canvas,challenge,{mode='cut',onChange=()=>{},onFinish=()=>{},onHint=()=>{}}={}){
 const tool=mode;let color=2,radius=mode==='push'?18:mode==='paint'?5:4,dragging=false,last=null,origin=null,strokeBase=null,cursor=null,grab=null,pointerId=null;
 const pos=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*SIZE,y:(e.clientY-r.top)/r.height*SIZE};};
 function render(){drawSculpture(canvas,challenge.piece.pixels,{cursor,grid:true});canvas.dataset.edits=String(challenge.edits);}
 function apply(p){const from=tool==='push'?origin:last;if(challenge.stroke(from.x,from.y,p.x,p.y,radius,tool,color,tool==='push'?strokeBase:null,grab))onChange();last=p;}
 function hover(p){const edge=tool==='push'?(dragging?grab:clayEdge(challenge.piece.pixels,p.x,p.y,radius)):null;cursor={...p,radius,tool,edge};if(tool==='push')onHint(edge?(edge.horizontal?'沿水平方向推压或拉伸':'沿竖直方向推压或拉伸'):'请将手掌移到瓷泥边缘');}
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary||dragging)return;e.preventDefault();last=pos(e);grab=tool==='push'?clayEdge(challenge.piece.pixels,last.x,last.y,radius):null;if(tool==='push'&&!grab){hover(last);render();return;}pointerId=e.pointerId;canvas.setPointerCapture(pointerId);dragging=true;origin={...last};strokeBase=challenge.piece.pixels.slice();challenge.beginStroke();if(tool!=='push')apply(last);hover(last);render();});
 canvas.addEventListener('pointermove',e=>{if(dragging&&e.pointerId!==pointerId)return;const p=pos(e);if(dragging)apply(p);hover(p);render();});
 const finish=()=>{if(!dragging)return;dragging=false;last=null;challenge.finishStroke();if(canvas.hasPointerCapture(pointerId))canvas.releasePointerCapture(pointerId);pointerId=null;onFinish();render();};
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);canvas.addEventListener('pointerleave',()=>{if(!dragging){cursor=null;render();}});
 render();return {render,setColor(value){finish();color=Number(value);},setRadius(value){finish();radius=Number(value);if(cursor)hover(cursor);render();},undo(){finish();challenge.undo();render();onFinish();},redo(){finish();challenge.redo();render();onFinish();},finish};
}
