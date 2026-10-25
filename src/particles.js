import * as THREE from 'three';
// A small Three.js port of the Reactbits "Particles" idea: GPU point sprites that
// drift upward, fade at the edges and twinkle without per-particle CPU work.
const VERT = `
attribute float aSeed;
uniform float uTime,uRise,uSpread,uSize,uActive,uFadeIn;
varying float vLife,vFade;
void main(){
 float life=fract(aSeed+uTime*.17);
 vec3 p=position;
 p.y+=life*uRise;
 p.x+=sin(aSeed*12.9898+uTime*.8)*uSpread*life;
 p.z+=cos(aSeed*78.233+uTime*.6)*uSpread*life;
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=uSize*(.62+.7*fract(aSeed*37.0))*(.72+.5*life);
 vLife=life;
 vFade=smoothstep(0.,uFadeIn,life)*(1.-smoothstep(.6,1.,life));
}`;
const FRAG = `
uniform vec3 uColor,uColor2;
uniform float uOpacity,uActive;
varying float vLife,vFade;
void main(){
 vec2 d=gl_PointCoord-.5;
 if(dot(d,d)>.25)discard;
 float soft=smoothstep(.5,.1,length(d));
 vec3 col=mix(uColor2,uColor,clamp(length(d)*1.6,0.,1.));
 gl_FragColor=vec4(col,soft*vFade*uOpacity*uActive);
}`;
export function createParticleField({
 count=120,color=0xffffff,color2=0xffe6b0,size=16,rise=3,spread=.5,
 opacity=.6,blending=THREE.AdditiveBlending,radius=.3,height=0,startActive=1,fadeIn=.12,
}={}){
 const positions=new Float32Array(count*3),seeds=new Float32Array(count);
 for(let i=0;i<count;i++){
  const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*radius;
  positions[i*3]=Math.cos(a)*r;positions[i*3+1]=Math.random()*height;positions[i*3+2]=Math.sin(a)*r;
  seeds[i]=Math.random();
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
 const material=new THREE.ShaderMaterial({
  vertexShader:VERT,fragmentShader:FRAG,transparent:true,depthWrite:false,blending,
  uniforms:{
   uTime:{value:Math.random()*10},uRise:{value:rise},uSpread:{value:spread},uSize:{value:size},
   uColor:{value:new THREE.Color(color)},uColor2:{value:new THREE.Color(color2)},
   uOpacity:{value:opacity},uActive:{value:1},uFadeIn:{value:fadeIn},
  },
 });
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=2;
 let target=startActive,active=startActive;
 return {
  points,
  update(dt,intensity=1){
   target=THREE.MathUtils.clamp(intensity,0,1);
   active+=(target-active)*Math.min(1,dt*4);
   material.uniforms.uActive.value=active;
   material.uniforms.uTime.value+=dt;
   points.visible=active>.01;
  },
  dispose(){geometry.dispose();material.dispose();},
 };
}
