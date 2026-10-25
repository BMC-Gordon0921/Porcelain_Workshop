import {CITY_MAP,PLACES,ROUTE_SEGMENTS,OPENING_DURATION,INTRO_DURATION,INTRO_LINES,openingFrame} from './places.js';
import logoLockup from './assets/logo-lockup.png';
import logoMark from './assets/logo-mark.png';
import {createSceneCarousel} from './scene-carousel.js';
import {ORDERS_PER_SCENE} from './campaign.js';
import {createOpeningTitle} from './opening-title.js';

export function mapMarkup({selected=0,completed=[],mode='atlas',from=null}={}){
 const owned=Array.isArray(completed)?completed:Array.from({length:completed},(_,i)=>i);
 return `<div class="city-map-art" data-map-mode="${mode}"><img class="city-map-image" src="${CITY_MAP}" alt="景德镇四处工坊地图" draggable="false"/>${PLACES.map((place,i)=>`<button class="city-pin ${i===selected?'selected':''} ${owned.includes(i)?'collected':''} ${i===from?'departure':''}" data-place="${i}" style="left:${place.point[0]/10.24}%;top:${place.point[1]/10.24}%;--pin-color:${place.color}" aria-label="${place.name}" aria-pressed="${i===selected}"><span>${owned.includes(i)?'✓':i+1}</span></button>`).join('')}<div class="map-paper-shine" aria-hidden="true"></div></div>`;
}
export function sceneRequirementsMarkup(state){
 if(!state.startedJourney)return '<p class="scene-gate unlocked">任选一处工坊，开启你的制瓷旅程。</p>';
 const r=state.sceneRequirements();
 return `<div class="scene-gate ${r.applied?'unlocked':'locked'}"><b>${r.applied?'✓ 可以选择下一处工坊':'🔒 完成本站后可切换工坊'}</b><ul><li class="${r.orders===r.total?'met':''}">${r.orders===r.total?'✓':'○'} 正式订单 ${r.orders} / ${r.total}</li><li class="${r.purchased?'met':''}">${r.purchased?'✓ 已购买贴画':'○ 贴画 400 币'+(r.missingCoins?' · 还差 '+r.missingCoins+' 币':' · 金币已足够')}</li><li class="${r.applied?'met':''}">${r.applied?'✓ 已完成贴花':'○ '+(r.purchased?'已购买，请继续贴花':'购买后完成贴花')}</li></ul></div>`;
}

export function createOpening(host,{getState,onStart,onNewGame,onPorcelain}){
 let selected=0,busy=false;
 let raf=0,last=0,introElapsed=0,narrative=-1,stage='intro',stopped=true,sceneCarousel=null,paused=false,title=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 host.className='opening-screen';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','景德镇瓷器之旅开场');
 function render(){
  const state=getState();
  host.innerHTML=`<div class="opening-background" id="opening-background" aria-hidden="true"></div><header class="opening-header"><button class="opening-brand" type="button" aria-label="返回首页"><img class="opening-mark" src="${logoMark}" alt=""/><img class="opening-logo" src="${logoLockup}" alt="terra · little clay workshop"/><span>景德镇 · 瓷器之旅</span></button><button class="icon-button opening-sound" data-sound-toggle type="button" aria-label="关闭声音"></button><button class="opening-lang" data-lang-toggle type="button" aria-label="切换语言">EN</button><button class="opening-skip" id="skip-opening">跳过介绍，进入工坊 ↗</button></header><section class="city-prologue"><div class="prologue-copy"><span class="prologue-kicker">江西 · 景德镇</span><h1 class="opening-title" data-no-i18n>开窑啦！</h1><h2>千年瓷都 · 窑火不息</h2><p id="prologue-text" aria-live="polite"></p><button id="unfold-map" class="prologue-unfold">进入地图介绍 <span>→</span></button><div class="prologue-beats">${INTRO_LINES.map((_,i)=>`<i data-intro-beat="${i}"></i>`).join('')}</div></div><div class="prologue-porcelain"><span class="porcelain-halo"></span><div class="prologue-carousel" id="prologue-carousel"></div><div class="porcelain-seal">瓷<br/>韵</div><span class="porcelain-caption">一抔泥，一炉火，一城瓷。</span></div><button class="opening-pause background-pause" id="pause-background" type="button" aria-pressed="false">Ⅱ 暂停背景</button></section><div class="opening-map-phase" inert><div class="opening-layout"><section class="opening-copy"><div class="opening-kicker"><span></span>千年瓷都 · 一城窑火</div><h1>走进工坊，<br/>看见<span>景德镇。</span></h1><p class="opening-lead">四处工坊，四种瓷韵。<br/>转动场景，欣赏每一站的建筑与烟火，<br/>把城市的故事做成亲手收藏的瓷碗。</p><div class="opening-chapter" aria-live="polite"><span id="opening-chapter-number">01</span><div><small id="opening-chapter-tag"></small><h2 id="opening-chapter-name"></h2><p id="opening-chapter-story"></p></div></div><div class="opening-actions"><button class="opening-start" id="start-button">${state.completed?'重温景德镇 · 查看藏品':state.scene>0||state.hasClay||state.level>0||state.money>0?'继续旅程 · '+PLACES[state.scene].shortName:'从古窑出发'} <span>→</span></button><button class="secondary-button" id="start-selected"></button><button class="opening-replay" id="replay-opening" aria-label="重播开场介绍">↺ 重播</button></div><div id="opening-gate"></div><div class="opening-rules"><span>每站 ${ORDERS_PER_SCENE} 单</span><span>80% 通关</span><span>400 币兑换贴画</span></div>${state.scene>0||state.money>0||state.hasClay||state.completed?'<button class="opening-reset" id="opening-new-game">重新开始旅程</button>':''}</section><section class="opening-scene-section" aria-label="四站工坊全景"><div id="opening-scene-carousel"></div><div class="opening-map-caption"><span>景德镇 · 工坊全景</span><span>拖动旋转 · 按钮切换</span></div></section></div><footer class="opening-footer"><div class="opening-timeline">${PLACES.map((place,i)=>`<button data-chapter="${i}" aria-pressed="${i===0}"><span>0${i+1}</span><b>${place.shortName}</b><i></i></button>`).join('')}</div><button class="opening-pause" id="pause-opening" aria-pressed="false">Ⅱ 暂停展示</button><span class="opening-footnote">山水之间，人文与烟火。</span></footer></div>`;
  host.querySelector('#start-button').onclick=()=>start(getState().startedJourney?getState().scene:selected);host.querySelector('#start-selected').onclick=()=>start(selected);host.querySelector('#skip-opening').onclick=skip;
  host.querySelector('#unfold-map').onclick=unfold;host.querySelector('#replay-opening').onclick=returnHome;
  host.querySelector('.opening-brand').onclick=returnHome;
  host.querySelector('#pause-opening').onclick=togglePause;host.querySelector('#pause-background').onclick=togglePause;
  host.querySelectorAll('[data-chapter]').forEach(button=>button.onclick=()=>sceneCarousel?.show(Number(button.dataset.chapter)));
  host.querySelector('#opening-new-game')?.addEventListener('click',()=>{stop();host.classList.add('hidden');onNewGame();});
  onPorcelain?.(host.querySelector('#prologue-carousel'));
  title=createOpeningTitle(host.querySelector('.opening-title'));
 }
 function syncPause(){
  for(const [id,label] of [['pause-opening','展示'],['pause-background','背景']]){
   const button=host.querySelector('#'+id);button.textContent=paused?'▷ 继续'+label:'Ⅱ 暂停'+label;button.setAttribute('aria-pressed',String(paused));
  }
  host.dataset.introState=paused?'paused':'playing';
 }
 function togglePause(){if(busy)return;paused=!paused;sceneCarousel?.setPaused(paused);syncPause();}
 function drawIntro(){const beat=Math.min(2,Math.floor(introElapsed/INTRO_DURATION*3));if(beat===narrative)return;narrative=beat;host.querySelector('#prologue-text').textContent=INTRO_LINES[beat];host.querySelectorAll('[data-intro-beat]').forEach((b,i)=>b.classList.toggle('active',i<=beat));}
 function tick(time){if(stopped||stage!=='intro')return;const dt=last&&!document.hidden?Math.min(80,time-last):0;last=time;introElapsed=Math.min(INTRO_DURATION,introElapsed+dt);drawIntro();if(introElapsed<INTRO_DURATION)raf=requestAnimationFrame(tick);}
 function stop(){stopped=true;cancelAnimationFrame(raf);sceneCarousel?.dispose();sceneCarousel=null;title?.dispose();title=null;onPorcelain?.(null);}
 function unfold(){
  if(stage==='map'||busy)return;
  cancelAnimationFrame(raf);onPorcelain?.(null);stage='map';host.scrollTop=0;host.dataset.openingStage=stage;
  host.querySelector('.city-prologue').inert=true;host.querySelector('.opening-map-phase').inert=false;host.querySelector('#skip-opening').textContent='进入工坊 ↗';
  sceneCarousel.mount(host.querySelector('#opening-scene-carousel'),{presentation:'interactive'});syncPause();updateChoice();
  host.querySelector('#start-button').focus({preventScroll:true});
 }
 function returnHome(){
  if(busy)return;host.scrollTop=0;
  if(stage==='intro')return;
  stage='intro';host.dataset.openingStage=stage;
  host.querySelector('.city-prologue').inert=false;host.querySelector('.opening-map-phase').inert=true;
  host.querySelector('#skip-opening').textContent='跳过介绍，进入工坊 ↗';
  sceneCarousel.mount(host.querySelector('#opening-background'),{presentation:'background'});
  onPorcelain?.(host.querySelector('#prologue-carousel'));
  introElapsed=0;last=0;narrative=-1;drawIntro();title.replay();syncPause();
  if(!reduced.matches)raf=requestAnimationFrame(tick);
  host.querySelector('.opening-brand').focus({preventScroll:true});
 }
 function updateScene(index){
   selected=index;updateChoice();const place=PLACES[index];host.dataset.chapter=String(index);host.querySelector('#opening-chapter-number').textContent=`0${index+1}`;host.querySelector('#opening-chapter-tag').textContent=place.chapter;host.querySelector('#opening-chapter-name').textContent=place.name;host.querySelector('#opening-chapter-story').textContent=place.story;
   host.querySelectorAll('[data-chapter]').forEach((button,i)=>{button.classList.toggle('active',i===index);button.setAttribute('aria-pressed',String(i===index));button.style.setProperty('--chapter-progress',i===index?1:0);});
 }
 function updateChoice(){
  const state=getState(),primary=host.querySelector('#start-button'),other=host.querySelector('#start-selected');
  primary.textContent=state.startedJourney?'继续当前工坊 · '+PLACES[state.scene].shortName:'从这里开始 · '+PLACES[selected].shortName;
  other.hidden=!state.startedJourney||selected===state.scene;
  other.disabled=!state.canSelectScene(selected)||busy;other.textContent=state.canSelectScene(selected)?'前往此工坊 · '+PLACES[selected].shortName:'🔒 请先完成当前工坊';
  primary.disabled=busy;host.querySelector('#opening-gate').innerHTML=sceneRequirementsMarkup(state);
 }
 async function start(index){
  if(busy||!getState().canSelectScene(index))return;busy=true;updateChoice();sceneCarousel?.setPaused(true);
  const success=await onStart(index);busy=false;
  if(success!==false){stop();host.classList.add('hidden');}else{sceneCarousel?.setPaused(paused);updateChoice();}
 }
 function skip(){if(stage==='intro'&&!getState().startedJourney){unfold();return;}start(getState().startedJourney?getState().scene:selected);}

 function show(animate=true){
  stop();stage='intro';introElapsed=0;last=0;narrative=-1;paused=false;stopped=false;
  host.classList.remove('hidden');host.dataset.openingStage='intro';render();host.scrollTop=0;
  sceneCarousel=createSceneCarousel(host.querySelector('#opening-background'),{initial:getState().scene,presentation:'background',onChange:updateScene});
  syncPause();drawIntro();if(animate&&!reduced.matches)raf=requestAnimationFrame(tick);
 }
 show(true);return {show,stop,skip};
}

export function createCityMap(host,{state,onContinue,onReplay,onSelect,from=null}){
 let selected=state.scene,busy=false,disposed=false;
 host.innerHTML=`<div class="atlas-layout"><div class="atlas-map-column">${mapMarkup({selected,completed:state.collection.map(c=>c.scene),from})}<p class="atlas-caption">点击地点，选择下一处工坊或回访。</p></div><section class="atlas-detail"><div class="atlas-place-details"></div>${sceneRequirementsMarkup(state)}<div class="atlas-passport">${PLACES.map((p,i)=>`<span class="${state.isCollected(i)?'stamped':''}"><b>${p.stamp}</b><small>${state.isCollected(i)?'已收藏':'待收集'}</small></span>`).join('')}</div><p data-travel-error role="status"></p><button class="primary-button" id="map-select"></button><button class="secondary-button" id="map-continue">返回当前站</button><button class="atlas-replay" id="map-replay-opening">重播地图开场 ↗</button></section></div>`;
 const render=()=>{const p=PLACES[selected];host.querySelector('.atlas-place-details').innerHTML=`<h3>${p.name}</h3><p>${p.story}</p><div class="atlas-sticker"><small>纪念贴画</small><b>${p.sticker}</b><span>${state.isCollected(selected)?'✓ 已收藏 · 可选练习':selected===state.scene?'当前工坊':'等待探索'}</span></div>`;host.querySelectorAll('[data-place]').forEach(b=>{const active=Number(b.dataset.place)===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});const button=host.querySelector('#map-select');button.disabled=busy||!state.canSelectScene(selected);button.textContent=busy?'正在准备工坊…':selected===state.scene?'继续当前工坊':state.canSelectScene(selected)?'前往此工坊':'🔒 请先完成当前工坊';};
 host.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{if(!busy){selected=Number(b.dataset.place);render();}});
 host.querySelector('#map-select').onclick=async()=>{if(busy)return;if(selected===state.scene){onContinue();return;}busy=true;render();const ok=await onSelect(selected);if(disposed)return;busy=false;if(!ok){host.querySelector('[data-travel-error]').textContent='场景加载失败，请重试。';render();}};
 host.querySelector('#map-continue').onclick=onContinue;host.querySelector('#map-replay-opening').onclick=onReplay;render();
 return {dispose(){disposed=true;host.replaceChildren();}};
}
