import {createWorld} from './world.js';
import {SculptureChallenge} from './sculpture.js';
import {PLACES} from './places.js';
import {HeroPlayback} from './hero-playback.js';
import {createCarouselControls} from './carousel-controls.js';

export function createSceneCarousel(host,{onChange}={}){
 host.classList.add('scene-carousel');
 host.innerHTML='<canvas tabindex="0" aria-label="四站工坊全景，可拖动旋转"></canvas><span class="hero-hint">拖动旋转 · 悬停暂停</span>';
 const canvas=host.querySelector('canvas'),world=createWorld(canvas,{preview:true});
 const state=new SculptureChallenge({tutorial:false}),playback=new HeroPlayback(PLACES.length),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const removers=[],listen=(target,event,fn)=>{target.addEventListener(event,fn);removers.push(()=>target.removeEventListener(event,fn));};
 let active=-1,drag=null,hovered=false,focused=false,enabled=true,paused=false,disposed=false,last=0,time=0,raf=0;
 const controls=createCarouselControls(host,playback,{names:PLACES.map(p=>p.name),previous:'上一站',next:'下一站',onChange:present});
 function present(){
  if(active!==playback.index){active=playback.index;state.scene=active;world.setScene(active);world.orbit.azimuth=.46;world.placeCamera();onChange?.(active);}
  host.dataset.index=String(active);host.dataset.rotation=String(world.orbit.azimuth);canvas.style.opacity=String(playback.opacity);controls.update();
 }
 function stopDrag(){const previous=drag;drag=null;if(previous&&canvas.hasPointerCapture(previous.id))canvas.releasePointerCapture(previous.id);playback.interact();}
 listen(host,'pointerenter',e=>{if(e.pointerType==='touch')return;hovered=true;playback.interact();});
 listen(host,'pointerleave',()=>{hovered=false;playback.interact();});
 listen(host,'focusin',()=>{focused=true;playback.interact();});
 listen(host,'focusout',e=>{focused=host.contains(e.relatedTarget);stopDrag();});
 listen(canvas,'pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId);playback.interact();});
 listen(canvas,'pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;world.orbit.azimuth-=(e.clientX-drag.x)*.008;drag.x=e.clientX;world.placeCamera();playback.interact();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,event,stopDrag);
 listen(canvas,'keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();world.orbit.azimuth+=e.key==='ArrowLeft'?-.15:.15;world.placeCamera();playback.interact();});
 listen(window,'blur',()=>{stopDrag();hovered=false;last=0;});
 listen(document,'visibilitychange',()=>{last=0;if(document.hidden)stopDrag();});
 const observer=new ResizeObserver(()=>world.resize());observer.observe(canvas);
 function loop(ms){
  if(disposed)return;raf=requestAnimationFrame(loop);
  if(!enabled||document.hidden||host.offsetParent===null){last=0;return;}
  const elapsed=last?(ms-last)/1000:0,dt=Math.min(.1,elapsed);last=ms;time+=dt;
  const interacting=hovered||focused||!!drag||paused;
  playback.tick(elapsed,{paused:interacting,reduced:reduced.matches});
  present();
  if(!interacting&&!reduced.matches){world.orbit.azimuth+=dt*.06;world.placeCamera();}
  world.update(reduced.matches?0:dt,reduced.matches?0:time,state,false);
 }
 present();world.resize();raf=requestAnimationFrame(loop);
 return {
  show(index){controls.show(index);},setPaused(value){paused=!!value;playback.interact();},
  pause(){enabled=false;last=0;stopDrag();},resume(){enabled=true;last=0;},
  dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();removers.forEach(remove=>remove());world.dispose();host.replaceChildren();},
 };
}
