import * as THREE from 'three';
import {PLACES} from './places.js';
import {decalCanvas} from './decals.js';

// Decorative landmarks sit beyond the playable workshop, preserving all six station paths.
export function createLandmark(index){
 const root=new THREE.Group();root.name=`jingdezhen-${PLACES[index].id}`;
 const materialCache=new Map();
 const material=(color,roughness=.85)=>{const key=String(color)+roughness;if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness}));return materialCache.get(key);};
 function mesh(geometry,color,x,y,z){const m=new THREE.Mesh(geometry,typeof color==='object'?color:material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
 function box(x,y,z,w,h,d,color){return mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z);}
 function cylinder(x,y,z,rt,rb,h,color,segments=24){return mesh(new THREE.CylinderGeometry(rt,rb,h,segments),color,x,y,z);}
 function roof(x,y,z,w,d,color){
  const slope=.43,half=w/2;
  for(const sign of [-1,1]){const m=box(x+sign*half/2,y,z,Math.hypot(half,half*slope)+.2,.12,d+.38,color);m.rotation.z=-sign*Math.atan(slope);}
 }
 function facade(x,y,z,w,h,d,color,roofColor){box(x,y+h/2,z,w,h,d,color);roof(x,y+h+.15,z,w,d,roofColor);}
 function window(x,y,z,w=.46,h=.65){box(x,y,z,w+.1,h+.1,.08,0xe8d5ad);box(x,y,z+.05,w,h,.04,0x50717a);box(x,y,z+.08,.035,h,.025,0xc3a27c);}
 function chimney(x,z,h,color){root.userData.chimney={x,z,y:h};cylinder(x,h/2,z,.29,.44,h,color);cylinder(x,h-.03,z,.34,.34,.16,0x73523f);for(let i=1;i<h/.35;i++)cylinder(x,i*.35,z,.44-i*.35/h*.15,.445-i*.35/h*.15,.035,0xaa7960);}
 function label(text,x,y,z,w=3.4){const c=document.createElement('canvas');c.width=1024;c.height=180;const ctx=c.getContext('2d');ctx.fillStyle='#f3e5c7';ctx.fillRect(0,0,1024,180);ctx.strokeStyle='#8c6e45';ctx.lineWidth=10;ctx.strokeRect(8,8,1008,164);ctx.fillStyle='#3b4a50';ctx.font='600 63px "Songti SC", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,94,940);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return mesh(new THREE.PlaneGeometry(w,w*180/1024),new THREE.MeshStandardMaterial({map:texture,roughness:1}),x,y,z);}
 const canopyGeo=new THREE.SphereGeometry(1,10,8);
 function clump(x,y,z,sx,sy,sz,color){const m=mesh(canopyGeo,color,x,y,z);m.scale.set(sx,sy,sz);return m;}
 function brickTile(red=false){const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle=red?'#e4cbb4':'#dccab0';ctx.fillRect(0,0,128,64);const cols=red?[[176,78,58],[196,96,70],[154,64,50],[188,112,84]]:[[186,122,84],[164,102,70],[198,138,98],[150,92,66]];for(let row=0;row<2;row++){const offset=row?32:0;for(let col=-1;col<3;col++){const [r,g,b]=cols[(row+col+2)%cols.length];ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillRect(col*64+offset+3,row*32+3,58,26);ctx.fillStyle='rgba(255,236,214,.25)';ctx.fillRect(col*64+offset+3,row*32+3,58,3);}}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;return tex;}
 function brickFace(x,y,z,w,h,red=false){const tex=brickTile(red);tex.repeat.set(w/.92,h/.34);return mesh(new THREE.BoxGeometry(w,h,.06),new THREE.MeshStandardMaterial({map:tex,roughness:.93}),x,y,z);}
 function tree(x,z,scale=1){
  const s=scale,bark=0x6b5140,greens=[0x3d6938,0x5b8746,0x7ea45a,0x2c5530,0x6d9450];
  cylinder(x,.72*s,z,.07*s,.13*s,1.44*s,bark,8);
  for(let i=1;i<4;i++)cylinder(x,i*.32*s,z,.125*s,.125*s,.03*s,0x5a4334,8);
  const fork=cylinder(x+.08*s,1.25*s,z,.035*s,.06*s,.7*s,bark,6);fork.rotation.z=-.55;fork.position.x+=.12*s;
  const fork2=cylinder(x-.06*s,1.2*s,z+.04*s,.03*s,.05*s,.62*s,0x5d4638,6);fork2.rotation.z=.62;fork2.rotation.x=.25;
  for(let i=0;i<16;i++){const a=i*2.399,ring=.28+(i%5)*.11,lift=1.25+(i%4)*.2;clump(x+Math.cos(a)*ring*s,lift*s,z+Math.sin(a)*ring*.8*s,.42*s,.26*s,.36*s,greens[i%greens.length]);}
  clump(x,1.95*s,z,.55*s,.32*s,.48*s,0x8fb56a);clump(x,.15*s,z+.2*s,.7*s,.12*s,.55*s,0x4e7a40);
  for(let i=0;i<5;i++){const a=i*1.25;clump(x+Math.cos(a)*.55*s,.16*s,z+Math.sin(a)*.4*s,.18*s,.1*s,.16*s,greens[i%3]);}
 }
 function bamboo(x,z,scale=1){
  for(let i=0;i<7;i++){const a=i*.9,h=(1.55+(i%3)*.4)*scale,px=x+Math.sin(a)*.26*scale,pz=z+Math.cos(a)*.2*scale;cylinder(px,h/2,pz,.03*scale,.042*scale,h,i%2?0x7f9b52:0x6d8a46,6);for(let n=1;n<4;n++)cylinder(px,h*n/4,pz,.048*scale,.048*scale,.02*scale,0xd5e2b0,6);for(let k=0;k<3;k++){const yaw=k*1.2+a;const leaf=clump(px+Math.sin(yaw)*.16*scale,h-.02*scale,pz+Math.cos(yaw)*.14*scale,.035*scale,.012*scale,.22*scale,0x5f8f3e);leaf.rotation.y=yaw;leaf.rotation.z=.35;}}
 }
 function vase(x,y,z,scale=1){const points=[[0,0],[.32,0],[.45,.25],[.47,.58],[.27,.92],[.19,1.2],[.27,1.35],[.22,1.38],[.14,1.19],[.22,.93],[.39,.58],[.3,.13],[0,.13]].map(p=>new THREE.Vector2(...p));const texture=new THREE.CanvasTexture(decalCanvas(0));texture.colorSpace=THREE.SRGBColorSpace;const m=mesh(new THREE.LatheGeometry(points,32),new THREE.MeshStandardMaterial({map:texture,roughness:.22}),x,y,z);m.scale.setScalar(scale);return m;}
 box(0,-.17,-7.5,16.9,.3,4.3,[0xc6b996,0xc7d5cf,0xc8ac93,0xbcac97][index]);
 for(let i=0;i<4;i++){const mx=-8+i*4.7,h=2.7+(i%2)*.6,tone=[0x8ea888,0xa8b896,0xc5d0b8,0x93a88e][i];const hill=mesh(new THREE.ConeGeometry(2.15,h,20),tone,mx,h*.38,-10.4);hill.scale.z=.7;const ridge=mesh(new THREE.ConeGeometry(1.15,h*.62,16),0xd5e0cc,mx+.4,h*.52,-10.05);ridge.scale.set(1,.9,.55);}
 if(index===0){
  facade(-2.6,0,-7.3,5.4,2.3,2.5,0xa67750,0x59665c);brickFace(-2.6,1.15,-6.08,5.15,2.15);facade(1.2,0,-7.7,2.7,1.8,2,0xb18355,0x5b675c);brickFace(1.2,.9,-6.73,2.5,1.65);chimney(4.25,-7.35,5.25,0xa4744b);
  for(const x of [-4.5,-3.3,-2.1,-.9])window(x,1.43,-6.015,.56,.75);
  cylinder(5.9,.9,-6.7,.35,1.08,1.8,0x9b7451);box(5.9,.47,-5.82,.47,.76,.08,0x453b32);
  label('古窑民俗',-2.6,2.23,-5.93,2.2);tree(-6.5,-7,1.25);tree(7.3,-8.4,1.2);
  // Keep the wall behind the workshop sign clear; the old keepsake rack was removed.
 }else if(index===1){
  box(-1,1.4,-7.45,11.2,2.8,2.65,0xe4e3d2);box(-1,2.9,-7.45,11.65,.23,3,0x426a7d);box(-1,3.1,-7.45,10.5,.13,2.7,0x839aa1);
  for(let i=0;i<12;i++)window(-5.8+i*.83,1.51,-6.07,.65,1.55);
  for(const x of [-5.95,-3.3,.4,3.96])box(x,1.5,-5.91,.18,2.75,.32,0xece5d0);
  box(-.65,.22,-5.9,3.4,.4,.65,0xd2d6ca);box(-.65,1.15,-5.81,1.8,1.8,.04,0x446b78);label('中国陶瓷博物馆',-1,2.61,-5.87,4.6);
  cylinder(6,.27,-6.9,1,1,.54,0xe8dfca);vase(6,.53,-6.9,2.1);tree(-7.4,-8.2,1.2);bamboo(8,-6.6,.85);
  for(const x of [-4,2.5]){box(x,.42,-5.7,.9,.8,.7,0xceccb8);vase(x,.83,-5.7,.48);}
 }else if(index===2){
  function arch(x,z,r,h,depth){
   const shape=new THREE.Shape();shape.moveTo(-r,0);shape.lineTo(-r,h);
   for(let i=0;i<=32;i++){const a=Math.PI-i/32*Math.PI;shape.lineTo(Math.cos(a)*r,h+Math.sin(a)*r);}shape.lineTo(r,0);shape.lineTo(r-.23,0);shape.lineTo(r-.23,h);
   for(let i=0;i<=32;i++){const a=i/32*Math.PI;shape.lineTo(Math.cos(a)*(r-.23),h+Math.sin(a)*(r-.23));}shape.lineTo(-r+.23,0);shape.closePath();
   mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),0xac6951,x,0,z);
   const voussoirs=Math.max(12,Math.ceil(Math.PI*r/.18));
   for(let i=0;i<voussoirs;i++){const a=i/(voussoirs-1)*Math.PI;const brick=box(x+Math.cos(a)*r,h+Math.sin(a)*r,z+depth+.03,.2,.14,.1,i%2?0xc48462:0xb86d4e);brick.rotation.z=a+Math.PI/2;}
  }
  arch(-3.7,-8.6,1.65,.86,2.2);arch(.15,-8.4,1.1,.7,1.8);arch(3.05,-8.3,1.05,.65,1.65);
  box(5.75,.58,-7.32,1.9,1.22,1.5,0xd9c6ae);for(let row=0;row<4;row++)for(let col=0;col<5-row;col++)box(5.12+col*.36,row*.26+.18,-7.2,.33,.22,1.32,[0xb86d4e,0xc48462,0xa86448][(row+col)%3]);
  for(let i=0;i<3;i++){box(-2.7+i*2.5,.01,-5.89,1.65,.06,.64,0x846954);for(const dx of [-.85,.85])box(-2.7+i*2.5+dx,.2,-5.89,.05,.4,.7,0xd8c8a0);}
  label('御窑 · 寻迹',.2,2.18,-6.4,2.5);tree(-6.9,-8.5,1.4);tree(7.6,-8.8,1.2);bamboo(-8.15,-6.5,1);bamboo(8.2,-6.7,.9);
 }else{
  box(-1.6,1.35,-7.5,9.5,2.7,2.7,0x9f6650);brickFace(-1.6,1.35,-6.12,9.2,2.55,true);
  for(let i=0;i<5;i++){const x=-5.4+i*1.9;roof(x,2.85,-7.5,1.9,2.7,0x526a6a);window(x,1.58,-6.02,1.28,1.2);}
  for(const x of [-6.25,-4.45,-2.55,-.65,1.25,3.05])box(x,1.35,-5.96,.16,2.7,.18,0x7d4e3e);
  chimney(5.15,-7.6,5.8,0x95624a);label('陶溪川',-1.6,2.63,-6,2.55);
  for(let i=0;i<3;i++){
   const x=4.25+i*1.18;box(x,.56,-5.93,.96,1.08,.65,0xb49066);box(x,1.72,-5.93,1.06,.1,.93,[0x537e81,0xb07772,0xbb9b53][i]);for(const dx of [-.45,.45])box(x+dx,1.18,-5.93,.045,1.1,.7,0x84643f);vase(x,.99,-5.75,.42);
  }
  for(let i=0;i<9;i++){const x=-5.9+i*1.2,y=3.2-Math.sin(i/8*Math.PI)*.45;const bulb=mesh(new THREE.SphereGeometry(.07,8,8),new THREE.MeshStandardMaterial({color:0xffe5a6,emissive:0xffc361,emissiveIntensity:.8}),x,y,-5.7);}
  tree(-7.4,-7.6,1.25);tree(7.6,-8.9,1.3);bamboo(-8.2,-6.3,.95);bamboo(8.15,-6.5,1.05);
 }
 root.userData.dispose=()=>{const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(m=>{if(m.isMesh){geometries.add(m.geometry);materials.add(m.material);if(m.material.map)textures.add(m.material.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
 return root;
}
