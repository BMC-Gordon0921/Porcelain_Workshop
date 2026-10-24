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
 function chimney(x,z,h,color){cylinder(x,h/2,z,.29,.44,h,color);cylinder(x,h-.03,z,.34,.34,.16,0x73523f);for(let i=1;i<h/.35;i++)cylinder(x,i*.35,z,.44-i*.35/h*.15,.445-i*.35/h*.15,.035,0xaa7960);}
 function label(text,x,y,z,w=3.4){const c=document.createElement('canvas');c.width=1024;c.height=180;const ctx=c.getContext('2d');ctx.fillStyle='#f3e5c7';ctx.fillRect(0,0,1024,180);ctx.strokeStyle='#8c6e45';ctx.lineWidth=10;ctx.strokeRect(8,8,1008,164);ctx.fillStyle='#3b4a50';ctx.font='600 63px "Songti SC", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,94,940);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return mesh(new THREE.PlaneGeometry(w,w*180/1024),new THREE.MeshStandardMaterial({map:texture,roughness:1}),x,y,z);}
 function tree(x,z,scale=1){cylinder(x,.55*scale,z,.08*scale,.13*scale,1.1*scale,0x8f7350,8);for(let i=0;i<3;i++){const m=mesh(new THREE.IcosahedronGeometry(.65*scale,1),[0x809366,0x91a578,0xa8b185][i],x+(i-1)*.27*scale,1.15*scale+i*.22*scale,z);m.scale.y=.82;}}
 function vase(x,y,z,scale=1){const points=[[0,0],[.32,0],[.45,.25],[.47,.58],[.27,.92],[.19,1.2],[.27,1.35],[.22,1.38],[.14,1.19],[.22,.93],[.39,.58],[.3,.13],[0,.13]].map(p=>new THREE.Vector2(...p));const texture=new THREE.CanvasTexture(decalCanvas(0));texture.colorSpace=THREE.SRGBColorSpace;const m=mesh(new THREE.LatheGeometry(points,32),new THREE.MeshStandardMaterial({map:texture,roughness:.22}),x,y,z);m.scale.setScalar(scale);return m;}
 box(0,-.17,-7.5,16.9,.3,4.3,[0xc6b996,0xc7d5cf,0xc8ac93,0xbcac97][index]);
 for(let i=0;i<4;i++){const mountain=mesh(new THREE.ConeGeometry(1.8,2.9+i%2,5),[0x8fa488,0xa6b593,0xb4bea0,0x91a58a][i],-8+i*4.7,1.1,-10.3);mountain.scale.z=.48;}
 if(index===0){
  facade(-2.6,0,-7.3,5.4,2.3,2.5,0xa67750,0x59665c);facade(1.2,0,-7.7,2.7,1.8,2,0xb18355,0x5b675c);chimney(4.25,-7.35,5.25,0xa4744b);
  for(const x of [-4.5,-3.3,-2.1,-.9])window(x,1.43,-6.015,.56,.75);
  cylinder(5.9,.9,-6.7,.35,1.08,1.8,0x9b7451);box(5.9,.47,-5.82,.47,.76,.08,0x453b32);
  label('古窑民俗',-2.6,2.23,-5.93,2.2);tree(-6.5,-7,1.25);tree(7.3,-8.4,1.2);
  for(let tier=0;tier<3;tier++){box(1.3,.35+tier*.6,-6,1.7,.08,.5,0x977446);for(let j=0;j<4;j++)vase(.7+j*.4,.41+tier*.6,-5.95,.25);}for(const x of [.36,2.26])box(x,.97,-6,.09,2,.56,0x74543a);
 }else if(index===1){
  box(-1,1.4,-7.45,11.2,2.8,2.65,0xe4e3d2);box(-1,2.9,-7.45,11.65,.23,3,0x426a7d);box(-1,3.1,-7.45,10.5,.13,2.7,0x839aa1);
  for(let i=0;i<12;i++)window(-5.8+i*.83,1.51,-6.07,.65,1.55);
  for(const x of [-5.95,-3.3,.4,3.96])box(x,1.5,-5.91,.18,2.75,.32,0xece5d0);
  box(-.65,.22,-5.9,3.4,.4,.65,0xd2d6ca);box(-.65,1.15,-5.81,1.8,1.8,.04,0x446b78);label('中国陶瓷博物馆',-1,2.61,-5.87,4.6);
  cylinder(6,.27,-6.9,1,1,.54,0xe8dfca);vase(6,.53,-6.9,2.1);tree(-7.4,-8.2,1.2);
  for(const x of [-4,2.5]){box(x,.42,-5.7,.9,.8,.7,0xceccb8);vase(x,.83,-5.7,.48);}
 }else if(index===2){
  function arch(x,z,r,h,depth){
   const shape=new THREE.Shape();shape.moveTo(-r,0);shape.lineTo(-r,h);
   for(let i=0;i<=32;i++){const a=Math.PI-i/32*Math.PI;shape.lineTo(Math.cos(a)*r,h+Math.sin(a)*r);}shape.lineTo(r,0);shape.lineTo(r-.23,0);shape.lineTo(r-.23,h);
   for(let i=0;i<=32;i++){const a=i/32*Math.PI;shape.lineTo(Math.cos(a)*(r-.23),h+Math.sin(a)*(r-.23));}shape.lineTo(-r+.23,0);shape.closePath();
   mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),0xac6951,x,0,z);
   for(let i=0;i<11;i++){const a=i/10*Math.PI;const brick=box(x+Math.cos(a)*r,h+Math.sin(a)*r,z+depth+.025,.25,.12,.08,0xd1946b);brick.rotation.z=a+Math.PI/2;}
  }
  arch(-3.7,-8.6,1.65,.86,2.2);arch(.15,-8.4,1.1,.7,1.8);arch(3.05,-8.3,1.05,.65,1.65);
  for(let row=0;row<4;row++)for(let col=0;col<5-row;col++)box(5.2+col*.35,row*.28+.14,-7.25,.33,.25,1.5,0xb58365);
  for(let i=0;i<3;i++){box(-2.7+i*2.5,.01,-5.89,1.65,.06,.64,0x846954);for(const dx of [-.85,.85])box(-2.7+i*2.5+dx,.2,-5.89,.05,.4,.7,0xd8c8a0);}
  label('御窑 · 寻迹',.2,2.18,-6.4,2.5);tree(-6.9,-8.5,1.4);tree(7.6,-8.8,1.2);
 }else{
  box(-1.6,1.35,-7.5,9.5,2.7,2.7,0x9f6650);
  for(let i=0;i<5;i++){const x=-5.4+i*1.9;roof(x,2.85,-7.5,1.9,2.7,0x526a6a);window(x,1.58,-6.08,1.28,1.2);}
  for(let i=0;i<11;i++)box(-6.2+i*.9,1.4,-6.04,.12,2.8,.16,0xc88d6b);
  chimney(5.15,-7.6,5.8,0x95624a);label('陶溪川',-1.6,2.63,-6,2.55);
  for(let i=0;i<3;i++){
   const x=4.25+i*1.18;box(x,.56,-5.93,.96,1.08,.65,0xb49066);box(x,1.72,-5.93,1.06,.1,.93,[0x537e81,0xb07772,0xbb9b53][i]);for(const dx of [-.45,.45])box(x+dx,1.18,-5.93,.045,1.1,.7,0x84643f);vase(x,.99,-5.75,.42);
  }
  for(let i=0;i<9;i++){const x=-5.9+i*1.2,y=3.2-Math.sin(i/8*Math.PI)*.45;const bulb=mesh(new THREE.SphereGeometry(.07,8,8),new THREE.MeshStandardMaterial({color:0xffe5a6,emissive:0xffc361,emissiveIntensity:.8}),x,y,-5.7);}
  tree(-7.4,-7.6,1.25);tree(7.6,-8.9,1.3);
 }
 root.userData.dispose=()=>{const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(m=>{if(m.isMesh){geometries.add(m.geometry);materials.add(m.material);if(m.material.map)textures.add(m.material.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
 return root;
}
