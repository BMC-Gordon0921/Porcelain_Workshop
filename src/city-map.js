import {CITY_MAP,PLACES,ROUTE_SEGMENTS,OPENING_DURATION,INTRO_DURATION,INTRO_LINES,openingFrame} from './places.js';
import logoLockup from './assets/logo-lockup.png';

export function mapMarkup({selected=0,completed=0,mode='atlas',from=null}={}){
 return `<div class="city-map-art" data-map-mode="${mode}"><img class="city-map-image" src="${CITY_MAP}" alt="景德镇手绘地图：依次探索古窑民俗博览区、中国陶瓷博物馆、御窑厂国家考古遗址公园、陶溪川文创街区" draggable="false"/><svg class="city-route" viewBox="0 0 1024 1024" aria-hidden="true">${ROUTE_SEGMENTS.map((path,i)=>`<path class="route-halo" d="${path}"/><path class="route-line ${i<selected?'route-done':''} ${mode==='travel'&&i===from?'route-travel':''}" data-route="${i}" pathLength="1" d="${path}"/>`).join('')}</svg>${PLACES.map((place,i)=>`<button class="city-pin ${i===selected?'selected':''} ${i<completed?'collected':''}" data-place="${i}" style="left:${place.point[0]/10.24}%;top:${place.point[1]/10.24}%;--pin-color:${place.color}" aria-label="第 ${i+1} 站：${place.name}" aria-pressed="${i===selected}"><span>${i<completed?'✓':i+1}</span></button>`).join('')}<div class="map-paper-shine" aria-hidden="true"></div></div>`;
}

export function createOpening(host,{getState,onStart,onNewGame,onPorcelain}){
 let raf=0,last=0,elapsed=0,paused=false,stopped=true,chapter=-1,stage='intro',introElapsed=0,narrative=-1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 host.className='opening-screen';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','景德镇瓷器之旅开场');
 function render(){
  const state=getState();
  host.innerHTML=`<header class="opening-header"><div class="opening-brand"><img class="opening-logo" src="${logoLockup}" alt="terra · little clay workshop"/><span>景德镇 · 瓷器之旅</span></div><button class="opening-lang" data-lang-toggle type="button" aria-label="切换语言">EN</button><button class="opening-skip" id="skip-opening">跳过动画 <span>↗</span></button></header><section class="city-prologue"><div class="prologue-landscape" aria-hidden="true"><i></i><i></i><i></i></div><div class="prologue-copy"><span class="prologue-kicker">江西 · 景德镇</span><h1>景德镇</h1><h2>千年瓷都 · 窑火不息</h2><p id="prologue-text" aria-live="polite"></p><button id="unfold-map" class="prologue-unfold">进入地图介绍 <span>→</span></button><div class="prologue-beats">${INTRO_LINES.map((_,i)=>`<i data-intro-beat="${i}"></i>`).join('')}</div></div><div class="prologue-porcelain"><span class="porcelain-halo"></span><div class="prologue-carousel" id="prologue-carousel"></div><div class="porcelain-seal">瓷<br/>韵</div><span class="porcelain-caption">一抔泥，一炉火，一城瓷。</span></div></section><div class="opening-map-phase" inert><div class="opening-layout"><section class="opening-copy"><div class="opening-kicker"><span></span>千年瓷都 · 一城窑火</div><h1>循着窑火，<br/>走进<span>景德镇。</span></h1><p class="opening-lead">一张地图，四处瓷韵。<br/>从古窑到陶溪川，把城市的故事<br class="desktop-break"/>做成你亲手收藏的四只瓷碗。</p><div class="opening-chapter" aria-live="polite"><span id="opening-chapter-number">01</span><div><small id="opening-chapter-tag"></small><h2 id="opening-chapter-name"></h2><p id="opening-chapter-story"></p></div></div><div class="opening-actions"><button class="opening-start" id="start-button">${state.completed?'重温景德镇 · 查看藏品':state.scene>0||state.hasClay||state.level>0||state.money>0?'继续旅程 · '+PLACES[state.scene].shortName:'从古窑出发'} <span>→</span></button><button class="opening-replay" id="replay-opening" aria-label="重播开场动画">↺ 重播</button></div><div class="opening-rules"><span>每站 5 关</span><span>80% 通关</span><span>400 币兑换贴画</span></div>${state.scene>0||state.money>0||state.hasClay||state.completed?'<button class="opening-reset" id="opening-new-game">重新开始旅程</button>':''}</section><section class="opening-map-section" aria-label="四站探索路线"><div class="opening-map-border">${mapMarkup({selected:0,completed:state.collection.length,mode:'opening'})}</div><div class="opening-map-caption"><span>景德镇 · 手作游历图</span><span>探索路线 01—04</span></div></section></div><footer class="opening-footer"><div class="opening-timeline">${PLACES.map((place,i)=>`<button data-chapter="${i}"><span>0${i+1}</span><b>${place.shortName}</b><i></i></button>`).join('')}</div><button class="opening-pause" id="pause-opening" aria-label="暂停开场动画">Ⅱ 暂停</button><span class="opening-footnote">山水之间，人文与烟火。</span></footer></div>`;
  host.querySelector('#start-button').onclick=()=>{stop();host.classList.add('hidden');onStart();};
  host.querySelector('#skip-opening').onclick=skip;host.querySelector('#unfold-map').onclick=()=>unfold();
  host.querySelector('#replay-opening').onclick=()=>show(true);
  host.querySelector('#pause-opening').onclick=()=>{if(elapsed>=OPENING_DURATION){show(true);return;}paused=!paused;host.dataset.introState=paused?'paused':'playing';host.querySelector('#pause-opening').textContent=paused?'▷ 继续':'Ⅱ 暂停';host.querySelector('#pause-opening').setAttribute('aria-label',paused?'继续开场动画':'暂停开场动画');run();};
  host.querySelectorAll('[data-chapter],[data-place]').forEach(b=>b.onclick=()=>{elapsed=(Number(b.dataset.chapter??b.dataset.place)+.02)/4*OPENING_DURATION;chapter=-1;paused=true;draw();host.dataset.introState='paused';host.querySelector('#pause-opening').textContent='▷ 继续';run();});
  host.querySelector('#opening-new-game')?.addEventListener('click',()=>{stop();host.classList.add('hidden');onNewGame();});
  onPorcelain?.(host.querySelector('#prologue-carousel'));
 }
 function draw(){
  host.dataset.openingStage=stage;
  if(stage==='intro'){
   host.dataset.introState='introducing';const beat=Math.min(2,Math.floor(introElapsed/INTRO_DURATION*3));
   if(narrative!==beat){narrative=beat;host.querySelector('#prologue-text').textContent=INTRO_LINES[beat];host.querySelectorAll('[data-intro-beat]').forEach((b,i)=>b.classList.toggle('active',i<=beat));}
   return;
  }
  const frame=openingFrame(elapsed);host.style.setProperty('--intro-progress',frame.progress);host.dataset.chapter=String(frame.chapter);host.dataset.introState=frame.complete?'complete':paused?'paused':'playing';
  host.querySelectorAll('[data-route]').forEach(p=>{const i=Number(p.dataset.route);p.style.strokeDashoffset=String(1-Math.min(1,Math.max(0,frame.progress*4-i-1)));});
  host.querySelectorAll('[data-chapter]').forEach((b,i)=>{b.classList.toggle('active',i===frame.chapter);b.classList.toggle('seen',i<frame.chapter||frame.complete);b.style.setProperty('--chapter-progress',Math.min(1,Math.max(0,frame.progress*4-i)));});
  if(chapter!==frame.chapter){chapter=frame.chapter;const place=PLACES[chapter];host.querySelector('#opening-chapter-number').textContent=`0${chapter+1}`;host.querySelector('#opening-chapter-tag').textContent=place.chapter;host.querySelector('#opening-chapter-name').textContent=place.name;host.querySelector('#opening-chapter-story').textContent=place.story;host.querySelectorAll('[data-place]').forEach((b,i)=>{b.classList.toggle('selected',i===chapter);b.setAttribute('aria-pressed',String(i===chapter));});}
  if(frame.complete){host.querySelector('#skip-opening').textContent='路线已展开 ✓';host.querySelector('#pause-opening').textContent='↺ 重播';host.querySelector('#pause-opening').setAttribute('aria-label','重播开场动画');}
 }
 function tick(time){
  if(stopped)return;const dt=last&&!paused&&!document.hidden?Math.min(80,time-last):0;last=time;
  if(stage==='intro'){introElapsed=Math.min(INTRO_DURATION,introElapsed+dt);}else elapsed+=dt;
  draw();if(stage==='intro'||elapsed<OPENING_DURATION)raf=requestAnimationFrame(tick);
 }
 function run(){cancelAnimationFrame(raf);last=0;if(!stopped)raf=requestAnimationFrame(tick);}
 function stop(){stopped=true;cancelAnimationFrame(raf);}
 function unfold(auto=false){
  host.scrollTop=0;stage='map';elapsed=reduced.matches?OPENING_DURATION:0;chapter=-1;paused=false;
  host.querySelector('.city-prologue').inert=true;host.querySelector('.opening-map-phase').inert=false;
  host.querySelector('#skip-opening').textContent='跳过路线动画 ↗';draw();if(!auto&&elapsed<OPENING_DURATION)run();
 }
 function skip(){if(stage==='intro'){stop();host.classList.add('hidden');onStart();return;}elapsed=OPENING_DURATION;paused=false;draw();cancelAnimationFrame(raf);}
 function show(animate=true){stop();elapsed=0;introElapsed=0;last=0;chapter=-1;narrative=-1;stage='intro';paused=false;stopped=false;render();host.classList.remove('hidden');host.scrollTop=0;host.querySelector('#skip-opening').textContent='跳过介绍，进入工坊 ↗';draw();if(animate&&!reduced.matches)run();}
 show(true);return {show,stop,skip};
}

export function createCityMap(host,{state,onContinue,onReplay,from=null}){
 const traveling=from!==null;
 let selected=state.scene;
 host.innerHTML=`<div class="atlas-layout ${traveling?'atlas-travel':''}"><div class="atlas-map-column">${mapMarkup({selected,completed:state.collection.length,mode:traveling?'travel':'atlas',from})}<p class="atlas-caption">根据景德镇手绘地图展开的游戏路线 · 点击标记查看各站</p></div><section class="atlas-detail"><span class="atlas-eyebrow">${traveling?'一件瓷器完成 · 新的一站启程':'瓷都游历手记'}</span><div class="atlas-place-details"></div><div class="atlas-passport">${PLACES.map((p,i)=>`<span class="${i<state.collection.length?'stamped':''}"><b>${p.stamp}</b><small>${i<state.collection.length?'已收藏':'待收集'}</small></span>`).join('')}</div><button class="primary-button" id="${traveling?'arrive-scene':'map-continue'}">${traveling?'抵达 '+PLACES[state.scene].shortName:'返回当前站'} <span>→</span></button>${traveling?'':'<button class="atlas-replay" id="map-replay-opening">重播地图开场 ↗</button>'}<small class="atlas-rule">完成本站五关，购买并贴好贴画，才能开启下一站。</small></section></div>`;
 const detail=host.querySelector('.atlas-place-details');
 const render=()=>{const p=PLACES[selected],owned=selected<state.collection.length;detail.innerHTML=`<div class="atlas-place-number">0${selected+1}<span> / 04</span></div><h3>${p.name}</h3><span class="atlas-place-tag">${p.tag}</span><p>${traveling?p.arrival:p.story}</p><div class="atlas-landmark-note"><small>这一站的景致</small><span>${p.architecture}</span></div><div class="atlas-sticker"><small>纪念贴画</small><b>${p.sticker}</b><span>${owned?'✓ 已收藏':selected===state.scene?`当前站 · ${state.scenePassed}/5 关`:selected>state.scene?'尚未抵达 · 先完成前一站':'已走过'}</span></div>`;host.querySelectorAll('[data-place]').forEach((b,i)=>{b.classList.toggle('selected',i===selected);b.setAttribute('aria-pressed',String(i===selected));});};
 host.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.place);render();});render();
 host.querySelector(traveling?'#arrive-scene':'#map-continue').onclick=onContinue;
 host.querySelector('#map-replay-opening')?.addEventListener('click',onReplay);
 return {dispose(){host.replaceChildren();}};
}
