import {mobileGuidance} from './platform/mobile-guidance.js';
const thoughts={clay:'再揉一块好瓷泥。',wheel:'慢慢推压，轮廓会更圆润。',carve:'细节里藏着手艺。',paint:'给它添一抹釉色。',kiln:'让窑火慢慢成就它。',serve:'这件作品可以交付了。'};
const symbols={clay:'◌',wheel:'✋',carve:'✧',paint:'🖌',kiln:'♨',serve:'✦'};
export function createGuidance(host,world){
 const layer=document.createElement('div');layer.className='guidance-layer';
 layer.innerHTML='<div class="next-target hidden"><svg viewBox="0 0 60 76" aria-hidden="true"><path d="M21 3h18v35h17L30 71 4 38h17z" fill="#ffc25f" stroke="#875822" stroke-width="3"/><path d="M30 7v55L10 41h14V7" fill="#ffe5a2"/></svg><b></b></div><div class="station-gate hidden" role="status"></div><div class="thought-bubble hidden" aria-hidden="true"></div><div class="world-loading hidden" role="status"></div>';
 host.append(layer);const target=layer.querySelector('.next-target'),gate=layer.querySelector('.station-gate'),thought=layer.querySelector('.thought-bubble'),loading=layer.querySelector('.world-loading');
 let idle=0,nextThought=8,forced=null,forceLeft=0,lastGate='';
 const mobileHint=document.getElementById('mobile-guidance');
 const place=(el,point,margin=100)=>{const width=host.clientWidth,height=host.clientHeight;el.style.left=`${Math.max(Math.min(margin,width/2),Math.min(width-margin,point.x))}px`;el.style.top=`${Math.max(100,Math.min(height-110,point.y))}px`;};
 return {deny(access){forced=access;forceLeft=4;gate.classList.remove('attention');void gate.offsetWidth;gate.classList.add('attention');},update(dt,{state,playing,nearest,moving,started,mobile=false,tutorialStep=null,action=''}){
  loading.classList.toggle('hidden',!started||!world.loading&&!world.loadError);
  const loadKey=world.loadError?'error':world.loading?'loading':'';
  if(loading.dataset.status!==loadKey){
   loading.dataset.status=loadKey;
   if(loadKey==='error'){
    const reason=world.loadError&&world.loadError.message?String(world.loadError.message).split('\n')[0]:'';
    loading.innerHTML=`<span>工坊加载失败${reason?' · '+reason:''}</span><button type="button">重新加载</button>`;
   }else loading.innerHTML='正在准备工坊…';
   loading.querySelector('button')?.addEventListener('click',()=>world.setScene(state.scene,{force:true}));
  }
  forceLeft=Math.max(0,forceLeft-dt);if(!forceLeft)forced=null;
  const access=nearest?state.stationAccess(nearest.id):null,blocked=access&&!access.allowed?access:forced;
  const next=world.stations.find(s=>s.id===(blocked?.next||state.nextStation()));
  if(mobile){
   const point=playing&&next?world.project(next.x,next.labelY,next.z):null;
   const visible=point&&point.x>=16&&point.x<=host.clientWidth-16&&point.y>=32&&point.y<=host.clientHeight-12;
   target.classList.toggle('hidden',!visible);
   if(visible){target.style.left=point.x+'px';target.style.top=point.y+'px';}
   gate.classList.add('hidden');thought.classList.add('hidden');
   // 教程文案由教练卡统一展示，这里只留「这一步为什么进不去」的阻断理由。
   const message=playing?(blocked&&nearest?mobileGuidance({blocked:blocked.reason,action,next:next?.name}):''):'';
   if(mobileHint.dataset.message!==message){mobileHint.dataset.message=message;mobileHint.textContent=message;}
   mobileHint.classList.toggle('hidden',!message);
   return;
  }
  mobileHint.classList.add('hidden');
  // 站在目标站旁边时不再画箭头：交互卡已经在说同一件事。
  const showTarget=playing&&!!next&&!nearest;
  target.classList.toggle('hidden',!showTarget);
  if(showTarget){place(target,world.project(next.x,Math.max(next.labelY,2.3)+1.1,next.z),100);const text='下一步 · '+(tutorialStep?tutorialStep.title:next.name);if(target.dataset.label!==text){target.dataset.label=text;target.querySelector('b').textContent=text;}}
  // 新手引导的拒绝理由交给箭头标签，不再额外弹一条🔒。
  const gateBlocked=blocked&&blocked.kind!=='tutorial';
  gate.classList.toggle('hidden',!playing||!gateBlocked);
  if(playing&&gateBlocked){const text='🔒 暂不可用 · '+blocked.reason;if(lastGate!==text){lastGate=text;gate.textContent=text;}}
  if(!playing||moving||state.tutorialStep||blocked){idle=0;nextThought=8;thought.classList.add('hidden');return;}
  idle+=dt;if(idle>=nextThought+4)nextThought=idle+15;
  const visible=idle>=nextThought;thought.classList.toggle('hidden',!visible);
  if(visible){const id=state.nextStation(),text=(symbols[id]||'✦')+' '+(thoughts[id]||'下一站会有什么新的灵感呢？');if(thought.dataset.text!==text){thought.dataset.text=text;thought.textContent=text;}const p=world.player.group.position;place(thought,world.project(p.x,2.8,p.z),120);}
 },dispose(){layer.remove();}};
}
