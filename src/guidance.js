const thoughts={clay:'再揉一块好瓷泥。',wheel:'慢慢推压，轮廓会更圆润。',carve:'细节里藏着手艺。',paint:'给它添一抹青花。',kiln:'让窑火慢慢成就它。',serve:'这件作品可以交付了。'};
const symbols={clay:'◌',wheel:'✋',carve:'✧',paint:'🖌',kiln:'♨',serve:'✦'};
export function createGuidance(host,world){
 const layer=document.createElement('div');layer.className='guidance-layer';
 layer.innerHTML='<div class="next-target hidden"><svg viewBox="0 0 60 76" aria-hidden="true"><path d="M21 3h18v35h17L30 71 4 38h17z" fill="#ffc25f" stroke="#875822" stroke-width="3"/><path d="M30 7v55L10 41h14V7" fill="#ffe5a2"/></svg><b></b></div><div class="station-gate hidden" role="status"></div><div class="thought-bubble hidden" aria-hidden="true"></div><div class="world-loading hidden" role="status"></div>';
 host.append(layer);const target=layer.querySelector('.next-target'),gate=layer.querySelector('.station-gate'),thought=layer.querySelector('.thought-bubble'),loading=layer.querySelector('.world-loading');
 let idle=0,nextThought=8,forced=null,forceLeft=0,lastGate='';
 const place=(el,point,margin=100)=>{const width=host.clientWidth,height=host.clientHeight;el.style.left=`${Math.max(Math.min(margin,width/2),Math.min(width-margin,point.x))}px`;el.style.top=`${Math.max(100,Math.min(height-110,point.y))}px`;};
 return {deny(access){forced=access;forceLeft=4;gate.classList.remove('attention');void gate.offsetWidth;gate.classList.add('attention');},update(dt,{state,playing,nearest,moving,started}){
  loading.classList.toggle('hidden',!started||!world.loading&&!world.loadError);
  const loadKey=world.loadError?'error':world.loading?'loading':'';
  if(loading.dataset.status!==loadKey){loading.dataset.status=loadKey;loading.innerHTML=loadKey==='error'?'<span>工坊加载失败</span><button type="button">重新加载</button>':'正在准备工坊…';loading.querySelector('button')?.addEventListener('click',()=>world.setScene(state.scene,{force:true}));}
  forceLeft=Math.max(0,forceLeft-dt);if(!forceLeft)forced=null;
  const access=nearest?state.stationAccess(nearest.id):null,blocked=access&&!access.allowed?access:forced;
  const next=world.stations.find(s=>s.id===(blocked?.next||state.nextStation()));
  target.classList.toggle('hidden',!playing||!next);
  if(playing&&next){place(target,world.project(next.x,Math.max(next.labelY,2.3)+1.1,next.z),100);const text='下一步 · '+next.name;if(target.dataset.label!==text){target.dataset.label=text;target.querySelector('b').textContent=text;}}
  gate.classList.toggle('hidden',!playing||!blocked);
  if(playing&&blocked){const text='🔒 暂不可用 · '+blocked.reason;if(lastGate!==text){lastGate=text;gate.textContent=text;}}
  if(!playing||moving||state.tutorialStep||blocked){idle=0;nextThought=8;thought.classList.add('hidden');return;}
  idle+=dt;if(idle>=nextThought+4)nextThought=idle+15;
  const visible=idle>=nextThought;thought.classList.toggle('hidden',!visible);
  if(visible){const id=state.nextStation(),text=(symbols[id]||'✦')+' '+(thoughts[id]||'下一站会有什么新的灵感呢？');if(thought.dataset.text!==text){thought.dataset.text=text;thought.textContent=text;}const p=world.player.group.position;place(thought,world.project(p.x,2.8,p.z),120);}
 },dispose(){layer.remove();}};
}
