import * as THREE from 'three';
import {PLACES} from './places.js';
import {createLandmark} from './landmarks.js';
import {SCENES} from './campaign.js';
import {decalCanvas} from './decals.js';
import { DESIGNS } from './sculpture.js';
import {reliefSculpture} from './relief-model.js';
export {reliefSculpture} from './relief-model.js';
import {createKilnModel} from './kiln-view.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const PI = Math.PI;
const mats = new Map();
function mat(color, roughness=0.85) { const k=String(color)+roughness; if(!mats.has(k)) mats.set(k,new THREE.MeshStandardMaterial({color,roughness})); return mats.get(k); }
const rounded = new RoundedBoxGeometry(1,1,1,2,.075);
const sphereGeo = new THREE.SphereGeometry(1,16,12);
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
 {id:'kiln',name:'瓷器窑炉',x:-5.65,z:.3,w:2.2,d:2.1,approach:[-3.95,.3],labelY:2.7},
 {id:'paint',name:'手绘上色',x:-1.25,z:1.35,w:2.4,d:1.45,approach:[-1.25,2.95],labelY:1.9},
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
 if(type==='fox'||type==='cat') {
  for(const sign of [-1,1]){
   const ear=mesh(new THREE.ConeGeometry(.215,.56,4),fur,head,sign*.37,.43,-.045);ear.rotation.z=sign*-.12;
   const inner=mesh(new THREE.ConeGeometry(.124,.34,3),type==='fox'?0x6e4b34:0xd9ab98,head,sign*.37,.44,.075);inner.rotation.z=sign*-.12;
  }
 } else if(type==='rabbit'){
  for(const sign of [-1,1]) {ball(head,sign*.25,.65,-.02,.155,.48,.14,fur);ball(head,sign*.25,.68,.09,.08,.33,.025,0xd9a899);}
 } else {ball(head,-.4,.33,-.03,.21,.22,.14,fur);ball(head,.4,.33,-.03,.21,.22,.14,fur);ball(head,-.4,.35,.08,.11,.13,.045,0xc39a78);ball(head,.4,.35,.08,.11,.13,.045,0xc39a78);}
 if(type==='fox'){
  ball(head,-.235,-.17,.325,.29,.23,.16,cream).rotation.z=.3;ball(head,.235,-.17,.325,.29,.23,.16,cream).rotation.z=-.3;ball(head,0,-.18,.47,.18,.13,.15,cream);
  const tail=group(body,0,.48,-.29);tail.rotation.x=-.75;ball(tail,0,.25,-.14,.23,.42,.22,fur);ball(tail,0,.57,-.13,.21,.21,.2,cream);
 } else ball(head,0,-.17,.385,.28,.2,.11,type==='cat'?0xede0c3:0xe0c6a2);
 ball(head,0,-.11,type==='fox'?.59:.487,.073,.052,.048,dark);
 for(const sign of [-1,1]) {ball(head,sign*.215,.025,.389,.044,.066,.032,dark);ball(head,sign*.204,.044,.414,.013,.018,.009,0xffffff);ball(head,sign*.343,-.1,.369,.075,.035,.018,0xd59977);}
 const mouth=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.06,-.22,.49),new THREE.Vector3(0,-.25,.5),new THREE.Vector3(.06,-.22,.49)]),new THREE.LineBasicMaterial({color:0x805d45}));head.add(mouth);
 if(chef){const cap=group(head,0,.49,-.09);ball(cap,0,0,0,.3,.14,.24,0x718777);cyl(cap,0,.085,0,.048,.055,.12,0x566c59,12);box(cap,.05,-.045,.21,.37,.035,.16,0x6b816f);const scarf=box(body,0,1.03,.32,.3,.12,.14,0xdab46b);scarf.rotation.z=.12;}
 return {group:g,body,head,feet,arms};
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
function plant(parent,x,y,z,scale=1) {const g=group(parent,x,y,z);g.scale.setScalar(scale);cyl(g,0,.23,0,.28,.2,.46,0xbd7955);torus(g,0,.44,0,.26,.04,0xd19169);cyl(g,0,.46,0,.22,.22,.02,0x64523a);for(let i=0;i<6;i++){const a=i*2.4;const leaf=ball(g,Math.sin(a)*.19,.78+(i%2)*.2,Math.cos(a)*.18,.14,.35,.14,[0x738759,0x879a65,0x9da56b][i%3]);leaf.rotation.z=Math.sin(a)*.6;}return g;}
function bench(parent,x,z,w=2.2,d=1.5) {const g=group(parent,x,0,z);shadow(g,0,0,w*.46,d*.42,.08);for(let a of [-1,1])for(let b of [-1,1])box(g,a*(w/2-.15),.56,b*(d/2-.13),.17,1.08,.17,0x836445);box(g,0,.45,0,w-.16,.12,d-.12,0xb08a5b);box(g,0,1.1,0,w,.23,d,0xb99766);box(g,0,1.24,0,w+.06,.11,d+.05,0xd9b984);for(const sx of [-1,1]){box(g,sx*w*.17,1.297,0,.012,.004,d-.08,0xc8a771,false);for(const sz of [-1,1])box(g,sx*(w/2-.15),.13,sz*(d/2-.13),.18,.12,.18,0x7d806a);}return g;}
function textSign(parent,text,x,y,z,w=2.5,h=.6,color='#f6e8c7',bg='#556d56') {
 const c=document.createElement('canvas');c.width=768;c.height=200;let ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.font='bold 64px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,384,110);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:1}),parent,x,y,z);return m;
}
export function createWorld(canvas) {
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const scene=new THREE.Scene();
 /* Orbit camera. Dragging with the left button turns the workshop; the polar
    angle is clamped so the eye can rise overhead but never sink below the floor. */
 const TARGET=new THREE.Vector3(-.2,.7,-.7);
 const HOME_OFFSET=new THREE.Vector3(10,17,20).sub(TARGET);
 const orbit={azimuth:Math.atan2(HOME_OFFSET.x,HOME_OFFSET.z),polar:Math.acos(HOME_OFFSET.y/HOME_OFFSET.length()),radius:HOME_OFFSET.length(),zoom:1};
 const POLAR_MIN=THREE.MathUtils.degToRad(24),POLAR_MAX=Math.PI/2,ZOOM_MIN=.62,ZOOM_MAX=2.6;
 const camera=new THREE.OrthographicCamera(-10,10,7,-7,.1,140);
 function placeCamera(){const s=Math.sin(orbit.polar),c=Math.cos(orbit.polar);camera.position.set(TARGET.x+orbit.radius*s*Math.sin(orbit.azimuth),TARGET.y+orbit.radius*c,TARGET.z+orbit.radius*s*Math.cos(orbit.azimuth));camera.lookAt(TARGET);camera.zoom=orbit.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
 placeCamera();
 let orbitDrag=null,interactionEnabled=false;
 const onOrbitDown=e=>{if(!interactionEnabled||e.button!==0||!e.isPrimary)return;e.preventDefault();orbitDrag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.classList.add('is-orbiting');canvas.setPointerCapture?.(e.pointerId);};
 const onOrbitMove=e=>{if(!interactionEnabled||!orbitDrag||e.pointerId!==orbitDrag.id)return;if(!(e.buttons&1)){onOrbitUp(e);return;}const dx=e.clientX-orbitDrag.x,dy=e.clientY-orbitDrag.y;orbitDrag.x=e.clientX;orbitDrag.y=e.clientY;orbit.azimuth-=dx*.0062;orbit.polar=THREE.MathUtils.clamp(orbit.polar+dy*.005,POLAR_MIN,POLAR_MAX);placeCamera();};
 const onOrbitUp=()=>{if(!orbitDrag)return;const id=orbitDrag.id;orbitDrag=null;canvas.classList.remove('is-orbiting');if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);};
 const onOrbitWheel=e=>{if(!interactionEnabled)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);orbit.zoom=THREE.MathUtils.clamp(orbit.zoom*Math.exp(-delta*.0012),ZOOM_MIN,ZOOM_MAX);placeCamera();};
 canvas.addEventListener('pointerdown',onOrbitDown);window.addEventListener('pointermove',onOrbitMove);window.addEventListener('pointerup',onOrbitUp);window.addEventListener('pointercancel',onOrbitUp);
 canvas.addEventListener('wheel',onOrbitWheel,{passive:false});canvas.addEventListener('lostpointercapture',onOrbitUp);window.addEventListener('blur',onOrbitUp);document.addEventListener('visibilitychange',()=>{if(document.hidden)onOrbitUp();});
 function setInteractionEnabled(value){interactionEnabled=!!value;if(!interactionEnabled)onOrbitUp();}
 function resetView(){orbit.azimuth=Math.atan2(HOME_OFFSET.x,HOME_OFFSET.z);orbit.polar=Math.acos(HOME_OFFSET.y/HOME_OFFSET.length());orbit.zoom=1;placeCamera();}
 scene.add(new THREE.HemisphereLight(0xfff6dc,0xa7aa90,2.1));const sun=new THREE.DirectionalLight(0xffe3b3,3.4);sun.position.set(-3,14,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.1,far:45});sun.shadow.normalBias=.045;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);const fill=new THREE.DirectionalLight(0xd3e6df,1.2);fill.position.set(8,7,-5);scene.add(fill);
 const root=group(scene);
 box(root,0,-.43,0,16.8,.65,11.65,0xa39169);box(root,0,-.11,0,16.6,.18,11.45,0xc5bb99);
 const colors=[0xe1cba2,0xe9d5af,0xe6cfa7,0xdac39d,0xeddbb6];for(let ix=0;ix<18;ix++)for(let iz=0;iz<13;iz++)box(root,-7.85+ix*.925,.01,-5.1+iz*.85,.903,.06,.825,ix>11?0xe6dcc1:colors[(ix*3+iz*7)%5],false);
 box(root,-.1,1.25,-5.58,16.6,2.55,.23,0xd8b780);box(root,-8.3,1.25,0,.23,2.55,11.4,0xd3b078);box(root,-.1,2.56,-5.58,16.85,.18,.36,0x9d784b);box(root,-8.3,2.56,0,.36,.18,11.7,0x9d784b);
 for(let row=0;row<3;row++)for(let col=0;col<18;col++){const x=-8+col*.94+(row%2)*.47;if(x<8.1)box(root,x,.22+row*.31,-5.435,.89,.27,.025,[0xc29a6a,0xcda97b,0xbf9869][(row+col)%3],false);}
 for(let i=0;i<14;i++)box(root,-8.165,.42,-5+i*.75,.03,.78,.7,i%2?0xc7a16c:0xcba877,false);
 // A bright window, its wooden frame, and the village beyond.
 box(root,-4.1,1.84,-5.37,3.35,1.28,.12,0x947849);box(root,-4.1,1.84,-5.285,3.06,1.05,.05,0xb6c6a0);box(root,-4.1,1.72,-5.245,3.06,.63,.045,0x91a57a);
 for(let i=0;i<8;i++)ball(root,-5.5+i*.42,1.73+(i%3)*.11,-5.2,.28,.31,.02,0xa7b782);
 for(const x of [-5.63,-4.1,-2.57])box(root,x,1.88,-5.19,.065,1.17,.12,0x9a7d50);box(root,-4.1,1.77,-5.18,3.1,.06,.12,0x9a7d50);box(root,-4.1,1.23,-5.13,3.5,.12,.36,0xe1c99c);
 plant(root,-5.2,1.31,-5.04,.36);textSign(root,'TERRA  •  CLAY STUDIO',.25,1.89,-5.4,3.4,.64);
 // Shelf full of finished terracotta keepsakes.
 box(root,5.0,1.55,-5.2,4.2,.13,.63,0x987343);box(root,5,2.38,-5.2,4.2,.11,.58,0x987343);
 for(let i=0;i<6;i++){const s=sculpture('vase');s.position.set(3.4+i*.62,1.62,-5.05);s.scale.setScalar(.42);root.add(s);}plant(root,6.4,2.43,-5.18,.42);
 for(let i=0;i<8;i++)ball(root,-8.5+(i%3)*.2,2.6+Math.sin(i)*.25,-5.5+i*.38,.56,.32,.4,[0x73825b,0x7b8c5a,0x95a071][i%3]);
 // Stations.
 const clay=bench(root,-5.65,-3.65,2.1,1.45);
 for(let c=0;c<2;c++){const crate=group(clay,-.5+c*.92,1.32,0);box(crate,0,.03,0,.81,.09,.95,0x8f7752);for(let k=0;k<3;k++){box(crate,-.4,.12+k*.14,0,.06,.1,1,0xa78c60);box(crate,.4,.12+k*.14,0,.06,.1,1,0xa78c60);box(crate,0,.12+k*.14,-.47,.8,.1,.06,0xa78c60);box(crate,0,.12+k*.14,.47,.8,.1,.06,0xa78c60);}for(let k=0;k<4;k++)ball(crate,(k%2-.5)*.33,.2,Math.floor(k/2)*.4-.2,.21,.2,.22,0xe9e3d6);}
 box(clay,0,.7,.75,.68,.35,.03,0xe7d4ac);textSign(clay,'CLAY',0,.72,.772,.55,.22,'#795b3e','#e7d4ac');
 const wheel=group(root,-2.7,0,-3.65);box(wheel,0,.49,0,1.6,.95,1.3,0x78938a);box(wheel,0,1,0,1.85,.2,1.6,0xaac0ad);cyl(wheel,0,1.14,0,.62,.62,.12,0x8c9990);torus(wheel,0,1.22,0,.45,.018,0xb5c3b3);const wheelTop=group(wheel,0,1.22,0);const wheelSculpt=sculpture('vase','shaped');wheelSculpt.scale.setScalar(.56);wheelTop.add(wheelSculpt);box(wheel,0,.25,.87,.55,.12,.32,0x727c68);cyl(wheel,.9,.4,.65,.31,.29,.12,0xa88257);cyl(wheel,.9,.2,.65,.06,.08,.3,0x86734f);
 const carving=bench(root,.4,-3.65,2.35,1.45);box(carving,-.2,1.32,0,1.1,.07,.99,0x8f9b7b);const sample=sculpture('vase','shaped');sample.position.set(-.22,1.37,0);sample.scale.setScalar(.54);carving.add(sample);for(let i=0;i<3;i++){const tool=box(carving,.73+i*.15,1.38,-.1,.055,.055,.55,0x8d6442);tool.rotation.y=.1*i;box(carving,.73+i*.15,1.38,.2,.075,.035,.15,0xb8b5a2);}for(let i=0;i<5;i++)ball(carving,-.77+(i%3)*.23,1.37,.4+(i%2)*.14,.045,.025,.03,0xb98c6a);
 const kilnModel=createKilnModel();kilnModel.group.position.set(-5.65,0,.3);root.add(kilnModel.group);
 const paint=bench(root,-1.25,1.35,2.4,1.45);box(paint,-.3,1.32,0,1.13,.08,1.04,0xe4d5b2);let paintVase=sculpture('vase');paintVase.scale.setScalar(.59);paintVase.position.set(-.4,1.38,.02);paint.add(paintVase);for(let i=0;i<3;i++){cyl(paint,.6,1.37,-.4+i*.38,.14,.13,.17,0xeee0bf);cyl(paint,.6,1.46,-.4+i*.38,.115,.115,.008,[0x77937d,0xc89359,0xe2d5a8][i]);}cyl(paint,1,1.54,-.15,.13,.1,.45,0xa77d50);for(let i=0;i<3;i++){const brush=box(paint,1.01+(i-1)*.09,1.85,-.15,.027,.59,.027,0x85603e);brush.rotation.z=(i-1)*.13;}
 const serve=group(root,3.2,0,0);box(serve,0,.6,0,1.12,1.2,3.12,0x819481);for(let i=0;i<7;i++)box(serve,.59,.59,-1.37+i*.45,.055,1.04,.055,0x6e826c);box(serve,0,1.26,0,1.5,.18,3.4,0xd0b484);box(serve,0,1.37,0,.94,.05,1.15,0xf0dfbb);box(serve,0,1.48,-1.05,.65,.2,.54,0x809078);box(serve,0,1.72,-1.12,.56,.39,.08,0x526b54).rotation.x=-.22;box(serve,0,1.77,-1.048,.38,.18,.025,0xd8d7ae).rotation.x=-.22;cyl(serve,0,1.46,1.1,.13,.14,.16,0xd6b466);ball(serve,0,1.54,1.1,.14,.12,.14,0xd3b064);
 // Customer path, planters, paper bunting, and a little rug.
 box(root,5.42,.056,.5,3.25,.022,6.3,0xcdc9a3);for(let i=0;i<8;i++)box(root,5.42,.073,-2.25+i*.78,3.15,.012,.025,0xe5dfbb,false);
 plant(root,7.15,.06,-3.1,1.2);plant(root,6.9,.06,4.22,1.15);plant(root,-7,.06,4.2,.95);plant(root,1.5,.06,-5,.62);
 box(root,5.7,.1,4.7,2.2,.1,.8,0xb99a66);box(root,5.7,.31,4.7,2.2,.33,.74,0xba9a65);for(let i=0;i<3;i++){const p=sculpture('vase');p.position.set(4.94+i*.71,.49,4.65);p.scale.setScalar(.55);root.add(p);}
 for(let i=0;i<6;i++){const flag=mesh(new THREE.ConeGeometry(.22,.43,3),[0xc78662,0xa4ad82,0xe3c486][i%3],root,-1.7+i*1.36,3.0-Math.sin(i/5*PI)*.35,-5.17);flag.rotation.z=PI;flag.rotation.y=PI;}
 const thread=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:31},(_,i)=>new THREE.Vector3(-1.85+i*.235,3.28-Math.sin(i/30*PI)*.38,-5.17))),new THREE.LineBasicMaterial({color:0x7d8063}));root.add(thread);
 const stationDecor=STATIONS.filter(s=>s.id!=='kiln').map(s=>{
  const details=[];for(let i=0;i<2;i++){const d=group(root,s.x+(i-.5)*.3,1.35,s.z+.35);cyl(d,0,.055,0,.08,.1,.11,0xd1ad68);torus(d,0,.115,0,.07,.018,0xf0d8a1);details.push(d);}return {id:s.id,details};
 });
 const player=humanSculptor(root,-4.55,-2.15);player.group.rotation.y=-.2;
 let customers=[animal(root,'rabbit',4.9,-.25,0xb996a0),animal(root,'bear',4.95,1.65,0xbc9d5e),animal(root,'cat',4.98,3.35,0x92a292)];customers.forEach((c,i)=>{c.id=i+1;c.group.rotation.y=-PI/2;c.group.scale.setScalar(.85)});let lastOrders='1,2,3';const departing=[];
 const marker=mesh(new THREE.RingGeometry(.47,.56,40),new THREE.MeshBasicMaterial({color:0xf7dfa2,transparent:true,opacity:.83,side:THREE.DoubleSide,depthWrite:false}),root,0,.085,0);marker.rotation.x=-PI/2;
 const playerRing=mesh(new THREE.RingGeometry(.5,.54,36),new THREE.MeshBasicMaterial({color:0xffffdf,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}),root,0,.09,0);playerRing.rotation.x=-PI/2;
 const dust=[];for(let i=0;i<24;i++){const m=mesh(new THREE.SphereGeometry(.018,5,5),new THREE.MeshBasicMaterial({color:0xffefb6,transparent:true,opacity:.36}),root,(Math.sin(i*53)*.5+.5)*14-7,1+(i%6)*.45,Math.cos(i*7)*4);m.castShadow=false;dust.push(m);}
 let activeScene=-1;
 const themeWalls=root.children.filter(m=>m.isMesh&&[0xd8b780,0xd3b078].includes(m.material?.color?.getHex()));
 const themeFloor=root.children.filter(m=>m.isMesh&&m.position.y===.01);
 [...themeWalls,...themeFloor].forEach(m=>m.material=m.material.clone());
 // Open the rear of the workshop onto each destination; tall generic walls would hide the landmarks.
 for(const item of root.children){
  if(item.position.z===-5.58||(item.position.z<=-5.0&&item.position.y>1.1)||item.isLine)item.visible=false;
 }
 const gallery=group(root);let landmark=null;
 function setScene(index){
  if(index===activeScene)return;activeScene=index;const theme=SCENES[index];
  if(landmark){root.remove(landmark);landmark.userData.dispose();}landmark=createLandmark(index);root.add(landmark);canvas.dataset.landmark=PLACES[index].id;
  themeWalls.forEach(m=>m.material.color.setHex(theme.wall));themeFloor.forEach((m,i)=>m.material.color.setHex(theme.floor).offsetHSL(0,0,(i%5-2)*.013));sun.color.setHex(theme.sun);
  gallery.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.map?.dispose();m.material.dispose();}});gallery.clear();
  box(gallery,4.7,1.53,-5.06,3.4,.13,.61,0x987343,false);
  for(const x of [3.15,6.25])box(gallery,x,.77,-5.06,.09,1.48,.45,0x957751,false);
  const texture=new THREE.CanvasTexture(decalCanvas(index));texture.colorSpace=THREE.SRGBColorSpace;
  for(let i=0;i<3;i++){
   const display=mesh(new THREE.CircleGeometry(.32,48),new THREE.MeshStandardMaterial({map:texture.clone(),roughness:.23}),gallery,3.8+i*.92,1.98,-5.05);display.material.map.needsUpdate=true;
   const edge=mesh(new THREE.TorusGeometry(.34,.025,8,48),new THREE.MeshStandardMaterial({color:theme.accent,roughness:.3}),gallery,3.8+i*.92,1.98,-5.03);
  }
  texture.dispose();textSign(gallery,PLACES[index].workshop,.25,1.05,-5.36,3.4,.5,'#fff9eb',theme.accent);
  player.group.position.set(-4.55,0,-2.15);
 }
 let width=1,height=1,carry=null,carryKey='',moving=false,walking=0;
 function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;renderer.setSize(width,height,false);let aspect=width/height;let vh=Math.max(15.8,24/aspect);camera.left=-vh*aspect/2;camera.right=vh*aspect/2;camera.top=vh/2;camera.bottom=-vh/2;camera.updateProjectionMatrix();}
 function canMove(x,z){const r=.37;if(x<-7.76||x>2.45||z<-4.9||z>5.13)return false;for(const s of STATIONS){if(x>s.x-s.w/2-r&&x<s.x+s.w/2+r&&z>s.z-s.d/2-r&&z<s.z+s.d/2+r)return false;}return true;}
 function move(dx,dz,dt){moving=!!(dx||dz);if(!moving)return;const len=Math.hypot(dx,dz);dx/=len;dz/=len;const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);right.y=0;right.normalize();const forward=new THREE.Vector3().crossVectors(right,new THREE.Vector3(0,1,0));const vx=right.x*dx+forward.x*dz,vz=right.z*dx+forward.z*dz;const p=player.group.position,step=3.35*dt;if(canMove(p.x+vx*step,p.z))p.x+=vx*step;if(canMove(p.x,p.z+vz*step))p.z+=vz*step;const target=Math.atan2(vx,vz);let diff=THREE.MathUtils.euclideanModulo(target-player.group.rotation.y+PI,PI*2)-PI;player.group.rotation.y+=diff*Math.min(1,dt*15);walking+=dt*11;}
 function project(x,y,z){const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2};}
 function nearest(){let best=null,dist=Infinity;for(const s of STATIONS){const p=player.group.position;const dx=Math.max(Math.abs(p.x-s.x)-s.w/2,0),dz=Math.max(Math.abs(p.z-s.z)-s.d/2,0);const d=Math.hypot(dx,dz);if(d<1.04&&d<dist){best=s;dist=d;}}return best;}
 function update(dt,time,state){
  player.body.position.y=moving?Math.abs(Math.sin(walking))*.04:Math.sin(time*2)*.015;
  player.feet.forEach((m,i)=>{m.position.z=.1+(moving?Math.sin(walking+i*PI)*.16:0);});
  player.arms.forEach((m,i)=>{m.rotation.x=state.hasClay?-1.05:moving?Math.sin(walking+i*PI)*.45:0;});
  player.head.rotation.z=moving?Math.sin(walking*.5)*.015:Math.sin(time*.7)*.02;
  playerRing.position.x=player.group.position.x;playerRing.position.z=player.group.position.z;
  const next=STATIONS.find(s=>s.id===state.nextStation());marker.visible=!!next;if(next){marker.position.set(next.approach[0],.085,next.approach[1]);marker.scale.setScalar(1+Math.sin(time*3)*.08);}
  const key=state.hasClay&&state.piece?state.piece.design+state.piece.revision:'';if(key!==carryKey){if(carry){player.body.remove(carry);carry.traverse(m=>{if(m.userData.customRelief){m.geometry.dispose();m.material.dispose();}});}carryKey=key;if(state.hasClay&&state.piece){carry=state.piece.pixels?reliefSculpture(state.piece.pixels):sculpture(state.piece.design,state.piece.stage);carry.scale.setScalar(.45);carry.position.set(0,.86,.66);player.body.add(carry);}else carry=null;}
  wheelTop.rotation.y=time*.55;
  const orderKey=state.orders.map(o=>o.id).join(',');if(orderKey!==lastOrders){lastOrders=orderKey;for(const c of customers)if(!state.orders.some(o=>o.id===c.id))departing.push(c);customers=state.orders.map(o=>{let c=customers.find(c=>c.id===o.id);if(!c){const species=DESIGNS[o.design].species;const coats={rabbit:0xb996a0,bear:0xbc9d5e,cat:0x92a292};c=animal(root,species,7.8,3.5,coats[species]);c.id=o.id;c.group.scale.setScalar(.85);}return c;});}
  customers.forEach((c,i)=>{const targetZ=[-.25,1.65,3.35][i],p=c.group.position;const walking=Math.hypot(p.x-4.95,p.z-targetZ)>.07;p.x+=(4.95-p.x)*Math.min(1,dt*1.8);p.z+=(targetZ-p.z)*Math.min(1,dt*1.8);c.group.rotation.y=-PI/2;c.body.position.y=walking?Math.abs(Math.sin(time*9))*.06:Math.sin(time*1.7+i*2)*.028;c.head.rotation.z=Math.sin(time*.65+i)*.035;});
  for(let i=departing.length-1;i>=0;i--){const c=departing[i];c.group.position.x+=dt*1.9;c.group.position.z+=dt*.28;c.group.rotation.y=PI/2;c.body.position.y=Math.abs(Math.sin(time*10))*.08;if(c.group.position.x>8.5){root.remove(c.group);departing.splice(i,1);}}
  if(state.hasClay)kilnModel.setPiece(state.piece.pixels,state.piece.revision);
  kilnModel.update(state.kilnPaused?0:dt,{firing:!!state.kiln,round:state.kiln?.round||0,level:state.stationLevel('kiln'),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
  stationDecor.forEach(({id,details})=>details.forEach((m,i)=>m.visible=state.stationLevel(id)>i+1));
  dust.forEach((m,i)=>{m.position.y+=dt*.018;if(m.position.y>3.8)m.position.y=.7;m.position.x+=Math.sin(time*.3+i)*dt*.012;});renderer.render(scene,camera);
 }
 function celebrate(index){const c=customers[index];if(!c)return;c.body.rotation.y+=PI*2;}
 resize();return {scene,camera,renderer,player,stations:STATIONS,move,project,nearest,update,resize,celebrate,canMove,setScene,orbit,resetView,placeCamera,setInteractionEnabled};
}
