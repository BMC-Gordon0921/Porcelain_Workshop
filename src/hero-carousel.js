import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {bowlModel} from './decals.js';
import {SCENES} from './campaign.js';
import {HeroPlayback} from './hero-playback.js';
import {createCarouselControls} from './carousel-controls.js';

const STORIES=[
 '钴蓝花朵与舒展藤蔓绕碗而生，呈现青花瓷清雅的韵味。',
 '淡青白釉映衬米粒状花纹，玲珑瓷在光下透出温润柔光。',
 '金黄、朱红与深紫交融，流淌的釉色记录窑火的变化。',
 '粉色花瓣、纤细叶脉与嫩绿花萼，勾勒粉彩瓷的柔美。',
];

export function createHeroCarousel(host){
 if(!host)return null;
 host.classList.add('hero-carousel');
 host.innerHTML='<canvas class="hero-canvas" tabindex="0" aria-label="四件成品瓷碗，可拖动旋转，悬停查看简介"></canvas><div class="hero-caption" aria-live="polite"></div><span class="hero-hint">拖动旋转 · 悬停查看</span>';
 const canvas=host.querySelector('canvas'),caption=host.querySelector('.hero-caption');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.1,60);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);
 scene.environment=env.texture;scene.environmentIntensity=.72;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xfbfdff,0x8d9096,.9));
 const key=new THREE.DirectionalLight(0xfff6e6,1.75);key.position.set(-3.4,5.6,4.2);scene.add(key);
 const rim=new THREE.DirectionalLight(0xdfe9ff,.85);rim.position.set(3.2,2.4,-4.6);scene.add(rim);
 const bowls=SCENES.map((_,index)=>{const bowl=bowlModel(index,true);bowl.visible=index===0;scene.add(bowl);return bowl;});
 const playback=new HeroPlayback(bowls.length),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const controls=createCarouselControls(host,playback,{names:SCENES.map(s=>s.product),onChange:()=>present()});
 let dragging=null,hovered=false,focused=false,enabled=true,disposed=false,last=0,raf=0,active=-1;
 const removers=[];
 const listen=(target,event,fn,options)=>{target.addEventListener(event,fn,options);removers.push(()=>target.removeEventListener(event,fn,options));};
 function present(){
  if(active!==playback.index){
   active=playback.index;bowls.forEach((b,i)=>{b.visible=i===active;});
   caption.innerHTML=`<span class="hero-index">0${active+1}</span><div><b>${SCENES[active].product}</b><small>${SCENES[active].decal}</small><p>${STORIES[active]}</p></div>`;
   host.dataset.index=String(active);caption.dataset.index=String(active);
  }
  host.classList.toggle('is-reading',hovered||focused||!!dragging);
  host.dataset.rotation=String(bowls[active].rotation.y);host.dataset.visibleCount='1';
  canvas.style.opacity=String(playback.opacity);
  controls.update();
 }
 function resize(){
  const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;
  renderer.setSize(width,height,false);camera.aspect=width/height;
  const distance=6.4/Math.min(1,camera.aspect/1.3);camera.position.set(0,distance*.29,distance);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
 }
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const stopDrag=()=>{const drag=dragging;dragging=null;canvas.classList.remove('is-dragging');if(drag&&canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id);if(drag)playback.interact();};
 listen(host,'pointerenter',e=>{if(e.pointerType==='touch')return;hovered=true;playback.interact();});
 listen(host,'pointerleave',()=>{hovered=false;playback.interact();});
 listen(host,'focusin',()=>{focused=true;playback.interact();});
 listen(host,'focusout',e=>{focused=host.contains(e.relatedTarget);stopDrag();playback.interact();});
 listen(canvas,'pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;e.preventDefault();dragging={id:e.pointerId,x:e.clientX};playback.interact();canvas.setPointerCapture(e.pointerId);canvas.classList.add('is-dragging');});
 listen(canvas,'pointermove',e=>{if(!dragging||e.pointerId!==dragging.id)return;bowls[playback.index].rotation.y+=(e.clientX-dragging.x)*.01;dragging.x=e.clientX;playback.interact();});
 listen(canvas,'pointerup',stopDrag);listen(canvas,'pointercancel',stopDrag);listen(canvas,'lostpointercapture',stopDrag);
 listen(canvas,'keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();bowls[playback.index].rotation.y+=e.key==='ArrowLeft'?-.15:.15;playback.interact();});
 listen(window,'blur',()=>{hovered=false;stopDrag();last=0;});
 listen(document,'visibilitychange',()=>{last=0;if(document.hidden)stopDrag();});
 function loop(ms){
  if(disposed)return;raf=requestAnimationFrame(loop);
  if(!enabled||document.hidden||host.offsetParent===null){last=0;return;}
  const dt=last?(ms-last)/1000:0;last=ms;
  const interacting=hovered||focused||!!dragging;
  playback.tick(dt,{paused:interacting,reduced:reduced.matches});
  if(!interacting&&!reduced.matches)bowls[playback.index].rotation.y+=Math.min(dt,.1)*.16;
  present();renderer.render(scene,camera);
 }
 present();raf=requestAnimationFrame(loop);
 return {
  pause(){enabled=false;last=0;stopDrag();},resume(){enabled=true;last=0;},show(index){playback.show(index);present();},
  dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();removers.forEach(remove=>remove());const materials=new Set();bowls.forEach(b=>b.traverse(m=>{if(m.isMesh){m.geometry.dispose();materials.add(m.material);}}));materials.forEach(m=>m.dispose());env.dispose();renderer.dispose();renderer.forceContextLoss();host.replaceChildren();},
 };
}
