import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {SCENES} from './campaign.js';

const canvases=new Map(), textures=new Map(), images=new Map(), glowCanvases=new Map(), glowTextures=new Map();
const TAU=Math.PI*2;
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
// Linglong porcelain: a pale glaze with petals that hold the light inside them.
function linglongMotifs(ctx,mode){
 const glow=mode==='glow';
 if(glow){ctx.fillStyle='#000';ctx.fillRect(0,0,1024,512);}
 else{
  const base=ctx.createLinearGradient(0,0,0,512);
  base.addColorStop(0,'#f8fbf5');base.addColorStop(.45,'#eaf1ea');base.addColorStop(1,'#dfe8e2');
  ctx.fillStyle=base;ctx.fillRect(0,0,1024,512);
  const sheen=ctx.createLinearGradient(0,0,1024,0);
  sheen.addColorStop(0,'#ffffff00');sheen.addColorStop(.32,'#ffffff36');sheen.addColorStop(.5,'#ffffff05');sheen.addColorStop(.7,'#ffffff2e');sheen.addColorStop(1,'#ffffff00');
  ctx.fillStyle=sheen;ctx.fillRect(0,0,1024,512);
 }
 const leaf=(x,y,angle,length,width,alpha)=>{
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  const g=ctx.createLinearGradient(0,-length,0,length*.2);
  if(glow){g.addColorStop(0,'#fff7dd');g.addColorStop(.45,'#ffe6ab');g.addColorStop(1,'#7a5a1e');}
  else{g.addColorStop(0,'#fffefa');g.addColorStop(.5,'#fdf7e4');g.addColorStop(1,'#e4ece6');}
  ctx.globalAlpha=alpha;ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(0,-length);ctx.bezierCurveTo(width,-length*.55,width*.72,length*.1,0,length*.34);ctx.bezierCurveTo(-width*.72,length*.1,-width,-length*.55,0,-length);ctx.fill();
  if(!glow){ctx.globalAlpha=alpha*.55;ctx.strokeStyle='#cfe0d9';ctx.lineWidth=1;ctx.stroke();}
  ctx.restore();
 };
 // Repeating sprays of rice-grain petals, the signature "rice pattern" of linglong ware.
 for(let row=0;row<3;row++)for(let col=-1;col<6;col++){
  const cx=col*218+(row%2)*109, cy=104+row*156;
  ctx.save();ctx.translate(cx,cy);
  for(let j=0;j<11;j++){
   const a=j/11*TAU+row*.42, r=30+((j*37)%13);
   leaf(Math.cos(a)*r,Math.sin(a)*r*.82,a+Math.PI/2,20+((j*17)%9),7.5,.92);
  }
  for(let j=0;j<4;j++){
   const a=j/4*TAU+.6;
   leaf(Math.cos(a)*13,Math.sin(a)*11,a+Math.PI/2,15,6,.85);
  }
  ctx.beginPath();ctx.arc(0,0,3.4,0,TAU);
  ctx.fillStyle=glow?'#fffbe8':'#fffdf6';ctx.globalAlpha=.95;ctx.fill();ctx.restore();
  // Drifting crescent petals between the sprays.
  for(let k=0;k<3;k++){
   const px=cx+70+noise(cx+row*31+k)*120, py=cy-58+noise(cy+k*17)*116;
   leaf(px,py,noise(px+py)*TAU,14+noise(k+cx)*10,6,.55);
  }
 }
 // Soft glowing horizon where the light pools at the foot of the bowl.
 const foot=ctx.createLinearGradient(0,392,0,512);
 if(glow){foot.addColorStop(0,'#000');foot.addColorStop(1,'#43310e');}
 else{foot.addColorStop(0,'#e6eee8');foot.addColorStop(1,'#c9d9d1');}
 ctx.fillStyle=foot;ctx.fillRect(0,392,1024,120);
 for(const y of [16,23,488,495]){ctx.fillStyle=glow?'#2b2109':'#c3d5cd';ctx.fillRect(0,y,1024,2);}
}
function glowCanvas(index){
 if(glowCanvases.has(index))return glowCanvases.get(index);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d');
 if(index===1)linglongMotifs(ctx,'glow');
 else{ctx.fillStyle='#000';ctx.fillRect(0,0,1024,512);}
 glowCanvases.set(index,canvas);return canvas;
}
function glowTexture(index){
 if(!glowTextures.has(index)){const t=new THREE.CanvasTexture(glowCanvas(index));t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=4;glowTextures.set(index,t);}
 return glowTextures.get(index);
}
function petal(ctx,x,y,angle,length,width,fill,stroke){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-width,-length*.4,-width*.8,-length*.9,0,-length);ctx.bezierCurveTo(width*.8,-length*.9,width,-length*.4,0,0);if(Array.isArray(fill)){const gradient=ctx.createLinearGradient(0,-length,0,0);fill.forEach((color,i)=>gradient.addColorStop(i/(fill.length-1),color));ctx.fillStyle=gradient;}else ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke();}ctx.restore();
}
function flower(ctx,x,y,r,blue=true){
 const petals=blue?12:16;
 for(let ring=0;ring<2;ring++)for(let j=0;j<petals;j++){
  const a=j/petals*TAU+ring*.23;
  const g=blue?['#607bad','#142f66']:['#ffffff','#e5efec'];
  petal(ctx,x,y,a,r*(ring?.64:1),r*(ring?.14:.22),g,blue?'#e5e7e0':'#cddddd');
  if(blue){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeStyle='#b1c0d1';ctx.lineWidth=.7;for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(k*1.2,-r*.22);ctx.quadraticCurveTo(k*2,-r*.6,k*.8,-r*.86);ctx.stroke();}ctx.restore();}
 }
 ctx.beginPath();ctx.arc(x,y,r*.17,0,TAU);ctx.fillStyle=blue?'#eef0e6':'#edf4ef';ctx.fill();ctx.strokeStyle=blue?'#244d83':'#cbdedc';ctx.stroke();
 if(blue)for(let j=0;j<7;j++){ctx.beginPath();ctx.arc(x+Math.cos(j)*r*.09,y+Math.sin(j)*r*.09,1.8,0,TAU);ctx.fillStyle='#234779';ctx.fill();}
}
export function decalCanvas(index){
 if(canvases.has(index))return canvases.get(index);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');
 const base=ctx.createLinearGradient(0,0,0,512);base.addColorStop(0,index===2?'#ffd969':index===3?'#fff0f3':'#faf8ed');base.addColorStop(1,index===2?'#2c1534':index===3?'#ecbdd1':'#e4e9e3');ctx.fillStyle=base;ctx.fillRect(0,0,1024,512);
 if(index===0){
  ctx.strokeStyle='#254a81';ctx.lineWidth=4;
  for(let tile=-1;tile<5;tile++){
   const x=tile*256;
   ctx.beginPath();ctx.moveTo(x,433);ctx.bezierCurveTo(x+176,390,x+23,315,x+120,254);ctx.bezierCurveTo(x+235,190,x+68,135,x+195,68);ctx.stroke();
   ctx.beginPath();ctx.moveTo(x+62,384);ctx.bezierCurveTo(x-33,294,x+77,224,x+8,143);ctx.stroke();
   for(let k=0;k<7;k++){const y=100+k*48,xx=x+130+Math.sin(k*1.6)*40;petal(ctx,xx,y,k%2?.9:-1,38,13,'#25497e','#193863');ctx.beginPath();ctx.moveTo(xx,y);ctx.quadraticCurveTo(xx+40,y+25,xx+25,y+40);ctx.stroke();}
   flower(ctx,x+67,209,62);flower(ctx,x+179,360,43);
  }
  for(const y of [19,27,54,60,453,459,484,492]){ctx.fillStyle='#203f70';ctx.fillRect(0,y,1024,y===54||y===453?4:2);}
  ctx.strokeStyle='#294b7c';ctx.lineWidth=2;
  for(let x=0;x<1024;x+=32)for(const y of [32,465]){ctx.strokeRect(x+3,y,26,14);ctx.strokeRect(x+9,y+4,14,6);}
 }else if(index===1){
  linglongMotifs(ctx,'glaze');
 }else if(index===2){
  const glaze=ctx.createLinearGradient(0,0,0,512);for(const [p,c] of [[0,'#fce083'],[.19,'#efaa21'],[.46,'#ed4b09'],[.69,'#b51629'],[.91,'#462237'],[1,'#272036']])glaze.addColorStop(p,c);ctx.fillStyle=glaze;ctx.fillRect(0,0,1024,512);
  for(let x=0;x<1024;x+=2){
   const length=135+180*(.5+.5*Math.sin(x/1024*TAU*4))+noise(x)*110;
   const g=ctx.createLinearGradient(0,15,0,length);g.addColorStop(0,'#ffd578bb');g.addColorStop(.5,'#ffc934bd');g.addColorStop(1,'#f7760500');ctx.strokeStyle=g;ctx.lineWidth=1+noise(x+23)*4;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x-8,length*.4,x+14,length*.8,x+4,length);ctx.stroke();
  }
  ctx.strokeStyle='#391c2826';ctx.lineWidth=.6;
  for(let y=0;y<512;y+=15)for(let x=0;x<1024;x+=19){const n=noise(x+y*1024);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8+n*7,y+8);ctx.lineTo(x+6,y+20);ctx.stroke();}
 }else{
  for(let row=0;row<3;row++)for(let col=-1;col<9;col++){
   const x=col*148+(row%2)*74,y=195+row*137;
   const g=['#fcedf3','#e6add0','#b870a4'];
   petal(ctx,x,y,.06*Math.sin(col),188,90,g,'#876b7a');
   ctx.strokeStyle='#a3679240';ctx.lineWidth=.8;
   for(let k=-4;k<=4;k++){ctx.beginPath();ctx.moveTo(x,y-9);ctx.quadraticCurveTo(x+k*10,y-78,x+k*9,y-149+Math.abs(k)*12);ctx.stroke();}
  }
  for(let x=0;x<1024;x+=56)petal(ctx,x,552,0,125,31,'#a7b885','#718061');
  for(let i=0;i<900;i++){const x=noise(i)*1024,y=475+noise(i+995)*37;ctx.fillStyle='#63794c50';ctx.fillRect(x,y,1.3,1.3);}
 }
 // Fine glaze grain is deterministic and remains subtle at game scale.
 for(let i=0;i<11000;i++){ctx.fillStyle=i%2?'#ffffff10':'#25334a07';ctx.fillRect(noise(i+11)*1024,noise(i+35000)*512,1,1);}
 canvases.set(index,canvas);return canvas;
}
export function decalImage(index){return decalCanvas(index).toDataURL('image/png');}
function decalTexture(index){
 if(!textures.has(index)){const t=new THREE.CanvasTexture(decalCanvas(index));t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=4;textures.set(index,t);}return textures.get(index);
}
export function bowlModel(index,decorated){
 const group=new THREE.Group();
 const outer=[];for(let i=0;i<=32;i++){const t=i/32;outer.push(new THREE.Vector2(.4+1.03*Math.sin(t*Math.PI/2),.16+t*1.06));}
 // Linglong (scene 2) is lit from within: the pattern itself carries the light.
 const linglong=index===1&&decorated;
 const material=linglong
  ?new THREE.MeshPhysicalMaterial({color:0xffffff,map:decalTexture(index),roughness:.14,metalness:.02,clearcoat:.7,clearcoatRoughness:.24,sheen:.7,sheenColor:new THREE.Color(0xfff3dc),emissive:0xffe2ad,emissiveIntensity:1.5,emissiveMap:glowTexture(index)})
  :new THREE.MeshStandardMaterial({color:0xffffff,map:decorated?decalTexture(index):null,roughness:.2,metalness:.04});
 group.add(new THREE.Mesh(new THREE.LatheGeometry(outer,96),material));
 const inner=[];for(let i=32;i>=0;i--){const t=i/32;inner.push(new THREE.Vector2(.37+1.00*Math.sin(t*Math.PI/2),.25+t*.97));}inner.push(new THREE.Vector2(0,.25));
 const white=new THREE.MeshStandardMaterial({color:0xfffbf1,roughness:.17,metalness:.02});
 group.add(new THREE.Mesh(new THREE.LatheGeometry(inner,96),white));
 const foot=new THREE.Mesh(new THREE.CylinderGeometry(.405,.43,.18,64),white);foot.position.y=.13;group.add(foot);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(1.4,.03,12,96),new THREE.MeshStandardMaterial({color:decorated?SCENES[index].accent:0xfffbef,roughness:.2}));rim.rotation.x=Math.PI/2;rim.position.y=1.22;group.add(rim);
 group.position.y=-.66;return group;
}
export function createBowlPreview(canvas,{index=0,decorated=false,onApply=null,animate=true}={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,.1,20);camera.position.set(0,1.35,5.0);camera.lookAt(0,.1,0);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xf7faff,0x92979b,.85));const light=new THREE.DirectionalLight(0xffffff,1.6);light.position.set(-3,5,4);scene.add(light);
 let bowl=bowlModel(index,decorated);scene.add(bowl);let raf=0,disposed=false,drag=null,rotation=-.32,last=0;
 const disposeModel=model=>{const materials=new Set();model.traverse(m=>{if(m.isMesh){m.geometry.dispose();materials.add(m.material);}});materials.forEach(m=>m.dispose());};
 const resize=()=>{const r=canvas.getBoundingClientRect();const w=Math.max(1,r.width||640),h=Math.max(1,r.height||400);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 function render(ms=0){if(disposed)return;const dt=Math.min(.05,(ms-last)/1000);last=ms;if(!drag)rotation+=dt*.16;bowl.rotation.y=rotation;renderer.render(scene,camera);if(animate)raf=requestAnimationFrame(render);}
 const down=e=>{drag={start:e.clientX,last:e.clientX,moved:false};canvas.setPointerCapture(e.pointerId);};
 const move=e=>{if(!drag)return;rotation+=(e.clientX-drag.last)*.012;drag.last=e.clientX;if(Math.abs(e.clientX-drag.start)>7)drag.moved=true;};
 const up=()=>{const click=drag&&!drag.moved;drag=null;if(click)onApply?.();};
 const cancel=()=>{drag=null;};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);
 render();
 return {decorate(){scene.remove(bowl);disposeModel(bowl);bowl=bowlModel(index,true);scene.add(bowl);renderer.render(scene,camera);},snapshot(){renderer.render(scene,camera);return canvas.toDataURL('image/png');},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();for(const [event,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel]])canvas.removeEventListener(event,fn);disposeModel(bowl);environment.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
export function bowlImage(index){
 if(images.has(index))return images.get(index);
 const canvas=document.createElement('canvas');const preview=createBowlPreview(canvas,{index,decorated:true,animate:false});const url=preview.snapshot();preview.dispose();images.set(index,url);return url;
}
