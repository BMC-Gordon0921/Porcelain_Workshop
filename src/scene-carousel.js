import {bindOrbitGesture} from './platform/orbit-gesture.js';
import {isDisplayRotated} from './platform/canvas-metrics.js';
import {createWorld} from './world.js';
import {SculptureChallenge,makeBlank} from './sculpture.js';
import {PLACES} from './places.js';
import {HeroPlayback} from './hero-playback.js';
import {createCarouselControls} from './carousel-controls.js';
import {WorkshopDemo} from './workshop-demo.js';

// One preview owns its world, demo clock and pending loads across both opening pages.
export function createSceneCarousel(host,{onChange,initial=0,presentation='interactive'}={}){
 const surface=document.createElement('div');surface.className='scene-carousel';
 surface.innerHTML='<canvas aria-label="四站工坊全景，可拖动旋转或双指缩放"></canvas><span class="hero-hint"><span data-help-keyboard>拖动旋转 · 工匠制瓷演示</span><span data-help-touch>单指旋转 · 双指缩放</span></span><div class="scene-load" role="status"></div><span class="demo-caption"></span>';
 host.replaceChildren(surface);
 const canvas=surface.querySelector('canvas'),status=surface.querySelector('.scene-load'),caption=surface.querySelector('.demo-caption');
 const world=createWorld(canvas,{preview:true}),state=new SculptureChallenge({tutorial:false}),playback=new HeroPlayback(PLACES.length),demo=new WorkshopDemo(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 playback.show(initial);
 const removers=[],listen=(target,event,fn)=>{target.addEventListener(event,fn);removers.push(()=>target.removeEventListener(event,fn));};
 let active=-1,hovered=false,focused=false,enabled=true,paused=false,disposed=false,last=0,raf=0,pieceStage='',loadTicket=0;
 const controls=createCarouselControls(surface,playback,{names:PLACES.map(p=>p.name),previous:'上一站',next:'下一站',onChange:present});
 async function load(index,force=false){
  const ticket=++loadTicket;
  status.hidden=false;status.textContent='正在准备工坊…';
  const success=await world.setScene(index,{force});if(disposed||ticket!==loadTicket||index!==active)return;
  if(success){status.hidden=true;}else{
   const reason=world.loadError&&world.loadError.message?String(world.loadError.message).split('\n')[0]:'';
   status.innerHTML=`<span>工坊加载失败 · ${PLACES[index].shortName}</span>${reason?`<small>${reason}</small>`:''}<button type="button">重新加载</button>`;
   status.querySelector('button').onclick=()=>load(index,true);
  }
 }
 function present(){
  if(active!==playback.index){active=playback.index;state.scene=active;demo.interact();load(active);onChange?.(active);}
  host.dataset.index=String(active);host.dataset.rotation=String(world.orbit.azimuth);controls.update();
 }
 const interactive=()=>presentation==='interactive';
 listen(surface,'pointerenter',e=>{if(interactive()&&e.pointerType!=='touch'){hovered=true;demo.interact();}});
 listen(surface,'pointerleave',()=>{if(interactive()){hovered=false;demo.interact();}});
 listen(surface,'focusin',()=>{if(interactive()){focused=true;demo.interact();}});
 listen(surface,'focusout',e=>{focused=interactive()&&surface.contains(e.relatedTarget);});
 const gesture=bindOrbitGesture(canvas,listen,{
  enabled:()=>interactive()&&enabled,
  rotate:(x,y)=>{world.orbit.azimuth-=(isDisplayRotated()?y:x)*.008;world.placeCamera();},
  zoom:world.zoomBy,
  activity:()=>demo.interact({rotate:true}),
 });
 const stopDrag=()=>gesture.clear();
 listen(canvas,'keydown',e=>{if(!interactive()||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();world.orbit.azimuth+=e.key==='ArrowLeft'?-.15:.15;world.placeCamera();demo.interact({rotate:true});});
 listen(window,'blur',()=>{hovered=false;stopDrag();last=0;});
 listen(document,'visibilitychange',()=>{last=0;if(document.hidden){hovered=false;stopDrag();}});
 const observer=new ResizeObserver(()=>world.resize());observer.observe(canvas);
 const labels={clay:'取泥',wheel:'塑形',carve:'雕刻',paint:'彩绘',kiln:'烧窑',serve:'交付'};
 function applyPresentation(){
  stopDrag();hovered=false;focused=false;last=0;
  surface.dataset.presentation=presentation;host.dataset.presentation=presentation;
  surface.inert=!interactive();canvas.tabIndex=interactive()?0:-1;
  if(interactive())surface.removeAttribute('aria-hidden');else surface.setAttribute('aria-hidden','true');
  world.renderer.setPixelRatio(Math.min(devicePixelRatio,interactive()?1.5:1));world.resize();
 }
 function loop(ms){
  if(disposed)return;raf=requestAnimationFrame(loop);
  if(!enabled||document.hidden||surface.offsetParent===null){last=0;return;}
  if(!interactive()&&last&&ms-last<1000/30)return;
  const dt=last?Math.min(.1,(ms-last)/1000):0;last=ms;
  let frozen=paused||world.loading||!!world.loadError;
  if(demo.tick(dt,{paused:frozen,blocked:interactive()&&(hovered||focused||gesture.active)})){if(interactive()){playback.show(active+1);present();}frozen=true;}
  const frame=demo.frame,station=world.stations.find(s=>s.id===frame.step);world.setDemoFrame(reduced.matches?{...frame,x:station.approach[0],z:station.approach[1],time:0,moving:false}:frame);
  const stage=['clay','wheel','carve'].includes(frame.step)?frame.step:'paint';
  if(pieceStage!==stage){pieceStage=stage;state.piece.pixels=stage==='clay'?makeBlank():stage==='paint'?state.target.slice():state.target.map(v=>v?1:0);state.piece.revision++;}
  state.hasClay=frame.hasClay;state.kiln=frame.firing?{heat:frame.heat}:null;state.kilnPaused=frozen;
  if(!frozen&&!gesture.active&&demo.rotationIdle>=5&&!reduced.matches){world.orbit.azimuth+=dt*.06;world.placeCamera();}
  if(caption.dataset.step!==frame.step){caption.dataset.step=frame.step;caption.textContent='工匠演示 · '+labels[frame.step];}
  host.dataset.demoStep=frame.step;host.dataset.demoTime=String(demo.time);host.dataset.rotation=String(world.orbit.azimuth);host.dataset.customers=String(world.customerCount);host.dataset.paused=String(paused);
  world.update(frozen||reduced.matches?0:dt,reduced.matches?0:demo.time,state,false);
 }
 applyPresentation();present();raf=requestAnimationFrame(loop);
 return {
  show(index){if(interactive())controls.show(index);},
  mount(nextHost,{presentation:nextPresentation=presentation}={}){
   if(disposed)return;
   stopDrag();
   const data={...host.dataset};
   for(const key of ['index','rotation','demoStep','demoTime','customers','paused','presentation'])delete host.dataset[key];
   host=nextHost;host.replaceChildren(surface);Object.assign(host.dataset,data);
   presentation=nextPresentation;applyPresentation();present();
  },
  setPaused(value){paused=!!value;demo.interact();},
  pause(){enabled=false;last=0;stopDrag();},resume(){enabled=true;last=0;},
  dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();removers.forEach(remove=>remove());world.dispose();surface.remove();},
 };
}
