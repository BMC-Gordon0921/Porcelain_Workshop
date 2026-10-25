import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createKilnModel} from './kiln-view.js';
import {disposeSceneTree} from './scene-environment.js';

export function createWorkbenchModel({id,level=1}){
 if(id==='kiln')return createKilnModel();
 const group=new THREE.Group();group.name=`workbench-${id}`;
 const rounded=new RoundedBoxGeometry(1,1,1,2,.055),materials=new Map();
 const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.75,metalness:color===0xc3a15e?.3:0}));return materials.get(color);};
 const put=(geometry,color,x,y,z,sx=1,sy=1,sz=1,parent=group)=>{const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const box=(x,y,z,w,h,d,color=0x92724f,parent)=>put(rounded,color,x,y,z,w,h,d,parent);
 const cyl=(x,y,z,r,h,color,parent)=>put(new THREE.CylinderGeometry(r,r,h,20),color,x,y,z,1,1,1,parent);
 const vase=(x,y,z,s=.4,parent=group)=>{const points=[[.2,0],[.3,.1],[.4,.4],[.22,.7],[.16,.85],[.2,.9]].map(p=>new THREE.Vector2(...p));return put(new THREE.LatheGeometry(points,20),0xe7debd,x,y,z,s,s,s,parent);};
 const tiers=[new THREE.Group(),new THREE.Group()];tiers.forEach(g=>group.add(g));
 const width=id==='serve'?1.2:id==='wheel'?1.8:2.2,depth=id==='serve'?3:1.4;
 box(0,1.2,0,width,.2,depth,0xb39a71);for(const x of [-1,1])for(const z of [-1,1])box(x*(width/2-.15),.58,z*(depth/2-.14),.16,1.16,.16,0x657e70);
 box(0,.35,0,width-.15,.12,depth-.12,0x92724f);
 let turntable=null;
 if(id==='clay'){
  for(const x of [-.5,.5]){box(x,1.37,0,.85,.16,1,0x8a6746);for(let i=0;i<4;i++)put(new THREE.SphereGeometry(.2,12,8),0xe4d9c1,x+(i%2-.5)*.35,1.57,(Math.floor(i/2)-.5)*.35,1,.7,1);}
  for(const x of [-.48,.48]){box(x,1.66,-.38,.86,.6,.1,0x80937c,tiers[0]);box(x,1.64,0,.08,.45,1,0xc3a15e,tiers[0]);}
  box(0,1.34,.38,1.6,.08,.5,0xe0c793,tiers[1]);for(const x of [-.52,.52]){box(x,2.02,-.25,.83,.1,.6,0x587d79,tiers[1]);cyl(x,2.09,-.25,.08,.06,0xc3a15e,tiers[1]);}
 }else if(id==='wheel'){
  box(0,.74,0,1.35,.88,1.15,0x78938a);cyl(0,1.36,0,.65,.1,0x8b9990);turntable=new THREE.Group();turntable.position.y=1.43;group.add(turntable);vase(0,0,0,.65,turntable);
  box(0,.2,.66,.6,.12,.3,0x485f58);box(0,.61,0,1.5,.13,1.26,0xc3a15e,tiers[0]);
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2;box(Math.cos(a)*.6,1.425,Math.sin(a)*.6,.035,.015,.08,0xe8d5ac,tiers[0]);}
  for(const x of [-.76,.76]){box(x,1.55,-.45,.09,.85,.1,0x52665c,tiers[1]);box(x*.5,1.92,-.45,.76,.08,.1,0xc3a15e,tiers[1]);}
  cyl(.73,.65,.25,.19,.65,0xc3a15e,tiers[1]);
 }else if(id==='carve'){
  box(-.15,1.34,0,1.25,.08,1,0x8a997b);vase(-.45,1.4,0,.55);
  for(let i=0;i<4;i++){box(.48+i*.13,1.38,.05,.05,.05,.5,0x775239);}
  for(const x of [-.8,.35]){box(x,1.5,0,.16,.24,.85,0x66796b,tiers[0]);cyl(x,1.68,.35,.07,.12,0xc3a15e,tiers[0]);}
  box(.75,1.59,-.43,.4,.5,.17,0x775239,tiers[0]);
  for(const x of [-.8,.35])box(x,1.97,-.4,.09,.72,.1,0xc3a15e,tiers[1]);box(-.22,2.29,-.4,1.25,.09,.1,0xc3a15e,tiers[1]);box(0,1.05,.55,1.65,.19,.45,0x8d7555,tiers[1]);
 }else if(id==='paint'){
  box(-.35,1.34,0,1.2,.08,1.08,0xe3d5b2);vase(-.35,1.4,0,.65);
  for(let i=0;i<3;i++){cyl(.65,1.41,-.42+i*.4,.14,.2,[0x315fa9,0xaf8058,0x93a184][i]);}
  for(const y of [1.65,1.98]){box(.45,y,-.51,1.1,.08,.3,0x658579,tiers[0]);for(let i=0;i<4;i++)cyl(.05+i*.27,y+.11,-.51,.09,.16,[0x315fa9,0xb27468,0xd3b571,0x658c73][i],tiers[0]);}
  box(-.78,1.41,.28,.07,.06,.7,0xc3a15e,tiers[0]);
  for(const x of [-.87,.25])box(x,1.85,0,.06,.92,.06,0xc3a15e,tiers[1]);box(-.31,2.3,0,1.18,.06,.06,0xc3a15e,tiers[1]);cyl(.7,1.46,.4,.23,.06,0xe7d3ac,tiers[1]);
 }else if(id==='serve'){
  box(0,.78,0,1.1,.85,2.85,0x819481);box(0,1.35,0,.9,.05,1.05,0xf0dfbb);box(0,1.5,-1,.6,.25,.5,0x4f6d5c);vase(0,1.4,1,.25);
  box(0,1.46,.5,.97,.16,.65,0xc3a15e,tiers[0]);for(const z of [-.75,.8])box(0,.55,z,.83,.4,.65,0xd5ba85,tiers[0]);
  for(const z of [-1.33,1.33])box(0,2,z,.09,1.42,.09,0xc3a15e,tiers[1]);box(0,2.69,0,1.18,.11,2.85,0x526f67,tiers[1]);box(.03,2.46,0,.13,.36,1.25,0xc3a15e,tiers[1]);for(const z of [-.9,.9])vase(0,1.4,z,.45,tiers[1]);
 }
 function update(dt,{level:current=level,reduced=false}={}){tiers.forEach((g,i)=>g.visible=current>i+1);if(turntable&&!reduced)turntable.rotation.y+=dt*.55;group.userData.level=current;}
 update(0);return {group,update,dispose(){disposeSceneTree(group);}};
}

export function createWorkbenchPreview(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,50);camera.position.set(6,5.2,10);camera.lookAt(0,1.2,0);scene.add(new THREE.HemisphereLight(0xfff5df,0x687a72,3));const light=new THREE.DirectionalLight(0xffe4b8,3);light.position.set(-3,7,6);scene.add(light);
 let models=[],current=1,disposed=false;
 function draw(){const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;renderer.setScissorTest(true);models.forEach((model,i)=>{models.forEach(m=>m.group.visible=m===model);renderer.setViewport(i*width/2,0,width/2,height);renderer.setScissor(i*width/2,0,width/2,height);renderer.render(scene,camera);});renderer.setScissorTest(false);}
 function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=Math.max(1,r.width/2)/Math.max(1,r.height);const distance=Math.max(1,1/camera.aspect);camera.position.set(3.4*distance,1.2+3.1*distance,5*distance);camera.lookAt(0,1.2,0);camera.updateProjectionMatrix();draw();}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 function show(id,level){models.forEach(m=>{scene.remove(m.group);m.dispose();});current=level;models=[level,Math.min(3,level+1)].map(level=>{const model=createWorkbenchModel({id,level});model.group.rotation.y=-.25;model.update(0,{level,reduced:true});scene.add(model.group);return model;});canvas.dataset.workbench=id;canvas.dataset.level=String(level);resize();}
 return {show,update(dt){if(disposed||document.hidden)return;models.forEach((m,i)=>m.update(Math.min(.05,dt),{level:i?Math.min(3,current+1):current,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}));draw();},dispose(){if(disposed)return;disposed=true;observer.disconnect();models.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();}};
}
