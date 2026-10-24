import * as THREE from 'three';
import {SIZE,PALETTE} from './sculpture.js';
export function reliefSculpture(pixels) {
 const positions=[],colors=[],normals=[];const palette=PALETTE.map(c=>c?new THREE.Color(c):null),edge=new THREE.Color('#b6b2a6');const step=1.12/SIZE;
 function quad(a,b,c,d,color,normal){for(const v of [a,b,c,a,c,d]){positions.push(...v);colors.push(color.r,color.g,color.b);normals.push(...normal);}}
 const has=(x,y)=>x>=0&&x<SIZE&&y>=0&&y<SIZE&&pixels[y*SIZE+x];
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++) {const value=has(x,y);if(!value)continue;const l=(x-SIZE/2)*step,r=l+step,t=(SIZE-y)*step,b=t-step,f=.115,k=-.115;
  quad([l,b,f],[r,b,f],[r,t,f],[l,t,f],palette[value],[0,0,1]);quad([r,b,k],[l,b,k],[l,t,k],[r,t,k],edge,[0,0,-1]);
  if(!has(x-1,y))quad([l,b,k],[l,b,f],[l,t,f],[l,t,k],edge,[-1,0,0]);
  if(!has(x+1,y))quad([r,b,f],[r,b,k],[r,t,k],[r,t,f],edge,[1,0,0]);
  if(!has(x,y-1))quad([l,t,f],[r,t,f],[r,t,k],[l,t,k],palette[value],[0,1,0]);
  if(!has(x,y+1))quad([l,b,k],[r,b,k],[r,b,f],[l,b,f],edge,[0,-1,0]);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const g=new THREE.Group(),m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.32}));m.castShadow=true;m.receiveShadow=true;m.userData.customRelief=true;g.add(m);return g;
}
