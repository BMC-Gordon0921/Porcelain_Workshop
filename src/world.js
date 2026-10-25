import * as THREE from 'three';
import {PLACES} from './places.js';
import {loadSceneEnvironment} from './scene-environment.js';
import {createWorkbenchModel} from './workbench-model.js';
import {SCENES} from './campaign.js';
import {decalCanvas} from './decals.js';
import { DESIGNS } from './sculpture.js';
import {reliefSculpture} from './relief-model.js';
export {reliefSculpture} from './relief-model.js';
import {createKilnModel} from './kiln-view.js';
import {createParticleField} from './particles.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const PI = Math.PI;
const mats = new Map();
function mat(color, roughness=0.85) { const k=String(color)+roughness; if(!mats.has(k)) mats.set(k,new THREE.MeshStandardMaterial({color,roughness})); return mats.get(k); }
const rounded = new RoundedBoxGeometry(1,1,1,2,.075);
const sphereGeo = new THREE.SphereGeometry(1,16,12);
const leafGeo = new THREE.SphereGeometry(1,10,7);
function mesh(geo,color,parent,x=0,y=0,z=0) { const m=new THREE.Mesh(geo,typeof color==='object'?color:mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
function box(parent,x,y,z,w,h,d,color,r=true) {const m=mesh(r?rounded:new THREE.BoxGeometry(1,1,1),color,parent,x,y,z);m.scale.set(w,h,d);return m;}
function ball(parent,x,y,z,rx,ry,rz,color) {const m=mesh(sphereGeo,color,parent,x,y,z);m.scale.set(rx,ry,rz);return m;}
function cyl(parent,x,y,z,rt,rb,h,color,segments=24) {return mesh(new THREE.CylinderGeometry(rt,rb,h,segments),color,parent,x,y,z);}
function torus(parent,x,y,z,r,t,color) {const m=mesh(new THREE.TorusGeometry(r,t,8,28),color,parent,x,y,z);m.rotation.x=PI/2;return m;}
function group(parent,x=0,y=0,z=0) {let g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
function shadow(parent,x,z,rx,rz,opacity=.14) {const m=mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0x3d3926,transparent:true,opacity,depthWrite:false}),parent,x,.075,z);m.rotation.x=-PI/2;m.scale.set(rx,rz,1);m.castShadow=false;return m;}
export const STATIONS = [
 {id:'clay',name:'取泥与订单',x:-5.65,z:-3.65,w:2.1,d:1.45,approach:[-5.65,-2.05],labelY:2.0},
 {id:'wheel',name:'粗塑成形',x:-2.7,z:-3.65,w:1.8,d:1.6,approach:[-2.7,-1.95],labelY:2.05},
 {id:'carve',name:'细节雕刻',x:.4,z:-3.65,w:2.35,d:1.45,approach:[.4,-2.05],labelY:2.0},
 {id:'paint',name:'手绘上色',x:-1.25,z:1.35,w:2.4,d:1.45,approach:[-1.25,2.95],labelY:1.9},
 {id:'kiln',name:'瓷器窑炉',x:-5.65,z:.3,w:2.2,d:2.1,approach:[-3.95,.3],labelY:2.7},
 {id:'serve',name:'评分与交付',x:3.2,z:.0,w:1.25,d:3.1,approach:[1.7,0],labelY:2.05}
];
export function sculpture(type,stage='finished') {
 const g=new THREE.Group(), clay=0xf2efe5, cream=stage==='finished'?0x315fa9:0xe1ded2;
 if(stage==='raw'){ball(g,0,.34,0,.42,.33,.4,clay);ball(g,.16,.55,.03,.23,.21,.26,clay);return g;}
 if(type==='vase'){
  const pts=[[0,0],[.31,0],[.41,.08],[.47,.32],[.42,.55],[.26,.77],[.21,.95],[.21,1.07],[.16,1.07],[.16,.9],[.2,.79],[.35,.5],[.37,.26],[.3,.13],[0,.13]].map(p=>new THREE.Vector2(...p));
  mesh(new THREE.LatheGeometry(pts,32),clay,g);torus(g,0,1.07,0,.185,.025,0x315fa9);
  if(stage==='finished'){torus(g,0,.3,0,.466,.021,cream);torus(g,0,.44,0,.455,.025,cream);torus(g,0,.91,0,.217,.018,cream);}
 } else if(type==='fox'){
  ball(g,0,.4,0,.31,.42,.28,clay);ball(g,0,.94,.02,.39,.32,.3,clay);
  const ear1=mesh(new THREE.ConeGeometry(.17,.42,4),clay,g,-.26,1.24,0);ear1.rotation.z=.1;const ear2=ear1.clone();ear2.position.x=.26;ear2.rotation.z=-.1;g.add(ear2);
  ball(g,0,.82,.27,.24,.15,.1,cream);ball(g,0,.91,.36,.055,.038,.038,0x674534);
  ball(g,-.16,1,.283,.026,.035,.02,0x49392d);ball(g,.16,1,.283,.026,.035,.02,0x49392d);
  ball(g,0,.46,.257,.18,.25,.03,cream);ball(g,-.19,.1,.18,.14,.09,.2,clay);ball(g,.19,.1,.18,.14,.09,.2,clay);
  let tail=ball(g,.38,.27,-.11,.2,.37,.17,clay);tail.rotation.z=-.7;ball(g,.52,.52,-.12,.16,.2,.15,cream);
 } else {
  box(g,-.14,.15,0,.23,.3,.3,0x925b40);box(g,.14,.15,0,.23,.3,.3,0x925b40);
  cyl(g,0,.57,0,.27,.38,.68,clay,12);ball(g,0,1.11,0,.26,.28,.24,clay);cyl(g,0,1.29,0,.27,.29,.14,0x895339);ball(g,0,1.44,0,.095,.1,.095,0x885237);
  box(g,-.38,.65,0,.17,.53,.2,clay).rotation.z=-.25;box(g,.38,.65,0,.17,.53,.2,clay).rotation.z=.25;
  for(let i=0;i<4;i++)box(g,0,.37+i*.115,.3,.55,.025,.032,cream);
  for(let i=0;i<4;i++)box(g,-.2+i*.135,.57,.315,.025,.43,.025,cream);
  ball(g,-.09,1.12,.228,.025,.024,.015,0x543b2b);ball(g,.09,1.12,.228,.025,.024,.015,0x543b2b);box(g,0,1.01,.24,.11,.026,.02,0x765136);torus(g,0,.29,0,.36,.03,0x815136);
 }
 return g;
}


function animal(parent,type,x,z,coat=0x769078,chef=false) {
 const g=group(parent,x,0,z), body=group(g);const fur=type==='fox'?0xd2864a:type==='rabbit'?0xe5d8c0:type==='bear'?0x9c7757:0xbba28a;
 const dark=0x4d3d2d, cream=0xf3e2bd;
 shadow(g,0,0,.52,.38,.17);
 const feet=[ball(body,-.21,.15,.1,.2,.15,.27,dark),ball(body,.21,.15,.1,.2,.15,.27,dark)];
 ball(body,0,.66,0,.47,.56,.35,fur);ball(body,0,.61,.09,.435,.45,.325,coat);
 if(chef){box(body,0,.72,.378,.43,.64,.06,0xe4ddbd);box(body,0,.58,.416,.29,.19,.035,0xc8bb98);box(body,0,1.01,.375,.4,.08,.08,0x769381);}
 const arms=[ball(body,-.49,.73,.04,.16,.32,.16,fur),ball(body,.49,.73,.04,.16,.32,.16,fur)];arms[0].rotation.z=-.25;arms[1].rotation.z=.25;
 const head=group(body,0,1.32,0);
 ball(head,0,0,0,.56,.49,.43,fur);
 const ears=[];
 if(type==='fox'||type==='cat') {
  for(const sign of [-1,1]){
   const ear=mesh(new THREE.ConeGeometry(.215,.56,4),fur,head,sign*.37,.43,-.045);ear.rotation.z=sign*-.12;ear.userData.baseZ=ear.rotation.z;
   const inner=mesh(new THREE.ConeGeometry(.124,.34,3),type==='fox'?0x6e4b34:0xd9ab98,head,sign*.37,.44,.075);inner.rotation.z=sign*-.12;inner.userData.baseZ=inner.rotation.z;
   ears.push(ear,inner);
  }
 } else if(type==='rabbit'){
  for(const sign of [-1,1]) {const ear=ball(head,sign*.25,.65,-.02,.155,.48,.14,fur);const inner=ball(head,sign*.25,.68,.09,.08,.33,.025,0xd9a899);ear.userData.baseZ=0;inner.userData.baseZ=0;ears.push(ear,inner);}
 } else {const earL=ball(head,-.4,.33,-.03,.21,.22,.14,fur),earR=ball(head,.4,.33,-.03,.21,.22,.14,fur);ball(head,-.4,.35,.08,.11,.13,.045,0xc39a78);ball(head,.4,.35,.08,.11,.13,.045,0xc39a78);earL.userData.baseZ=0;earR.userData.baseZ=0;ears.push(earL,earR);}
 let tail=null;
 if(type==='fox'){
  ball(head,-.235,-.17,.325,.29,.23,.16,cream).rotation.z=.3;ball(head,.235,-.17,.325,.29,.23,.16,cream).rotation.z=-.3;ball(head,0,-.18,.47,.18,.13,.15,cream);
  tail=group(body,0,.48,-.29);tail.rotation.x=-.75;ball(tail,0,.25,-.14,.23,.42,.22,fur);ball(tail,0,.57,-.13,.21,.21,.2,cream);
 } else {ball(head,0,-.17,.385,.28,.2,.11,type==='cat'?0xede0c3:0xe0c6a2);if(type==='cat'){tail=group(body,0,.5,-.28);tail.rotation.x=-.95;ball(tail,0,.28,-.12,.12,.42,.12,fur);ball(tail,0,.58,-.12,.1,.1,.1,cream);}}
 ball(head,0,-.11,type==='fox'?.59:.487,.073,.052,.048,dark);
 const eyes=[];
 for(const sign of [-1,1]) {const eye=ball(head,sign*.215,.025,.389,.044,.066,.032,dark),shine=ball(head,sign*.204,.044,.414,.013,.018,.009,0xffffff);eye.userData.baseY=eye.scale.y;shine.userData.baseY=shine.scale.y;eyes.push(eye,shine);ball(head,sign*.343,-.1,.369,.075,.035,.018,0xd59977);}
 const mouth=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.06,-.22,.49),new THREE.Vector3(0,-.25,.5),new THREE.Vector3(.06,-.22,.49)]),new THREE.LineBasicMaterial({color:0x805d45}));head.add(mouth);
 if(chef){const cap=group(head,0,.49,-.09);ball(cap,0,0,0,.3,.14,.24,0x718777);cyl(cap,0,.085,0,.048,.055,.12,0x566c59,12);box(cap,.05,-.045,.21,.37,.035,.16,0x6b816f);const scarf=box(body,0,1.03,.32,.3,.12,.14,0xdab46b);scarf.rotation.z=.12;}
 return {group:g,body,head,feet,arms,eyes,ears,tail};
}
function humanSculptor(parent,x,z){
 const g=group(parent,x,0,z),body=group(g),skin=0xdca37e,hair=0x674837,shirt=0x819685;
 g.userData.character='human';shadow(g,0,0,.5,.38,.17);
 const feet=[ball(body,-.2,.15,.1,.18,.14,.27,0x645444),ball(body,.2,.15,.1,.18,.14,.27,0x645444)];
 box(body,-.18,.36,0,.23,.4,.29,0x646e62);box(body,.18,.36,0,.23,.4,.29,0x646e62);
 ball(body,0,.77,0,.42,.46,.32,shirt);cyl(body,0,1.18,0,.13,.15,.24,skin,16);
 box(body,0,.76,.32,.45,.67,.055,0xe7d9b4);box(body,0,.64,.36,.31,.21,.035,0xcbb793);
 for(const x of [-.17,.17])box(body,x,1.08,.30,.06,.3,.045,0xe7d9b4);
 const arms=[group(body,-.47,.96,0),group(body,.47,.96,0)];
 arms.forEach((a,i)=>{ball(a,0,-.12,0,.14,.24,.15,shirt);ball(a,0,-.37,.035,.12,.14,.135,skin);ball(a,i===0?.07:-.07,-.33,.13,.065,.085,.065,skin);a.rotation.z=i===0?-.13:.13;});
 const head=group(body,0,1.57,0);ball(head,0,0,0,.415,.43,.35,skin);
 for(const sign of [-1,1]){ball(head,sign*.435,-.015,0,.09,.13,.08,skin);ball(head,sign*.166,.018,.326,.034,.052,.025,0x3e382e);ball(head,sign*.159,.035,.346,.011,.014,.008,0xffffff);ball(head,sign*.29,-.11,.288,.068,.025,.018,0xcf8d77);}
 ball(head,0,-.074,.365,.07,.065,.065,0xd79972);
 const smile=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.065,-.18,.323),new THREE.Vector3(0,-.2,.336),new THREE.Vector3(.065,-.18,.323)]),new THREE.LineBasicMaterial({color:0x855641}));head.add(smile);
 ball(head,0,.24,-.067,.449,.255,.33,hair);for(let i=0;i<4;i++){const lock=ball(head,-.28+i*.155,.245+(i%2)*.055,.23,.14,.135,.09,hair);lock.rotation.z=-.24;}
 ball(head,0,.44,-.045,.39,.12,.29,0x627e70);cyl(head,0,.545,-.055,.042,.047,.09,0x496454,12);box(head,.06,.418,.235,.35,.042,.14,0x557260);
 box(body,0,1.18,.27,.22,.11,.13,0xcba668).rotation.z=.18;
 box(body,0,.71,.35,.3,.2,.055,0xb9aa82);for(const x of [-.13,.13])ball(body,x,.78,.39,.019,.019,.012,0x85765b);
 const seam=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.16,.86,.386),new THREE.Vector3(-.16,.61,.386),new THREE.Vector3(.16,.61,.386),new THREE.Vector3(.16,.86,.386)]),new THREE.LineBasicMaterial({color:0xe4d7b5}));body.add(seam);
 return {group:g,body,head,feet,arms};
}
function frond(parent,yaw,droop,length,color){const sprig=group(parent,0,.5,0);sprig.rotation.order='YXZ';sprig.rotation.y=yaw;sprig.rotation.z=droop;cyl(sprig,0,length*.42,0,.012,.018,length*.84,0x3d6840,5);const blade=mesh(leafGeo,color,sprig,0,length*.86,0);blade.scale.set(length*.32,length*.07,length*.62);blade.rotation.x=.65;const side=mesh(leafGeo,color,sprig,length*.16,length*.7,.04);side.scale.set(length*.16,length*.045,length*.34);side.rotation.z=-.8;side.rotation.y=.5;return sprig;}
function bloom(parent,x,y,z,color){for(let i=0;i<5;i++)ball(parent,x+Math.cos(i*1.26)*.055,y+Math.sin(i)*.01,z+Math.sin(i*1.26)*.055,.04,.025,.04,color);ball(parent,x,y,z,.028,.028,.028,0xf0d15a);}
function plant(parent,x,y,z,scale=1){
 const g=group(parent,x,y,z);g.scale.setScalar(scale);
 cyl(g,0,.16,0,.2,.16,.28,0xb87455);cyl(g,0,.34,0,.27,.22,.12,0xd29a72);torus(g,0,.4,0,.26,.028,0xe6bc96);cyl(g,0,.05,0,.18,.2,.08,0x9a6848);cyl(g,0,.42,0,.18,.18,.025,0x4a3a2c);
 const kind=Math.abs((Math.round(x*7)+Math.round(z*5))%3),greens=[0x3f6b3c,0x5d8a49,0x87a85c,0x2f5534];
 const count=kind===1?9:7;
 for(let i=0;i<count;i++){const yaw=i/count*PI*2+(kind*.4);const droop=kind===1?.28+(i%3)*.16:.62+(i%4)*.16;const length=kind===1?.78:.58+(i%3)*.16;frond(g,yaw,droop,length,greens[(i+kind)%greens.length]);}
 if(kind===2){bloom(g,.05,.95,.02,0xf2b7c4);bloom(g,-.16,.82,.1,0xf7f3ea);bloom(g,.18,.74,-.08,0xe7a0b4);}
 else if(kind===0)bloom(g,0,.88,0,0xf4efe0);
 return g;
}
function shrub(parent,x,z,scale=1){const g=group(parent,x,0,z);g.scale.setScalar(scale);cyl(g,0,.06,0,.03,.045,.12,0x5b4636,5);for(let i=0;i<8;i++){const a=i/8*PI*2,clump=mesh(leafGeo,[0x3e693c,0x5c8748,0x86a85c,0x2f5a36][i%4],g,Math.sin(a)*.16,.22+(i%3)*.07,Math.cos(a)*.14);clump.scale.set(.2,.14,.18);}return g;}
function brickTile(){const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#d9c7ae';ctx.fillRect(0,0,128,64);const cols=[[196,122,86],[176,104,72],[188,132,98],[164,96,70]];for(let row=0;row<2;row++){const offset=row?32:0;for(let col=-1;col<3;col++){const [r,g,b]=cols[(row+col+2)%cols.length];ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillRect(col*64+offset+2,row*32+2,60,28);ctx.fillStyle='rgba(255,236,214,.22)';ctx.fillRect(col*64+offset+2,row*32+2,60,3);}}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;return tex;}
function brickWall(parent,x,y,z,w,h,d){const tex=brickTile();tex.repeat.set(Math.max(w,d)/.96,h/.36);const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({map:tex,roughness:.94}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function bench(parent,x,z,w=2.2,d=1.5) {const g=group(parent,x,0,z);shadow(g,0,0,w*.46,d*.42,.08);for(let a of [-1,1])for(let b of [-1,1])box(g,a*(w/2-.15),.56,b*(d/2-.13),.17,1.08,.17,0x836445);box(g,0,.45,0,w-.16,.12,d-.12,0xb08a5b);box(g,0,1.1,0,w,.23,d,0xb99766);box(g,0,1.24,0,w+.06,.11,d+.05,0xd9b984);for(const sx of [-1,1]){box(g,sx*w*.17,1.297,0,.012,.004,d-.08,0xc8a771,false);for(const sz of [-1,1])box(g,sx*(w/2-.15),.13,sz*(d/2-.13),.18,.12,.18,0x7d806a);}return g;}
function textSign(parent,text,x,y,z,w=2.5,h=.6,color='#f6e8c7',bg='#556d56') {
 const c=document.createElement('canvas');c.width=768;c.height=200;let ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.font='bold 64px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,384,110);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:1}),parent,x,y,z);return m;
}
function workshopSign(parent,text,accent='#8aa78d'){
 const g=group(parent,.25,1.34,-5.3);g.name='workshop-sign';
 for(const s of [-1,1])box(g,s*1.88,-.55,0,.13,1.42,.13,0x6a4b2f,false);
 box(g,0,0,0,3.98,.94,.14,0x46311f);
 const c=document.createElement('canvas');c.width=1024;c.height=240;const ctx=c.getContext('2d');
 const grad=ctx.createLinearGradient(0,0,0,240);grad.addColorStop(0,'#40503f');grad.addColorStop(.55,'#2c3a30');grad.addColorStop(1,'#1f2a22');
 ctx.fillStyle=grad;ctx.fillRect(0,0,1024,240);
 ctx.strokeStyle=accent;ctx.lineWidth=6;ctx.strokeRect(24,24,976,192);ctx.globalAlpha=.36;ctx.lineWidth=2;ctx.strokeRect(38,38,948,164);ctx.globalAlpha=1;
 for(const [x,y] of [[24,24],[1000,24],[24,216],[1000,216]]){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle=accent;ctx.fillRect(-9,-9,18,18);ctx.restore();}
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#fdf3d6';ctx.font='700 104px "Songti SC","Noto Serif SC","STSong",Georgia,serif';
 ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=18;ctx.shadowOffsetY=5;ctx.fillText(text,512,108);
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle=accent;ctx.font='600 24px Georgia';ctx.fillText('T E R R A   ·   C L A Y   S T U D I O',512,190);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 mesh(new THREE.PlaneGeometry(3.68,.9),new THREE.MeshStandardMaterial({map:texture,roughness:.7}),g,0,0,.078);
 box(g,0,.57,.02,4.2,.09,.34,0x774b2d);box(g,0,.64,.05,3.96,.05,.28,0x9a613c);
 for(let i=0;i<8;i++)box(g,-1.7+i*.49,.68,.06,.32,.035,.3,0xb2764c,false);
 for(const s of [-1,1]){box(g,s*1.95,.07,0,.1,.78,.16,0x68482c,false);box(g,s*1.62,-.42,.04,.05,.32,.05,0x34251a,false);
  ball(g,s*1.62,-.27,.04,.1,.13,.1,0x2b1d15);
  mesh(new THREE.SphereGeometry(.105,16,12),new THREE.MeshStandardMaterial({color:0xffd7a2,emissive:0xff9a44,emissiveIntensity:1.15,transparent:true,opacity:.95}),g,s*1.62,-.43,.04);
  box(g,s*1.62,-.56,.04,.15,.028,.028,0xc9a04a,false);
 }
 const lamp=new THREE.PointLight(0xffb15f,.6,3.4);lamp.position.set(0,.3,.55);g.add(lamp);
 return g;
}
export function createWorld(canvas,{preview=false}={}) {
 let disposed=false;const removers=[];
 const listen=(target,event,fn,options)=>{if(preview)return;target.addEventListener(event,fn,options);removers.push(()=>target.removeEventListener(event,fn,options));};
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,preview?1.5:2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const scene=new THREE.Scene();
 /* Orbit camera. Dragging with the left button turns the workshop; the polar
    angle is clamped so the eye can rise overhead but never sink below the floor. */
 const TARGET=preview?new THREE.Vector3(0,1,-2):new THREE.Vector3(-.2,.7,-.7);
 const HOME_OFFSET=new THREE.Vector3(10,17,20).sub(TARGET);
 const orbit={azimuth:Math.atan2(HOME_OFFSET.x,HOME_OFFSET.z),polar:Math.acos(HOME_OFFSET.y/HOME_OFFSET.length()),radius:HOME_OFFSET.length(),zoom:1};
 let cameraTween=null;
 const POLAR_MIN=THREE.MathUtils.degToRad(24),POLAR_MAX=Math.PI/2,ZOOM_MIN=.62,ZOOM_MAX=2.6;
 const camera=new THREE.OrthographicCamera(-10,10,7,-7,.1,140);
 function placeCamera(){const s=Math.sin(orbit.polar),c=Math.cos(orbit.polar);camera.position.set(TARGET.x+orbit.radius*s*Math.sin(orbit.azimuth),TARGET.y+orbit.radius*c,TARGET.z+orbit.radius*s*Math.cos(orbit.azimuth));camera.lookAt(TARGET);camera.zoom=orbit.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
 placeCamera();
 let orbitDrag=null,interactionEnabled=false;
 const stopTween=()=>{cameraTween=null;};
 const onOrbitDown=e=>{if(!interactionEnabled||e.button!==0||!e.isPrimary)return;e.preventDefault();stopTween();orbitDrag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.classList.add('is-orbiting');canvas.setPointerCapture?.(e.pointerId);};
 const onOrbitMove=e=>{if(!interactionEnabled||!orbitDrag||e.pointerId!==orbitDrag.id)return;if(!(e.buttons&1)){onOrbitUp(e);return;}const dx=e.clientX-orbitDrag.x,dy=e.clientY-orbitDrag.y;orbitDrag.x=e.clientX;orbitDrag.y=e.clientY;orbit.azimuth-=dx*.0062;orbit.polar=THREE.MathUtils.clamp(orbit.polar+dy*.005,POLAR_MIN,POLAR_MAX);placeCamera();};
 const onOrbitUp=()=>{if(!orbitDrag)return;const id=orbitDrag.id;orbitDrag=null;canvas.classList.remove('is-orbiting');if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);};
 const onOrbitWheel=e=>{if(!interactionEnabled)return;e.preventDefault();stopTween();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);orbit.zoom=THREE.MathUtils.clamp(orbit.zoom*Math.exp(-delta*.0012),ZOOM_MIN,ZOOM_MAX);placeCamera();};
 listen(canvas,'pointerdown',onOrbitDown);listen(window,'pointermove',onOrbitMove);listen(window,'pointerup',onOrbitUp);listen(window,'pointercancel',onOrbitUp);
 listen(canvas,'wheel',onOrbitWheel,{passive:false});listen(canvas,'lostpointercapture',onOrbitUp);listen(window,'blur',onOrbitUp);listen(document,'visibilitychange',()=>{if(document.hidden)onOrbitUp();});
 function setInteractionEnabled(value){interactionEnabled=!!value;if(!interactionEnabled)onOrbitUp();}
 function resetView(){
  const toAz=Math.atan2(HOME_OFFSET.x,HOME_OFFSET.z),toPolar=Math.acos(HOME_OFFSET.y/HOME_OFFSET.length());
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){orbit.azimuth=toAz;orbit.polar=toPolar;orbit.zoom=1;placeCamera();return;}
  const delta=THREE.MathUtils.euclideanModulo(toAz-orbit.azimuth+Math.PI,Math.PI*2)-Math.PI;
  cameraTween={fromAz:orbit.azimuth,fromPolar:orbit.polar,fromZoom:orbit.zoom,toAz:orbit.azimuth+delta,toPolar,toZoom:1,start:performance.now(),duration:650};
 }
 scene.add(new THREE.HemisphereLight(0xfff6dc,0xa7aa90,2.1));const sun=new THREE.DirectionalLight(0xffe3b3,3.4);sun.position.set(-3,14,7);sun.castShadow=true;sun.shadow.mapSize.set(preview?1024:2048,preview?1024:2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.1,far:45});sun.shadow.normalBias=.045;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);const fill=new THREE.DirectionalLight(0xd3e6df,1.2);fill.position.set(8,7,-5);scene.add(fill);
 const root=group(scene);
 root.position.y=.09;
 const benchModels=Object.fromEntries(STATIONS.map(station=>{
  const model=createWorkbenchModel({id:station.id});model.group.position.set(station.x,0,station.z);root.add(model.group);return [station.id,model];
 }));
 const kilnModel=benchModels.kiln;
 const player=humanSculptor(root,-4.55,-2.15);player.group.rotation.y=-.2;
 const demoTool=group(player.arms[1],0,-.35,.16);demoTool.visible=false;
 box(demoTool,0,-.13,0,.045,.45,.045,0x805936);const demoTip=box(demoTool,0,-.4,0,.065,.12,.065,0x315fa9);
 let customers=[animal(root,'rabbit',4.9,-.25,0xb996a0),animal(root,'bear',4.95,1.65,0xbc9d5e),animal(root,'cat',4.98,3.35,0x92a292)];customers.forEach((c,i)=>{c.id=i+1;c.group.rotation.y=-PI/2;c.group.scale.setScalar(.85)});let lastOrders='1,2,3';const departing=[];
 const marker=mesh(new THREE.RingGeometry(.47,.56,40),new THREE.MeshBasicMaterial({color:0xf7dfa2,transparent:true,opacity:.83,side:THREE.DoubleSide,depthWrite:false}),root,0,.085,0);marker.rotation.x=-PI/2;
 const playerRing=mesh(new THREE.RingGeometry(.5,.54,36),new THREE.MeshBasicMaterial({color:0xffffdf,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}),root,0,.09,0);playerRing.rotation.x=-PI/2;
 const dust=[];for(let i=0;i<24;i++){const m=mesh(new THREE.SphereGeometry(.018,5,5),new THREE.MeshBasicMaterial({color:0xffefb6,transparent:true,opacity:.36}),root,(Math.sin(i*53)*.5+.5)*14-7,1+(i%6)*.45,Math.cos(i*7)*4);m.castShadow=false;dust.push(m);}
 // Chimney smoke starts above the roof cap; the kiln only sparks while it is firing.
const smokeField=createParticleField({count:160,color:0xd6d0c3,color2:0xf8f3e8,size:26,rise:3.6,spread:.48,opacity:.36,blending:THREE.NormalBlending,radius:.13,height:.08,startActive:0,fadeIn:.035});
smokeField.points.name='chimney-smoke';smokeField.points.visible=false;root.add(smokeField.points);
const emberField=createParticleField({count:90,color:0xff6b1f,color2:0xffe6a8,size:7,rise:1.2,spread:.26,opacity:.9,radius:.22,height:.1,startActive:0,fadeIn:.05});
emberField.points.name='kiln-embers';emberField.points.position.set(0,.5,.82);emberField.points.visible=false;kilnModel.group.add(emberField.points);
// Floating hint: rotating arrow, a soft light curtain and ground glow over the next bench.
 const hint=new THREE.Group();hint.name='next-station-hint';hint.visible=false;root.add(hint);
 const hintGlow=mesh(new THREE.CircleGeometry(1.08,40),new THREE.MeshBasicMaterial({color:0xffcf82,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),hint,0,.1,0);hintGlow.rotation.x=-PI/2;hintGlow.castShadow=false;
 const hintRing=mesh(new THREE.RingGeometry(.88,.96,44),new THREE.MeshBasicMaterial({color:0xffe1a4,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}),hint,0,.11,0);hintRing.rotation.x=-PI/2;hintRing.castShadow=false;
 const curtainCanvas=document.createElement('canvas');curtainCanvas.width=32;curtainCanvas.height=128;const curtainCtx=curtainCanvas.getContext('2d');const curtainGrad=curtainCtx.createLinearGradient(0,0,0,128);curtainGrad.addColorStop(0,'rgba(255,214,140,0)');curtainGrad.addColorStop(.55,'rgba(255,204,120,.3)');curtainGrad.addColorStop(1,'rgba(255,235,180,.72)');curtainCtx.fillStyle=curtainGrad;curtainCtx.fillRect(0,0,32,128);
 const curtainTex=new THREE.CanvasTexture(curtainCanvas);curtainTex.colorSpace=THREE.SRGBColorSpace;
 const curtain=mesh(new THREE.CylinderGeometry(.8,.96,2.15,32,1,true),new THREE.MeshBasicMaterial({map:curtainTex,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),hint,0,1.15,0);curtain.castShadow=false;curtain.receiveShadow=false;
 const hintArrow=group(hint,0,2.1,0);
 mesh(new THREE.ConeGeometry(.42,.82,4),new THREE.MeshBasicMaterial({color:0xffa62e}),hintArrow,0,-.12,0).rotation.z=PI;
 box(hintArrow,0,.44,0,.16,.82,.16,0xffbf58,false);
 const arrowHalo=mesh(new THREE.TorusGeometry(.58,.035,8,36),new THREE.MeshBasicMaterial({color:0xffd27d,transparent:true,opacity:.95,depthWrite:false}),hintArrow,0,-.5,0);arrowHalo.rotation.x=PI/2;
 hintArrow.traverse(o=>{if(o.isMesh){o.material.depthTest=false;o.material.depthWrite=false;o.renderOrder=30;}});
 const hintMotes=createParticleField({count:34,color:0xffcf82,color2:0xfff5cd,size:9,rise:1.8,spread:.4,opacity:.7,radius:.9,height:2.2});
 hint.add(hintMotes.points);
 // A few fallen petals soften the paving; no grass sprouts through the flagstones.
const flowerDummy=new THREE.Object3D();
const flowerGeo=new THREE.SphereGeometry(.045,6,5),flowerMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8});
 const flowers=new THREE.InstancedMesh(flowerGeo,flowerMat,46);const flowerTint=new THREE.Color(),flowerPalette=[0xf0d89a,0xe8b7b0,0xd9d3ec,0xf4e6c8];
 for(let i=0;i<46;i++){
  const side=i%3,base=[-7.6+((i*41)%150)/10,.58,-4.98+((i*23)%80)/10];const x=side===0?base[0]:side===1?2.53:-7.6+((i*31)%150)/10,z=side===2?5.2:base[2];
  flowerDummy.position.set(x,.27+(i%4)*.03,z);flowerDummy.scale.setScalar(.8+(i%5)*.12);flowerDummy.updateMatrix();flowers.setMatrixAt(i,flowerDummy.matrix);flowerTint.setHex(flowerPalette[i%4]);flowers.setColorAt(i,flowerTint);
 }
 flowers.instanceMatrix.needsUpdate=true;if(flowers.instanceColor)flowers.instanceColor.needsUpdate=true;root.add(flowers);
 let activeScene=-1,requestedScene=-1,chimneyAnchor=null,environment=null,loadTicket=0,loadPromise=null,loading=false,loadError=null;
 const gallery=group(root);
 function resetCustomers(){
  for(const c of [...customers,...departing]){root.remove(c.group);disposeWorldTree(c.group);}
  customers=[];departing.length=0;lastOrders='';
 }
 async function setScene(index,{force=false}={}){
  if(disposed)return false;
  if(index===requestedScene&&!force)return loadPromise;
  requestedScene=index;const ticket=++loadTicket;loading=true;loadError=null;canvas.dataset.loading='true';
  loadPromise=(async()=>{
   try{
    const next=await loadSceneEnvironment(PLACES[index].id);
    if(disposed||ticket!==loadTicket){next.dispose();return false;}
    if(environment){scene.remove(environment.group);environment.dispose();}
    environment=next;scene.add(next.group);activeScene=index;root.position.y=next.groundY;
    chimneyAnchor=next.chimney;
    if(chimneyAnchor)smokeField.points.position.set(chimneyAnchor.x,chimneyAnchor.y-root.position.y,chimneyAnchor.z);
    smokeField.points.visible=!!chimneyAnchor;
    disposeWorldTree(gallery);gallery.clear();
    workshopSign(gallery,PLACES[index].workshop,SCENES[index].accent);
    resetCustomers();if(!preview)player.group.position.set(-4.55,0,-2.15);
    canvas.dataset.landmark=PLACES[index].id;loading=false;canvas.dataset.loading='false';resize();return true;
   }catch(error){if(ticket===loadTicket){loading=false;loadError=error;canvas.dataset.loading='error';}return false;}
  })();return loadPromise;
 }
 let demo=null;
 function setDemoFrame(frame){demo=frame;}
 let width=1,height=1,carry=null,carryKey='',moving=false,walking=0,stride=0;
 function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);let aspect=width/height;let vh=preview?Math.max(23,32/aspect):Math.max(15.8,24/aspect);camera.left=-vh*aspect/2;camera.right=vh*aspect/2;camera.top=vh/2;camera.bottom=-vh/2;camera.updateProjectionMatrix();}
 function canMove(x,z){const r=.37;if(x<-7.76||x>2.45||z<-4.9||z>5.13)return false;for(const s of STATIONS){if(x>s.x-s.w/2-r&&x<s.x+s.w/2+r&&z>s.z-s.d/2-r&&z<s.z+s.d/2+r)return false;}return true;}
 function move(dx,dz,dt){moving=!!(dx||dz);if(!moving)return;const len=Math.hypot(dx,dz);dx/=len;dz/=len;const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);right.y=0;right.normalize();const forward=new THREE.Vector3().crossVectors(right,new THREE.Vector3(0,1,0));const vx=right.x*dx+forward.x*dz,vz=right.z*dx+forward.z*dz;const p=player.group.position,step=3.35*dt,x0=p.x,z0=p.z;if(canMove(p.x+vx*step,p.z))p.x+=vx*step;if(canMove(p.x,p.z+vz*step))p.z+=vz*step;const target=Math.atan2(vx,vz);let diff=THREE.MathUtils.euclideanModulo(target-player.group.rotation.y+PI,PI*2)-PI;player.group.rotation.y+=diff*Math.min(1,dt*15);if((p.x-x0)**2+(p.z-z0)**2>1e-8){moving=true;walking+=dt*11;stride+=dt*11;}else moving=false;}
 function project(x,y,z){const p=new THREE.Vector3(x,y+root.position.y,z).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2};}
 function nearest(){let best=null,dist=Infinity;for(const s of STATIONS){const p=player.group.position;const dx=Math.max(Math.abs(p.x-s.x)-s.w/2,0),dz=Math.max(Math.abs(p.z-s.z)-s.d/2,0);const d=Math.hypot(dx,dz);if(d<1.04&&d<dist){best=s;dist=d;}}return best;}
 const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function update(dt,time,state,playing=true){
  if(disposed)return;
  if(cameraTween){const p=Math.min(1,(performance.now()-cameraTween.start)/cameraTween.duration),e=p*p*(3-2*p);orbit.azimuth=THREE.MathUtils.lerp(cameraTween.fromAz,cameraTween.toAz,e);orbit.polar=THREE.MathUtils.lerp(cameraTween.fromPolar,cameraTween.toPolar,e);orbit.zoom=THREE.MathUtils.lerp(cameraTween.fromZoom,cameraTween.toZoom,e);placeCamera();if(p>=1)cameraTween=null;}
  player.body.position.y=moving?Math.abs(Math.sin(walking))*.04:Math.sin(time*2)*.015;
  player.feet.forEach((m,i)=>{m.position.z=.1+(moving?Math.sin(walking+i*PI)*.16:0);});
  player.arms.forEach((m,i)=>{m.rotation.x=state.hasClay?-1.05:moving?Math.sin(walking+i*PI)*.45:0;});
  player.head.rotation.z=moving?Math.sin(walking*.5)*.015:Math.sin(time*.7)*.02;
  if(preview&&demo){
   demoTool.visible=!demo.moving&&['paint','carve'].includes(demo.step);demoTip.material=mat(demo.step==='paint'?0x315fa9:0xa1a69d);
   player.group.position.set(demo.x,0,demo.z);player.group.rotation.y=demo.moving?demo.angle:demo.face;
   const wave=reducedMotion()?0:Math.sin(demo.time*9);
   player.body.position.y=demo.moving?Math.abs(wave)*.04:0;
   player.feet.forEach((foot,i)=>foot.position.z=.1+(demo.moving?Math.sin(demo.time*9+i*Math.PI)*.16:0));
   player.arms.forEach((arm,i)=>arm.rotation.x=demo.moving?-.7:demo.step==='kiln'?-.65+wave*.32:demo.step==='serve'?-1.3:-.95+wave*.14);
   player.head.rotation.x=demo.moving?0:.13;
  }else if(!moving&&!reducedMotion()){
   const beat=(time%18),gesture=beat>10&&beat<13?Math.sin((beat-10)/3*Math.PI):0;
   player.head.rotation.y=gesture*.15;player.arms[0].rotation.x-=gesture*.65;
  }
  playerRing.position.x=player.group.position.x;playerRing.position.z=player.group.position.z;
  const next=STATIONS.find(s=>s.id===state.nextStation());
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  marker.visible=!!next&&playing;hint.visible=!!next&&playing;
  if(next){
   marker.position.set(next.approach[0],.085,next.approach[1]);marker.scale.setScalar(1+Math.sin(time*3)*.08);
   hint.position.set(next.x,0,next.z);
   const pulse=1+Math.sin(time*2.5)*.07;hintGlow.scale.setScalar(pulse);hintRing.scale.setScalar(1+Math.sin(time*2.5+1)*.05);
   hintGlow.material.opacity=.13+Math.sin(time*2.5)*.035;hintRing.material.opacity=.46+Math.sin(time*2.5+1)*.1;
   hintArrow.visible=false;hintArrow.position.y=3.18+(reduced?0:Math.sin(time*2.1)*.1);hintArrow.rotation.y=reduced?0:time*1.45;
   arrowHalo.rotation.z=reduced?0:time*1.1;curtain.rotation.y=reduced?0:time*.22;
   curtain.material.opacity=.34+Math.sin(time*2.2)*.06;hintMotes.update(dt,playing?1:0);
  }else hintMotes.update(dt,0);
  const key=state.hasClay&&state.piece?state.piece.design+state.piece.revision:'';if(key!==carryKey){if(carry){player.body.remove(carry);carry.traverse(m=>{if(m.userData.customRelief){m.geometry.dispose();m.material.dispose();}});}carryKey=key;if(state.hasClay&&state.piece){carry=state.piece.pixels?reliefSculpture(state.piece.pixels):sculpture(state.piece.design,state.piece.stage);carry.scale.setScalar(.45);carry.position.set(0,.86,.66);player.body.add(carry);}else carry=null;}
  for(const [id,model] of Object.entries(benchModels))if(id!=='kiln')model.update(dt,{level:state.stationLevel(id),reduced});
  const orderKey=state.orders.map(o=>o.id).join(',');if(orderKey!==lastOrders){lastOrders=orderKey;for(const c of customers)if(!state.orders.some(o=>o.id===c.id))departing.push(c);customers=state.orders.map(o=>{let c=customers.find(c=>c.id===o.id);if(!c){const species=DESIGNS[o.design].species;const coats={rabbit:0xb996a0,bear:0xbc9d5e,cat:0x92a292};c=animal(root,species,7.8,3.5,coats[species]);c.id=o.id;c.group.scale.setScalar(.85);}return c;});}
  customers.forEach((c,i)=>{
   const targetZ=[-.25,1.65,3.35][i],p=c.group.position,seed=(c.id||i+1)*1.73;
   const walking=Math.hypot(p.x-4.95,p.z-targetZ)>.07;
   p.x+=(4.95-p.x)*Math.min(1,dt*1.8);p.z+=(targetZ-p.z)*Math.min(1,dt*1.8);c.group.rotation.y=-PI/2;
   const blinkPhase=(time*.72+seed)%4.3,blink=blinkPhase<.12?.1:1;
   c.body.position.y=walking?Math.abs(Math.sin(time*9))*.06:Math.sin(time*1.7+seed)*.022;
   c.body.scale.y=walking?1:1+Math.sin(time*2.2+seed)*.012;
   c.head.rotation.z=walking?0:Math.sin(time*.65+seed)*.03;
   c.head.rotation.y=walking?0:Math.sin(time*.36+seed)*.09;
   c.eyes.forEach(eye=>{eye.scale.y=eye.userData.baseY*blink;});
   c.ears.forEach((ear,j)=>{ear.rotation.z=ear.userData.baseZ+(walking?0:Math.sin(time*1.9+seed+j)*.045);});
   if(c.tail)c.tail.rotation.y=walking?0:Math.sin(time*1.35+seed)*.32;
   c.arms.forEach((arm,j)=>{arm.rotation.x=walking?Math.sin(time*8+j*2)*.18:Math.sin(time*1.5+seed+j*2.1)*.055;});
   if(!walking&&!reduced){
    const phase=(time+seed*3)%17,gesture=phase<3?Math.sin(phase/3*Math.PI):0;
    const species=DESIGNS[state.orders[i]?.design]?.species||'rabbit';
    c.head.rotation.x=gesture*(species==='cat'?.28:-.1);
    c.arms.forEach((arm,j)=>{arm.rotation.x-=gesture*(species==='bear'?1.35:species==='cat'?.95:.75);arm.rotation.z=gesture*(j?-.16:.16);});
    if(species==='rabbit')c.ears.forEach((ear,j)=>ear.rotation.z+=gesture*(j?-.25:.25));
    if(species==='cat'&&c.tail)c.tail.rotation.y+=gesture*.5;
   }

  });
  for(let i=departing.length-1;i>=0;i--){const c=departing[i];c.group.position.x+=dt*1.9;c.group.position.z+=dt*.28;c.group.rotation.y=PI/2;c.body.position.y=Math.abs(Math.sin(time*10))*.08;if(c.group.position.x>8.5){root.remove(c.group);disposeWorldTree(c.group);departing.splice(i,1);}}
  if(state.hasClay)kilnModel.setPiece(state.piece.pixels,state.piece.revision);
  const heat=state.kiln?state.kiln.heat:0;
  kilnModel.update(state.kilnPaused?0:dt,{firing:!!state.kiln,heat,level:state.stationLevel('kiln'),reduced});
  // Landmark smoke is ambient; kilnPaused also stays true during normal walking.
  // Preview pause/reduced-motion already supplies a zero world delta.
  if(chimneyAnchor)smokeField.update(dt,.78);else smokeField.points.visible=false;
  emberField.update(state.kilnPaused?0:dt,state.kiln ? .3+heat*.7 : 0);

  dust.forEach((m,i)=>{m.position.y+=dt*.018;if(m.position.y>3.8)m.position.y=.7;m.position.x+=Math.sin(time*.3+i)*dt*.012;});renderer.render(scene,camera);
 }
 function celebrate(index){const c=customers[index];if(!c)return;c.body.rotation.y+=PI*2;}
 function dispose(){if(disposed)return;disposed=true;loadTicket++;onOrbitUp();removers.forEach(remove=>remove());disposeWorldTree(scene);scene.traverse(object=>object.shadow?.dispose());renderer.dispose();renderer.forceContextLoss();}
 resize();return {dispose,scene,camera,renderer,player,stations:STATIONS,setDemoFrame,resetCustomers,get loading(){return loading;},get loadError(){return loadError;},get activeScene(){return activeScene;},get customerCount(){return customers.length+departing.length;},move,project,nearest,update,resize,celebrate,canMove,setScene,orbit,resetView,placeCamera,setInteractionEnabled,get stride(){return stride;}};
}

// Cache-owned primitives/materials are shared by the game and scene preview.
// Dispose only resources owned by the departing world or subtree.
function disposeWorldTree(root){
 const sharedGeometry=new Set([rounded,sphereGeo,leafGeo]),sharedMaterials=new Set(mats.values());
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root.traverse(object=>{
  if(object.geometry&&!sharedGeometry.has(object.geometry))geometries.add(object.geometry);
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(!material||sharedMaterials.has(material))continue;materials.add(material);
   for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  }
 });
 geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());
}
