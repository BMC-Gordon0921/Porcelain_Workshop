import './style.css';
import './challenge.css';
import './journey.css';
import './city-map.css';
import './upgrade.css';
import './workshop.css';
import './tutorial.css';
import './carousel.css';
import {WORKBENCHES,WORKBENCH_IDS,UPGRADE_COSTS,fireBand,fireRatio,fireGrade,FIRE_DURATION,formatElapsed,clockPolicy} from './workshop.js';
import {createKilnPreview} from './kiln-view.js';
import {PLACES} from './places.js';
import {createOpening, createCityMap} from './city-map.js';
import {SculptureChallenge, PRESETS, CAMPAIGN_PRESETS, DESIGNS, PALETTE, COLOR_NAMES, createTarget, KILN_GRADES} from './sculpture.js';
import {SAVE_KEY, SCENES, DECAL_PRICE, ORDERS_PER_SCENE} from './campaign.js';
import {attachEditor, thumbnail} from './sculpture-view.js';
import {createBowlPreview, decalImage, bowlImage} from './decals.js';
import {createWorld, STATIONS} from './world.js';
import {createHeroCarousel} from './hero-carousel.js';
import {initI18n, setLang, toggleLang, onLangChange, langButtonLabel} from './i18n.js';
import {icon} from './art.js';
import {createSfx} from './sfx.js';
import {createMusic} from './music.js';
import {TUTORIAL_STEPS} from './tutorial.js';
import logoMark from './assets/logo-mark.png';
const $=id=>document.getElementById(id);
let saved=null;
try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||sessionStorage.getItem(SAVE_KEY)||localStorage.getItem('terra-porcelain-journey-v5')||sessionStorage.getItem('terra-porcelain-journey-v5')||sessionStorage.getItem('terra-porcelain-challenge-v4')||'null');}catch{}
let state=SculptureChallenge.restore(saved);
const world=createWorld($('world'));
const presetImages=Object.fromEntries(PRESETS.map(p=>[p.id,thumbnail(createTarget(p.id))]));
const decalImages=SCENES.map((_,i)=>decalImage(i));
let started=false,helpOpen=false,activeTask=null,nearest=null,previousTime=0,toastTimeout;
let clockAt=performance.now(),efficiencyRunning=false,kilnRunning=false,focused=document.hasFocus(),lastClockSave=0;
const keys=new Set();let opening=null;
const sfx=createSfx(),music=createMusic();
let soundEnabled=true;
try{soundEnabled=localStorage.getItem('terra-sound-enabled')!=='false';}catch{}
if(!soundEnabled)sfx.setEnabled(false);music.setEnabled(soundEnabled);
window.addEventListener('pointerdown',()=>{sfx.unlock();music.unlock();},{capture:true});
window.addEventListener('keydown',()=>{sfx.unlock();music.unlock();},{capture:true});
function save(){const value=JSON.stringify(state.serialize());try{sessionStorage.setItem(SAVE_KEY,value);}catch{}try{localStorage.setItem(SAVE_KEY,value);}catch{}}
function sound(kind,detail){sfx.play(kind,detail);}
function uiButton(target){const button=target?.closest?.('button, [role="button"]');if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return null;return button;}
let hoveredButton=null,pressedButton=null;
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const button=uiButton(e.target);if(!button||button===hoveredButton||button.contains(e.relatedTarget))return;hoveredButton=button;sound('hover');},true);
document.addEventListener('pointerout',e=>{const button=uiButton(e.target);if(button&&hoveredButton===button&&!button.contains(e.relatedTarget))hoveredButton=null;},true);
document.addEventListener('pointerdown',e=>{if(e.button!==0)return;const button=uiButton(e.target);if(!button)return;pressedButton=button;sound('click');},true);
document.addEventListener('click',e=>{const button=uiButton(e.target);if(!button||button===pressedButton){pressedButton=null;return;}sound('click');},true);
function toast(message){clearTimeout(toastTimeout);$('toast').textContent=message;$('toast').classList.add('show');toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),4200);}
$('brand-mark').innerHTML=`<img src="${logoMark}" alt="terra little clay workshop"/>`;$('coin-icon').innerHTML=icon('coin');
$('sound-button').dataset.soundToggle='';
function updateSoundButtons(){document.querySelectorAll('[data-sound-toggle]').forEach(button=>{button.innerHTML=icon(soundEnabled?'sound':'muted');button.title=soundEnabled?'关闭声音':'开启声音';button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(soundEnabled));});}
document.addEventListener('click',e=>{if(!e.target.closest('[data-sound-toggle]'))return;soundEnabled=!soundEnabled;sfx.setEnabled(soundEnabled);music.setEnabled(soundEnabled);try{localStorage.setItem('terra-sound-enabled',String(soundEnabled));}catch{}updateSoundButtons();if(soundEnabled)sound('tap');});
updateSoundButtons();
const stokeInputs=new Set();
function changeStoke(source,on){syncClocks();if(on&&state.kiln&&!helpOpen&&!document.hidden&&focused)stokeInputs.add(source);else stokeInputs.delete(source);state.setStoking(stokeInputs.size>0);updateKiln();}
function releaseStoke(){stokeInputs.clear();state.setStoking(false);}
const labels={};STATIONS.forEach((s,i)=>{const el=document.createElement('div');el.className='station-label';el.innerHTML=`<span class="station-num">${i+1}</span><span>${s.name}</span>${s.id==='kiln'?'<span class="kiln-small" id="kiln-small"></span>':''}`;$('station-labels').append(el);labels[s.id]=el;});
const rewardTable=()=>`<div class="reward-table" aria-label="评分奖励表">${[["低于60%",0],["60–69%",60],["70–79%",70],["80–89%",80],["90–99%",90],["100%",100]].map(([score,coins])=>`<div><span>${score}</span><b>${coins}<small> 币</small></b></div>`).join('')}</div>`;
function syncClocks(now=performance.now()){
 const stamp=Math.max(clockAt,now),elapsed=stamp-clockAt;clockAt=stamp;
 if(efficiencyRunning)state.advanceEfficiency(elapsed);
 const before=state.kilnResult;if(kilnRunning)state.tick(elapsed/1000);
 const policy=clockPolicy({started,helpOpen,hidden:document.hidden,focused,hasClay:state.hasClay,canWork:state.canWork,kind:activeTask?.kind});
 efficiencyRunning=policy.efficiency;kilnRunning=policy.kiln;state.kilnPaused=!kilnRunning;
 if(!before&&state.kilnResult){stokeInputs.clear();announceKiln();}
}
function efficiencyText(){
 if(!state.hasClay)return '五分钟内通过，订单收益 +20%';
 if(!state.efficiency.eligible)return '下次领取新坯开始效率计时';
 if(state.efficiency.elapsedMs>300000)return `效率用时 ${formatElapsed(state.efficiency.elapsedMs)} · 继续制作，原有收益保留`;
 return `效率用时 ${formatElapsed(state.efficiency.elapsedMs)} / 05:00 · ${efficiencyRunning?'达标 +20%':'已暂停'}`;
}
function updateEfficiency(){const value=efficiencyText();document.querySelectorAll('[data-efficiency]').forEach(el=>{if(el.dataset.source!==value){el.dataset.source=value;el.textContent=value;}});}
function upgradeCard(id){const level=state.stationLevel(id),b=WORKBENCHES[id],price=UPGRADE_COSTS[level];return `<article class="workbench-card" data-workbench="${id}"><div class="workbench-heading"><b>${b.name}</b><span>Lv.${level} / 3</span></div><p>${b.effects[level-1]}</p>${level<3?`<small>下一级：${b.effects[level]}</small><button class="secondary-button" data-upgrade="${id}" data-from="${level}" ${state.money<price||state.completed?'disabled':''}>升级 · ${price} 币</button>${state.money<price?'<small>金币不足，可通过订单赚取</small>':''}`:'<strong class="max-level">已满级</strong>'}</article>`;}
let upgradePendingUntil=0;
function bindUpgrades(){document.querySelectorAll('[data-upgrade]').forEach(button=>button.onclick=()=>{if(performance.now()<upgradePendingUntil)return;syncClocks();const id=button.dataset.upgrade;if(!state.upgradeStation(id,Number(button.dataset.from)))return;upgradePendingUntil=performance.now()+350;button.disabled=true;save();sound('coin');updateUI();if(activeTask?.kind==='upgrades')openUpgrades();else{const station=activeTask.station;activeTask.editor?.finish();state.endStation();if(station==='wheel'||station==='carve'||station==='paint')openEditor(station);else if(station==='kiln')openKiln();else if(station==='clay')openSupply();else if(station==='serve')openReview();}});}
function mountStationInfo(id){activeTask.station=id;const timer=document.createElement('div');timer.className='efficiency-indicator task-efficiency';timer.dataset.efficiency='';$('task-body').prepend(timer);const host=document.createElement('div');host.className='station-upgrade-strip';host.innerHTML=upgradeCard(id);$('task-body').append(host);bindUpgrades();updateEfficiency();}
function openUpgrades(){if(!started)return;taskShell('upgrades',`${state.sceneInfo.name} · 独立建设`,'升级你的工作台','每个场景独立升级。五分钟内通过订单可多赚 20%，首次通关另得 60 币。',`<div class="upgrade-wallet">当前余额 <b>${state.money}</b> 币</div><div class="workbench-grid">${WORKBENCH_IDS.map(upgradeCard).join('')}</div><div class="efficiency-indicator" data-efficiency></div>`);bindUpgrades();updateEfficiency();}
$('upgrades-button').onclick=openUpgrades;
function updateUI(){
 const p=state.preset,theme=state.sceneInfo;
 document.documentElement.style.setProperty('--scene-accent',theme.accent);document.documentElement.style.setProperty('--scene-light',theme.light);world.setScene(state.scene);
 $('money').innerHTML=`${state.money}<span> 硬币</span>`;
 document.querySelector('.day-pill b').textContent=PLACES[state.scene].shortName;
 document.querySelector('.day-pill small').textContent=`场景 ${state.scene+1} / 4 · ${theme.decal}`;
 document.querySelector('.commissions').innerHTML=`<div class="scene-heading"><span>瓷器之旅 · ${state.scene+1} / 4</span><h2 title="${theme.name}">${PLACES[state.scene].shortName}</h2></div><div class="scene-path">${SCENES.map((s,i)=>`<span class="${i===state.scene?'current':''} ${i<state.collection.length?'done':''}" title="${s.name}">${i<state.collection.length?'✓':String(i+1).padStart(2,'0')}</span>`).join('')}</div><button class="reference-card" id="view-brief"><div class="reference-heading"><span>${state.phase==='practice'?'练习订单':`第 ${state.level+1} 关 / ${ORDERS_PER_SCENE}`}</span><span>80% 通关</span></div><img src="${presetImages[p.id]}" alt="${p.name}参考图"/><h3>${p.name}</h3><p>60% 起奖励 · 首次通关 +60 币</p><div class="efficiency-indicator" data-efficiency></div><span class="reference-link">${state.canWork?'查看订单 ↗':'三关已完成 ✓'}</span></button><div class="preset-path">${CAMPAIGN_PRESETS.map((d,i)=>`<div class="preset-step ${i===state.level?'current':''} ${state.sceneResults.some(r=>r.level===i+1)?'passed':''}" title="第 ${i+1} 关：${d.name}"><img src="${presetImages[d.id]}" alt="${d.name}"/><span>${state.sceneResults.some(r=>r.level===i+1)?'✓':i+1}</span></div>`).join('')}</div><button class="decal-goal" id="open-journey"><img src="${decalImages[state.scene]}" alt="${theme.decal}贴画"/><div><small>本场景贴画 · 400 币</small><b>${theme.decal}</b><span>${state.phase==='decal'?'已购买 · 点击贴花':state.phase==='crafted'?'已制成 · 进入下一场景':state.completed?'四件作品已集齐':`${state.scenePassed}/${ORDERS_PER_SCENE} 关 · ${state.money}/400 币`}</span></div><span>↗</span></button><button class="collection-link" id="view-collection">我的瓷器藏品 <b>${state.collection.length} / 4</b></button>`;
 $('view-brief').onclick=routeTask;$('open-journey').onclick=openJourney;$('view-collection').onclick=openCollection;
 $('carrying').classList.toggle('hidden',!state.hasClay);$('carry-art').innerHTML=`<img src="${thumbnail(state.piece.pixels,112)}" alt="当前瓷泥"/>`;$('carry-name').textContent=p.name;$('carry-stage').textContent=`第 ${state.level+1} 关 · 第 ${state.attempt} 次尝试`;
 $('guide-number').textContent=String(state.scene+1).padStart(2,'0');$('guide-kicker').textContent=state.canWork?'制胚 → 彩绘 → 烧成 · 80% 通关':'三关完成 · 制作场景成品';$('guide-title').textContent=state.canWork?(state.hasClay?(state.fired?'作品已烧成 · 前往交付台':state.hasPaint?'去窑炉烧成，再交付作品':state.hasShape?'到上色台完成彩绘':'到塑形台制作胚体'):'到取泥台领取瓷泥'):'点击右侧贴画，完成你的瓷碗';$('guide-copy').textContent=state.canWork?'按顺序完成制胚、彩绘、烧成；走近工作台按 F 操作。':'购买 → 选择贴画 → 贴到碗上 → 下一场景';
 for(const station of STATIONS){const el=labels[station.id];el.querySelector('.station-level')?.remove();const badge=document.createElement('span');badge.className='station-level';badge.textContent=`Lv.${state.stationLevel(station.id)}`;el.append(badge);}
 tutorialKey='';updateTutorial();updateEfficiency();$('app').dataset.scene=String(state.scene+1);$('app').dataset.phase=state.phase;save();
}
let tutorialKey='';
function tutorialGate(station){if(state.allowsStation(station))return true;toast(state.tutorialStep.copy);return false;}
function updateTutorial(){
 const step=state.tutorialStep,key=[step?.id,activeTask?.kind,activeTask?.station,started,helpOpen].join('|');
 if(key===tutorialKey)return;tutorialKey=key;save();
 $('app').dataset.tutorial=step?.id||'';
 for(const [id,label] of Object.entries(labels))label.classList.toggle('tutorial-target',!!step&&id===state.nextStation());
 document.querySelectorAll('.tutorial-focus').forEach(el=>el.classList.remove('tutorial-focus'));
 document.querySelectorAll('.tutorial-instruction').forEach(el=>el.remove());
 if(!step){$('guide-card').classList.remove('tutorial-guide');return;}
 $('guide-card').classList.add('tutorial-guide');
 $('guide-kicker').textContent=`新手教学 · ${TUTORIAL_STEPS.findIndex(s=>s.id===step.id)+1} / ${TUTORIAL_STEPS.length}`;
 $('guide-title').textContent=step.title;$('guide-copy').textContent=step.copy;
 if(activeTask&&!['citymap','travel','upgrades','collection','restart'].includes(activeTask.kind)){
  const instruction=document.createElement('div');instruction.className='tutorial-instruction';instruction.setAttribute('role','status');
  const heading=document.createElement('b');heading.textContent=step.title;const copy=document.createElement('p');copy.textContent=step.copy;instruction.append(heading,copy);$('task-body').prepend(instruction);
  const focus=step.id==='clay'?document.querySelector('#fresh-clay'):['wheel','carve','paint'].includes(step.id)?document.querySelector('#sculpt-canvas'):step.id==='kiln'?document.querySelector('.kiln-control'):document.querySelector('#confirm-review');focus?.classList.add('tutorial-focus');
 }
}
function cleanupTask(){releaseStoke();activeTask?.editor?.finish();activeTask?.preview?.dispose();activeTask?.cityMap?.dispose();}
function taskShell(kind,eyebrow,title,description,body,footer='进度自动保存。按 Esc 返回工坊。'){
 syncClocks();cleanupTask();activeTask={kind};world.setInteractionEnabled(false);keys.clear();clearTimeout(toastTimeout);$('toast').classList.remove('show');$('task-overlay').classList.remove('hidden');document.querySelector('.task-panel').classList.toggle('atlas-panel',kind==='citymap'||kind==='travel');document.querySelector('.task-panel').classList.toggle('wide-panel',['editor','kiln','upgrades','result','brief','journey','decal','crafted','collection','citymap','travel'].includes(kind));
 $('task-eyebrow').textContent=eyebrow;$('task-title').textContent=title;$('task-description').textContent=description;$('task-body').innerHTML=body;tutorialKey='';$('task-footer').innerHTML=footer+'<button type="button" id="task-help" class="secondary-button">玩法说明</button>';$('task-help').onclick=showHelp;document.querySelector('.task-panel').scrollTop=0;$('close-task').focus({preventScroll:true});syncClocks();updateEfficiency();save();
}
function closeTask(){syncClocks();releaseStoke();cleanupTask();state.endStation();activeTask=null;keys.clear();$('task-overlay').classList.add('hidden');syncClocks();updateUI();}
$('close-task').onclick=closeTask;
function routeTask(){if(state.canWork)openBrief();else if(state.completed)openCollection();else openJourney();}
function openBrief(){
 if(!state.canWork){openJourney();return;}
 const p=state.preset;taskShell('brief',`${state.sceneInfo.name} · ${state.phase==='practice'?'练习订单':`第 ${state.level+1} 关 / ${ORDERS_PER_SCENE}`} · 尝试 ${state.attempt}`,p.name,p.task,`<div class="brief-pair"><figure><span class="board-label">${state.hasClay?'你正在制作的瓷泥':'初始瓷泥'}</span><img src="${thumbnail(state.piece.pixels,448)}" alt="当前瓷泥"/><figcaption>${state.hasClay?'保留当前作品，继续完善。':'到取泥台领取一整块瓷泥。'}</figcaption></figure><div class="brief-arrow">→</div><figure><span class="board-label">订单参考图</span><img src="${presetImages[p.id]}" alt="${p.name}"/><figcaption>对照形状与蓝色装饰，自由制作。</figcaption></figure></div><div class="brief-rules"><span><b>达到 80% 通关</b>未通过则重试本关，已获得硬币保留。</span><span><b>累计 400 币购买贴画</b>完成三关后购买，贴到瓷碗上进入下一场景。</span></div>${rewardTable()}<div class="task-action-row"><button class="primary-button" id="brief-done">${state.hasClay?'继续制作':'去领取瓷泥'} <span>→</span></button></div>`);
 $('brief-done').onclick=closeTask;
}
function enterGame(){heroCarousel?.pause();started=true;world.resize();routeTask();}
$('map-button').onclick=()=>openCityMap();
$('reset-view').onclick=()=>{if(started&&!activeTask&&!helpOpen)world.resetView();};
function showHelp(){syncClocks();releaseStoke();activeTask?.editor?.finish();helpOpen=true;world.setInteractionEnabled(false);keys.clear();$('help-overlay').classList.remove('hidden');$('help-done').focus();syncClocks();updateEfficiency();save();}
function hideHelp(){syncClocks();helpOpen=false;$('help-overlay').classList.add('hidden');keys.clear();syncClocks();updateEfficiency();}
$('help-button').onclick=showHelp;$('close-help').onclick=hideHelp;$('help-done').onclick=hideHelp;
function openEditor(station){
 if(!state.canWork){openJourney();return;}
 if(nearest?.id!==station)return;
 if(!state.hasClay){toast('请先到取泥台领取瓷泥。');return;}
 const lock=state.stationLock(station);
 if(lock){toast({clay:'先到取泥台领取瓷泥。',fired:'瓷器已经烧成，不能再改变造型；可以去上色台补绘。',painted:'已经上色，若想改形状，请领取新瓷泥重新制胚。',shape:'先到塑形台完成制胚，再上色。'}[lock]||state.tutorialStep?.copy||'这一步还不能进行。');return;}
 if(!state.startStation(station))return;
 const setup={wheel:{mode:'push',name:'粗塑成形',title:'用双手推压瓷泥',description:'沿参考轮廓推压或拉伸瓷泥。默认左右对称，接近轮廓时轻微辅助；可关闭参考线或对称操作。',tool:'✋ 推压瓷泥 · 宽手掌',min:14,max:26,size:18,note:'这里只能推压塑形，现有颜色会随瓷泥一起移动。雕刻和上色请去对应工作台。'},carve:{mode:'cut',name:'细节雕刻',title:'刻去多余的瓷泥',description:'拖动刻刀去除多余瓷泥，对照右侧图片修整轮廓。刻多了可以撤销。',tool:'✂ 雕刻 · 刻刀',min:1,max:14,size:4,note:'这里只能去除瓷泥。推压造型请去塑形台，绘制颜色请去上色台。'},paint:{mode:'paint',name:'手绘上色',title:'画上你的青花',description:'选择颜色，在瓷器表面拖动画笔。上色只改变颜色，不改变轮廓。',tool:'● 上色 · 画笔',min:1,max:16,size:5,note:'这里只能绘画。切去瓷泥请去雕刻台，改变造型请去塑形台。'}}[station];
 const p=state.preset;
 taskShell('editor',`第 ${state.level+1} 关 · ${setup.name} · 尝试 ${state.attempt}`,setup.title,setup.description,`<div class="editor-layout"><section class="work-area"><div class="board-top"><span class="board-label">你的瓷泥 · 正面</span><span id="work-status">已保存</span></div><div class="sculpt-canvas-wrap"><canvas id="sculpt-canvas" width="560" height="560" tabindex="0" aria-label="${setup.name}. Drag to ${setup.mode==='push'?'push clay':setup.mode==='cut'?'cut clay':'paint clay'}. Compare with the separate reference picture."></canvas><span class="canvas-corner">亲手制作</span></div><div class="tool-row"><span class="station-tool" data-station-tool="${setup.mode}">${setup.tool}</span><button class="small-tool" id="undo-stroke" title="Undo this station's last stroke (Ctrl/Cmd Z)" aria-label="Undo stroke">↶</button><button class="small-tool" id="redo-stroke" title="Redo stroke" aria-label="Redo stroke">↷</button></div><div class="brush-row"><label for="brush-size">${setup.mode==='push'?'手掌宽度':'工具大小'}</label><input type="range" id="brush-size" min="${setup.min}" max="${setup.max}" value="${setup.size}"/><output id="brush-size-value">${setup.size}</output><span class="station-only">${setup.mode==='push'?'仅用于粗塑':'本站专用工具'}</span></div></section><aside class="editor-reference"><span class="board-label">订单参考图</span><img class="target-preview" src="${presetImages[p.id]}" alt="Target ${p.name}"/><h3>${p.name}</h3><p>${p.task}</p>${setup.mode==='paint'?`<div class="palette-label">选择颜色</div><div class="paint-colors">${PALETTE.slice(1).map((c,i)=>`<button class="paint-color ${i===1?'selected':''}" data-color="${i+1}" style="--paint:${c}" title="${COLOR_NAMES[i+1]}" aria-label="${COLOR_NAMES[i+1]} paint"><span></span></button>`).join('')}</div><span class="color-name" id="color-name">钴蓝</span>`:''}<div class="maker-tip station-note"><b>${setup.name}</b><p>${setup.note}</p></div><p class="guide-note" id="tool-hint">对照参考图，观察形状与花纹。</p></aside></div><div class="editor-bottom"><button class="primary-button" id="save-editor">保存并离开 <span>→</span></button><span>完成制作后先到窑炉烧制，再到交付台评分。</span></div>`, '<span>拖动操作</span><span><kbd>⌘ / Ctrl Z</kbd> 撤销本次操作</span><span><kbd>[</kbd><kbd>]</kbd> 工具大小</span><span><kbd>Esc</kbd> 保存并关闭</span>');
 const editor=attachEditor($('sculpt-canvas'),state,{mode:setup.mode,canInteract:()=>focused&&!document.hidden&&!helpOpen,onHint:message=>{if($('tool-hint').textContent!==message)$('tool-hint').textContent=message;},onChange:()=>{$('work-status').textContent='正在制作…';sfx.shape(setup.mode);},onFinish:()=>{$('work-status').textContent='已保存';sfx.shape(null);save();}});activeTask.editor=editor;activeTask.station=station;editor.setRadius(setup.size);
 document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{editor.setColor(b.dataset.color);document.querySelectorAll('[data-color]').forEach(c=>c.classList.toggle('selected',c===b));$('color-name').textContent=COLOR_NAMES[b.dataset.color];});
 $('brush-size').oninput=e=>{editor.setRadius(e.target.value);$('brush-size-value').textContent=e.target.value;};$('undo-stroke').onclick=()=>editor.undo();$('redo-stroke').onclick=()=>editor.redo();$('save-editor').onclick=closeTask;
 const toggles=document.createElement('div');toggles.className='editor-assists';const settings=[['guides','参考线',setup.mode!=='paint',true],...(station==='wheel'?[['symmetric','左右对称',true,true]]:[]),...(station==='carve'?[['protect','轮廓保护',true,state.stationLevel('carve')>=2]]:[]),...(station==='paint'?[['line','直线笔',false,state.stationLevel('paint')>=2],['mirror','镜像绘制',false,state.stationLevel('paint')>=3]]:[])];
 toggles.innerHTML=settings.map(([name,label,checked,enabled])=>`<label><input type="checkbox" data-assist="${name}" ${checked?'checked':''} ${enabled?'':'disabled'}/> ${label}${enabled?'':' · 升级解锁'}</label>`).join('');document.querySelector('.work-area').append(toggles);toggles.querySelectorAll('input').forEach(input=>input.onchange=()=>editor.setOption(input.dataset.assist,input.checked));mountStationInfo(station);
}

const KILN_ARC=a=>-120+a*240;
const kilnPoint=(angle,r)=>{const rad=angle*Math.PI/180;return [110+r*Math.sin(rad),114-r*Math.cos(rad)];};
function kilnArc(from,to,r0,r1){const [x0,y0]=kilnPoint(from,r0),[x1,y1]=kilnPoint(to,r0),[x2,y2]=kilnPoint(to,r1),[x3,y3]=kilnPoint(from,r1);const large=Math.abs(to-from)>180?1:0;return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r0} ${r0} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r1} ${r1} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;}
function openKiln(){
 if(!tutorialGate('kiln'))return;
 if(!state.hasClay){toast('请先到取泥台领取瓷泥。');return;}
 if(!state.hasShape){toast('先到塑形台完成制胚，再来烧窑。');return;}
 if(!state.hasPaint){toast('先到上色台完成彩绘，再来烧窑。');return;}
 taskShell('kiln','提交前必经 · 瓷器窑炉','守住窑火，烧出好瓷','固定 12 秒连续烧制：按住空格或按钮鼓风升温，松开降温。让指针留在漂移的火候带内——完美与成功区间累计越久，金币倍率越高。', '<div class="kiln-layout"><div class="kiln-stage"><canvas id="kiln-canvas" aria-label="窑炉与实际作品的烧制特写"></canvas><span class="kiln-stage-caption">窑火 · 亲手烧制</span></div><section class="kiln-control"><div class="kiln-head"><span class="kiln-timer" id="kiln-timer">12.0<small>s</small></span><span class="kiln-band-label" id="kiln-band-label">火候带漂移中</span></div><div class="kiln-gauge-wrap"><svg class="kiln-gauge" viewBox="0 0 220 214" role="img" aria-label="火候判定扇环"><path class="kiln-track" d="'+kilnArc(-120,120,93,65)+'"/><path id="kiln-good-zone" class="kiln-good"/><path id="kiln-perfect-zone" class="kiln-perfect"/><g id="kiln-center"><line x1="110" y1="21" x2="110" y2="36"/></g><g id="kiln-needle"><line x1="110" y1="30" x2="110" y2="62"/><circle cx="110" cy="26" r="4"/></g></svg><div class="kiln-readout"><strong id="kiln-percent">0<small>%</small></strong><span id="kiln-grade" role="status" aria-live="polite">等待烧制</span></div></div><div class="kiln-legend" id="kiln-legend"></div><div class="kiln-times" id="kiln-times"><div class="kiln-time grade-perfect"><span>完美</span><i><em id="kiln-fill-perfect"></em></i><b id="kiln-time-perfect">0.0s</b></div><div class="kiln-time grade-good"><span>成功</span><i><em id="kiln-fill-good"></em></i><b id="kiln-time-good">0.0s</b></div><div class="kiln-time grade-plain"><span>一般</span><i><em id="kiln-fill-fair"></em></i><b id="kiln-time-fair">0.0s</b></div></div><p class="kiln-caption" id="kiln-caption"></p><div class="task-action-row"><button class="primary-button" id="fire-button">开始烧制</button><button class="secondary-button" id="stoke-button" disabled>按住鼓风 · 空格</button></div></section></div>', '按住空格或按钮鼓风 · 松开降温 · 退出面板会暂停烧制');
 activeTask.preview=createKilnPreview($('kiln-canvas'),state);
 $('fire-button').onclick=()=>{syncClocks();if(state.kilnResult){closeTask();return;}if(state.fire()){releaseStoke();sound('fire');save();updateKiln();$('stoke-button').focus({preventScroll:true});}};
 const stoke=$('stoke-button');
 stoke.onpointerdown=e=>{if(e.button!==0||!e.isPrimary)return;e.preventDefault();stoke.setPointerCapture(e.pointerId);changeStoke('pointer',true);};
 const releasePointer=()=>changeStoke('pointer',false);
 stoke.onpointerup=stoke.onpointercancel=stoke.onlostpointercapture=stoke.onpointerleave=releasePointer;
 stoke.onpointermove=e=>{const r=stoke.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)releasePointer();};
 stoke.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();if(!e.repeat)changeStoke('enter',true);}};
 stoke.onkeyup=e=>{if(e.key==='Enter'){e.preventDefault();changeStoke('enter',false);}};
 stoke.onblur=()=>{changeStoke('enter',false);};
 mountStationInfo('kiln');updateKiln();
}
function announceKiln(){if(!state.kilnResult)return;save();sound('strike',state.kilnResult.grade);sound('coin');}
function updateKiln(){
 if(activeTask?.kind!=='kiln')return;
 const k=state.kiln,result=state.kilnResult,heat=state.kilnProgress();
 const center=k?.center??result?.center??.6;
 const bands=k?.bands??result?.zones??fireBand(state.stationLevel('kiln'));
 $('kiln-good-zone').setAttribute('d',kilnArc(KILN_ARC(center-bands.good),KILN_ARC(center+bands.good),93,65));
 $('kiln-perfect-zone').setAttribute('d',kilnArc(KILN_ARC(center-bands.perfect),KILN_ARC(center+bands.perfect),96,62));
 $('kiln-center').setAttribute('transform','rotate('+KILN_ARC(center)+' 110 114)');
 $('kiln-needle').setAttribute('transform','rotate('+KILN_ARC(heat)+' 110 114)');
 $('kiln-needle').classList.toggle('live',!!k);
 $('kiln-needle').classList.toggle('in-band',!!k&&Math.abs(heat-center)<=bands.perfect);
 const seconds=k?.seconds||result?.seconds||{perfect:0,good:0,fair:0};
 const ratio=result?result.ratio:fireRatio(seconds),grade=result?result.grade:fireGrade(seconds),label=KILN_GRADES[grade].label;
 const key=[k?k.remaining.toFixed(1):'-',seconds.perfect.toFixed(1),seconds.good.toFixed(1),seconds.fair.toFixed(1),grade,!!k?.stoking,!!result].join('|');
 if(activeTask.kilnStatus===key)return;
 activeTask.kilnStatus=key;
 $('kiln-timer').innerHTML=k?Math.max(0,k.remaining).toFixed(1)+'<small>s</small>':result?'0.0<small>s</small>':'12.0<small>s</small>';
 $('kiln-percent').innerHTML=result?'×'+result.multiplier:Math.round(heat*100)+'<small>%</small>';
 $('kiln-grade').textContent=result?label:k?'预计 '+label:'等待烧制';
 $('kiln-grade').className='grade-'+grade;
 for(const zone of ['perfect','good','fair']){
  const value=seconds[zone];
  $('kiln-time-'+zone).textContent=value.toFixed(1)+'s';
  $('kiln-fill-'+zone).style.width=Math.min(100,value/FIRE_DURATION*100)+'%';
 }
 $('kiln-band-label').textContent=result?'完美占比 '+Math.round(ratio*100)+'%':'完美带 ±'+(bands.perfect*100).toFixed(1)+'% · 成功带 ±'+(bands.good*100).toFixed(0)+'%';
 $('kiln-caption').textContent=result?'完美 '+seconds.perfect.toFixed(1)+'s + 成功 '+seconds.good.toFixed(1)+'s，金币 ×'+result.multiplier+'。':k?(k.stoking?'鼓风中：窑温上升，松开空格降温。':'降温中：按住空格或按钮把指针推回带内。'):'按住空格鼓风，松开降温。让指针留在金色完美带内。';
 $('stoke-button').disabled=!k;
 $('stoke-button').classList.toggle('active',!!k?.stoking);
 $('stoke-button').textContent=k?.stoking?'鼓风中… · 松开':'按住鼓风 · 空格';
 const fire=$('fire-button');fire.disabled=!!k;fire.textContent=result?'完成 · 返回工坊':k?'烧制中…':'开始烧制';
 if(result)fire.focus();
}
function openReview(){if(!tutorialGate('serve'))return;
 if(nearest?.id!=='serve')return;if(!state.canWork){openJourney();return;}if(!state.hasClay){toast('先带上你制作的瓷器，再到这里评分。');return;}if(!state.hasShape||!state.hasPaint){toast('请先完成制胚与彩绘，再烧制提交。');return;}
 taskShell('review',`${state.sceneInfo.name} · 第 ${state.level+1} 关`,'看看这件作品吧','评分由形状 65% 和上色 35% 组成。达到 80% 通过本关；低于 80% 重试，60% 起仍可获得硬币。',`<div class="review-pair"><figure><img src="${thumbnail(state.piece.pixels,336)}" alt="你的作品"/><figcaption>你的作品</figcaption></figure><figure><img src="${presetImages[state.preset.id]}" alt="参考作品"/><figcaption>参考作品</figcaption></figure></div>${rewardTable()}<div class="task-action-row"><button class="secondary-button" id="keep-working">继续完善</button><button class="primary-button" id="confirm-review">提交评分 <span>→</span></button></div>`);
 $('keep-working').onclick=closeTask;$('confirm-review').onclick=submit;
 if(!state.canSubmit){$('confirm-review').disabled=true;$('confirm-review').textContent=state.kiln?'请先完成烧制':'请先到窑炉烧制';}
 mountStationInfo('serve');
}
function submit(){
 syncClocks();const result=state.submit();if(!result.valid){if(result.reason==='firing-required')toast('请先到窑炉完成烧制，再提交作品。');return;}save();sound(result.earned?'coin':'fail');
 const next=result.practice||state.sceneComplete?'前往贴画台':result.passed?'查看下一关':'再试一次';
 taskShell('result',`${SCENES[result.scene].name} · ${result.practice?'练习订单':`第 ${result.level} 关`}`,result.passed?'作品通过啦！':'再完善一点，就更好了',result.passed?'本次得分与硬币已保存。':'本关需要达到 80%。这次获得的硬币保留，领取新瓷泥后继续尝试。',`<div class="result-layout"><div class="result-images"><figure><img src="${thumbnail(result.pixels,336)}" alt="提交的作品"/><figcaption>你的作品</figcaption></figure><figure><img src="${presetImages[result.design]}" alt="参考作品"/><figcaption>订单参考</figcaption></figure></div><div class="score-card ${result.passed?'pass':'fail'}"><span class="score-label">相似度</span><strong>${result.score.toFixed(1)}<small>%</small></strong><b>${result.passed?'已通过':'未通过 · 重新尝试'}</b><p>通关标准 80%</p><div class="score-detail"><span>形状 · 权重 65%</span><b>${result.shape.toFixed(1)}%</b></div><div class="score-meter"><span style="width:${result.shape}%"></span></div><div class="score-detail"><span>上色 · 权重 35%</span><b>${result.paint.toFixed(1)}%</b></div><div class="score-meter"><span style="width:${result.paint}%"></span></div></div></div>${result.kiln?`<div class="kiln-verdict grade-${result.kiln.grade}">火候 ${result.kiln.label} · 金币 ×${result.kiln.multiplier}</div>`:''}<div class="reward-breakdown"><span>基础奖励 <b>${result.baseEarned}</b> 币</span><span>火候加成 <b>+${result.kilnBonus}</b> 币</span><span>交付台加成 <b>+${result.serveBonus}</b> 币</span><span>效率奖励 <b>+${result.efficiencyBonus}</b> 币</span><span>首次通关 <b>+${result.firstPassBonus}</b> 币</span></div><div class="efficiency-result"><b>${result.efficiency.qualified?'效率达标 · +20%':'原有收益完整保留'}</b><span>效率用时 ${formatElapsed(result.efficiency.elapsedMs)} / 05:00</span></div><div class="earnings-banner"><b>+${result.earned} <small>硬币</small></b><span>当前余额 ${state.money} 币 · 本场景 ${state.scenePassed}/${ORDERS_PER_SCENE} 关</span></div>${rewardTable()}<div class="task-action-row"><button class="primary-button" id="result-next">${next} <span>→</span></button></div>`);
 activeTask.result=result;$('result-next').onclick=()=>{if(result.practice||state.sceneComplete)openJourney();else openBrief();};updateUI();if(result.passed)confetti();
}
function openSupply(){if(!tutorialGate('clay'))return;
 if(!state.canWork){openJourney();return;}
 taskShell('supply',`${state.sceneInfo.name} · 第 ${state.level+1} 关`,'从一块瓷泥开始','领取瓷泥后，依次塑形、雕刻、上色，再烧制交付。五分钟内通过，订单收益 +20%。',`<div class="preset-gallery">${(state.phase==='practice'?[state.preset]:CAMPAIGN_PRESETS).map((p,i)=>`<article class="preset-gallery-card ${i===state.level?'current':''}"><img src="${presetImages[p.id]}" alt="${p.name}"/><span>第 ${i+1} 关</span><b>${p.name}</b><small>${state.sceneResults.some(r=>r.level===i+1)?'✓ 已通过':i===state.level?'当前订单':'80% 解锁下一关'}</small></article>`).join('')}</div><div class="task-action-row"><button class="secondary-button" id="supply-brief">查看订单</button><button class="primary-button" id="fresh-clay">领取完整瓷泥 <span>→</span></button></div>`);
 $('supply-brief').onclick=openBrief;$('fresh-clay').onclick=()=>{syncClocks();if(state.hasClay)openRestart();else if(state.collectClay()){sound('clay');closeTask();toast('瓷泥已领取，去工作台开始制作吧。');}};
 mountStationInfo('clay');
}
function openRestart(){
 if(nearest?.id!=='clay'){toast('请到取泥台领取新瓷泥。');return;}
 if(!state.canWork){openJourney();return;}
 taskShell('restart','重新制作','换一块新瓷泥？','当前作品会重置，已通过的关卡、藏品与硬币会保留。',`<div class="task-action-row"><button class="secondary-button" id="cancel-restart">保留作品</button><button class="primary-button" id="confirm-restart">领取新瓷泥 <span>↺</span></button></div>`);
 $('cancel-restart').onclick=closeTask;$('confirm-restart').onclick=()=>{syncClocks();state.restart();if(state.collectClay())sound('clay');closeTask();};
}
$('discard-button').onclick=()=>toast('走到取泥台，可以换一块新瓷泥。');$('discard-button').title='到取泥台更换瓷泥';
function openJourney(){
 if(state.phase==='decal'||state.phase==='crafted'){openDecal();return;}
 if(state.completed){openCollection();return;}
 const theme=state.sceneInfo;
 taskShell('journey',`场景 ${state.scene+1} / 4 · 贴画工坊`,theme.decal,theme.description,`<div class="journey-layout"><div class="bowl-stage"><canvas id="bowl-preview" aria-label="${theme.product}成品预览，可拖动旋转"></canvas><span class="preview-caption">成品预览 · 拖动旋转</span></div><div class="decal-details"><span class="board-label">参考图 ${String(state.scene+1).padStart(2,'0')} · 按上传顺序</span><div class="reference-texture"><img src="${theme.reference}" alt="用户提供的第 ${state.scene+1} 张陶瓷参考图"/><span>→</span><img src="${decalImages[state.scene]}" alt="${theme.decal}环绕贴图"/></div><h3>${theme.product}</h3><p>完成本场景三关，用 400 硬币购买贴画；亲手贴到白瓷碗上，开启下一场景。</p><div class="purchase-check ${state.sceneComplete?'met':''}"><span>${state.sceneComplete?'✓':'○'}</span> 三关通过 <b>${state.scenePassed} / ${ORDERS_PER_SCENE}</b></div><div class="purchase-check ${state.money>=400?'met':''}"><span>${state.money>=400?'✓':'○'}</span> 硬币余额 <b>${state.money} / 400</b></div><button class="primary-button" id="buy-decal" ${state.canPurchase?'':'disabled'}>购买贴画 · ${DECAL_PRICE} 币 <span>→</span></button><small class="purchase-note">${state.canPurchase?`购买后余额 ${state.money-400} 币；剩余硬币带入下一场景。`:state.sceneComplete?'余额不足，可以完成练习订单获得硬币。':'先完成本场景的三个订单。'}</small>${state.phase==='ready'?'<button class="secondary-button" id="practice-order">接一个练习订单</button>':''}${state.canWork?'<button class="secondary-button" id="return-order">继续当前订单</button>':''}</div></div>`, '达到 400 币即可购买 · 贴好后进入下一场景 · 每个场景限购一次');
 activeTask.preview=createBowlPreview($('bowl-preview'),{index:state.scene,decorated:true});
 $('buy-decal').onclick=()=>{if(state.buyDecal()){save();updateUI();sound('coin');openDecal();}};
 if($('practice-order'))$('practice-order').onclick=openPracticePicker;
 if($('return-order'))$('return-order').onclick=openBrief;
}
function openPracticePicker(){
 if(state.phase!=='ready')return;
 taskShell('practice-picker','可选练习','选择练习订单','练习可以赚取硬币，不增加本场景的三单进度。',`<div class="preset-gallery">${PRESETS.map((p,i)=>`<button class="preset-gallery-card" data-practice-design="${i}"><img src="${presetImages[p.id]}" alt="${p.name}"/><b>${p.name}</b></button>`).join('')}</div>`);
 document.querySelectorAll('[data-practice-design]').forEach(button=>button.onclick=()=>{if(state.beginPractice(Number(button.dataset.practiceDesign))){updateUI();openBrief();}});
}
function openDecal(){
 const crafted=state.phase==='crafted',theme=state.sceneInfo;
 taskShell(crafted?'crafted':'decal',`场景 ${state.scene+1} / 4 · ${crafted?'成品完成':'贴花台'}`,crafted?`${theme.product}，完成！`:'为白瓷碗贴上新纹样',crafted?'这件瓷器已经收进你的藏品。准备去下一处工坊吧。':'先选择右侧贴画，再点击白瓷碗或“贴到碗上”。拖动瓷碗可以旋转查看。',`<div class="journey-layout"><div class="bowl-stage"><canvas id="bowl-preview" aria-label="${crafted?theme.product:'待贴花的白瓷碗'}，拖动旋转"></canvas><span class="preview-caption" id="decal-status">${crafted?'已贴好 · 拖动欣赏':'白瓷素胎 · 等待贴画'}</span></div><div class="decal-details"><span class="board-label">${crafted?'已收藏的纹样':'你的新贴画'}</span><button class="decal-picker ${crafted?'selected':''}" id="select-decal" aria-pressed="${crafted}"><img src="${decalImages[state.scene]}" alt="${theme.decal}"/><b>${theme.decal}</b><span>${crafted?'✓ 已贴到碗上':'点击选择这张贴画'}</span></button><p>${theme.description}</p>${crafted?`<div class="completion-seal">✓ 第 ${state.scene+1} 件瓷器已收藏</div><button class="primary-button" id="next-scene">${state.scene===3?'完成旅程 · 查看四件藏品':'进入下一场景：'+SCENES[state.scene+1].name} <span>→</span></button>`:'<button class="primary-button" id="apply-decal" disabled>贴到碗上 <span>✦</span></button>'}<small class="purchase-note">${crafted?'剩余硬币 '+state.money+' 币，将继续保留。':'购买已完成。离开或刷新页面后，可以继续贴花。'}</small></div></div>`);
 let selected=false;
 const apply=()=>{if(!selected||!state.applyDecal())return;save();sound('coin');updateUI();openDecal();confetti();};
 activeTask.preview=createBowlPreview($('bowl-preview'),{index:state.scene,decorated:crafted,onApply:crafted?null:apply});
 if(!crafted){$('select-decal').onclick=()=>{selected=true;$('select-decal').classList.add('selected');$('select-decal').setAttribute('aria-pressed','true');$('apply-decal').disabled=false;$('decal-status').textContent='贴画已选中 · 点击瓷碗完成贴花';};$('apply-decal').onclick=apply;}
 else{$('select-decal').disabled=true;$('next-scene').onclick=()=>{const previous=state.scene;if(state.nextScene()){updateUI();if(state.completed)openCollection();else openCityMap(previous);}};}
}
function openCollection(){
 taskShell('collection',`瓷器之旅 · ${state.collection.length} / 4 件藏品`,state.completed?'四方瓷韵，圆满收藏':'你的瓷器藏品',state.completed?'四个场景、十二个订单，四张贴画都成为了你亲手完成的瓷碗。':'按参考图的顺序，走过四个工坊，收集四种瓷器。',`<div class="collection-grid">${SCENES.map((s,i)=>{const owned=state.collection.some(c=>c.scene===i);return `<article class="collection-card ${owned?'owned':'locked'}"><span>0${i+1} · ${s.name}</span>${owned?`<button data-bowl="${i}" aria-label="欣赏${s.product}"><img src="${bowlImage(i)}" alt="已制作的${s.product}"/></button>`:`<div class="locked-bowl"><img src="${decalImages[i]}" alt="待收集的${s.decal}"/><b>待收藏</b></div>`}<h3>${s.product}</h3><p>${owned?'✓ 已贴花 · 已收藏':'三关通关 + 400 硬币'}</p></article>`;}).join('')}</div><p class="collection-money">剩余 ${state.money} 硬币</p><div class="task-action-row">${state.completed?'<button class="secondary-button" id="replay">重新开启旅程</button><button class="primary-button" id="collection-done">返回工坊</button>':'<button class="primary-button" id="continue-journey">继续旅程 <span>→</span></button>'}</div>`);
 document.querySelectorAll('[data-bowl]').forEach(b=>b.onclick=()=>openOwnedBowl(Number(b.dataset.bowl)));
 if($('continue-journey'))$('continue-journey').onclick=routeTask;
 if($('replay'))$('replay').onclick=requestNewGame;
 if($('collection-done'))$('collection-done').onclick=closeTask;
}
function openOwnedBowl(index){
 taskShell('crafted','我的藏品',SCENES[index].product,SCENES[index].description,'<div class="bowl-stage single-bowl"><canvas id="bowl-preview" aria-label="已收藏瓷碗，可拖动旋转"></canvas><span class="preview-caption">拖动旋转 · 查看环绕纹样</span></div><div class="task-action-row"><button class="primary-button" id="back-collection">返回藏品</button></div>');
 activeTask.preview=createBowlPreview($('bowl-preview'),{index,decorated:true});$('back-collection').onclick=openCollection;
}

function openCityMap(from=null){
 if(!started)return;
 const traveling=from!==null;
 taskShell(traveling?'travel':'citymap',traveling?`${PLACES[from].shortName} → ${PLACES[state.scene].shortName}`:'景德镇 · 四站游历图',traveling?'循着地图，走向下一站':'你的瓷都足迹',traveling?PLACES[state.scene].chapter:'沿地图上的 1—4 号地点，完成三关、收集贴画，把每一站做成一件纪念。','<div id="city-map-content"></div>','游戏探索路线 · 当前关卡、硬币与瓷器进度自动保存');
 activeTask.cityMap=createCityMap($('city-map-content'),{state,from,onContinue:()=>routeTask(),onReplay:()=>{closeTask();started=false;opening.show(true);}});
}

function requestNewGame(){
 taskShell('restart','重新开启旅程','从第一间工坊重新开始？','会清空本次旅程的关卡、硬币和四件藏品。', '<div class="task-action-row"><button class="secondary-button" id="cancel-new">取消</button><button class="primary-button" id="confirm-new">重新开始</button></div>');
 $('cancel-new').onclick=closeTask;$('confirm-new').onclick=()=>{state=new SculptureChallenge();started=true;$('welcome').classList.add('hidden');updateUI();opening.show(true);started=false;closeTask();};
}
function confetti(){for(let i=0;i<25;i++){const e=document.createElement('div');e.className='confetti';e.style.cssText=`left:60%;top:40%;background:${['#315fa9','#e1bc76','#d5a0ba'][i%3]};--dx:${Math.cos(i*2.4)*(100+i*7)}px;--dy:${140+Math.sin(i*7)*140}px;animation-delay:${i*.02}s`;$('app').append(e);setTimeout(()=>e.remove(),3000);}}
function stationMessage(id){return {clay:'领取完整瓷泥',wheel:'推压瓷泥，调整形状',carve:'用刻刀去除多余瓷泥',paint:state.fired?'烧成后补绘青花':'选择颜色，亲手绘制',kiln:state.kilnResult?'查看火候结果':state.kiln?'继续烧制瓷器':'烧制瓷器 · 按住空格鼓风',serve:state.canWork?'提交作品并评分':'购买贴画与制作成品'}[id];}
function openStation(id){if(activeTask||helpOpen||!started)return;if(!tutorialGate(id))return;sound();if(!state.canWork){openJourney();return;}({clay:openSupply,wheel:()=>openEditor('wheel'),carve:()=>openEditor('carve'),paint:()=>openEditor('paint'),kiln:openKiln,serve:openReview})[id]();}
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase();
 if(!started){if(key==='escape'){e.preventDefault();opening?.skip();}else if(key==='enter'&&$('welcome').dataset.openingStage==='map'&&e.target.tagName!=='BUTTON'){e.preventDefault();$('start-button').click();}return;}
 if(key==='escape'){e.preventDefault();if(helpOpen)hideHelp();else if(activeTask)closeTask();return;}
 if(key===' '&&activeTask?.kind==='kiln'&&!helpOpen){e.preventDefault();if(e.repeat||document.hidden||!focused)return;changeStoke('space',true);return;}
 if(helpOpen||document.hidden||!focused)return;
 if(activeTask?.editor){if((e.metaKey||e.ctrlKey)&&key==='z'){e.preventDefault();e.shiftKey?activeTask.editor.redo():activeTask.editor.undo();return;}if(key==='['||key===']'){e.preventDefault();const slider=$('brush-size');slider.value=Math.max(Number(slider.min),Math.min(Number(slider.max),Number(slider.value)+(key===']'?1:-1)));activeTask.editor.setRadius(slider.value);$('brush-size-value').textContent=slider.value;return;}return;}
 if(activeTask||helpOpen)return;
 if(e.target.matches('input,textarea,[contenteditable=true]'))return;
 if(key==='f'){e.preventDefault();if(e.repeat)return;nearest=world.nearest();if(nearest){sound('click');openStation(nearest.id);}return;}
 if([' ','arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)){e.preventDefault();keys.add(key);}
});
window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();keys.delete(key);if(key===' ')changeStoke('space',false);});
window.addEventListener('blur',()=>{syncClocks();releaseStoke();focused=false;keys.clear();activeTask?.editor?.finish();syncClocks();updateEfficiency();save();});
window.addEventListener('focus',()=>{syncClocks();focused=true;syncClocks();updateEfficiency();});
document.addEventListener('visibilitychange',()=>{syncClocks();previousTime=0;if(document.hidden){releaseStoke();keys.clear();activeTask?.editor?.finish();}syncClocks();updateEfficiency();save();});
window.addEventListener('beforeunload',()=>{syncClocks();save();});window.addEventListener('pagehide',()=>{syncClocks();save();});window.addEventListener('resize',()=>world.resize());
document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.move);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.move);});
$('touch-interact').onpointerdown=e=>{e.preventDefault();if(!started||activeTask||helpOpen)return;nearest=world.nearest();if(nearest)openStation(nearest.id);};
function frame(ms){
 const t=ms/1000,elapsed=previousTime?Math.max(0,t-previousTime):0,dt=Math.min(.05,elapsed);previousTime=t;
 syncClocks();if(ms-lastClockSave>=1000){lastClockSave=ms;if(state.hasClay)save();updateEfficiency();}
 activeTask?.preview?.update?.(elapsed,state,!kilnRunning);
 const playing=started&&!activeTask&&!helpOpen&&!document.hidden&&focused;world.setInteractionEnabled(playing);$('reset-view').disabled=!playing;const dx=playing?Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')):0,dz=playing?Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')):0;
 const strideBefore=world.stride;world.move(dx,dz,dt);if(world.stride>strideBefore)state.advanceTutorial('move');sfx.walk(world.stride,world.stride>strideBefore,state.hasClay);sfx.firing(!!state.kiln&&kilnRunning);sfx.tick();nearest=world.nearest();$('world').dataset.player=JSON.stringify({x:world.player.group.position.x,z:world.player.group.position.z});$('app').dataset.task=activeTask?.kind||'';$('app').dataset.level=state.level+1;$('app').dataset.attempt=state.attempt;
 for(const s of STATIONS){const p=world.project(s.x,s.labelY,s.z);labels[s.id].style.left=`${p.x}px`;labels[s.id].style.top=`${p.y}px`;labels[s.id].classList.toggle('near',playing&&nearest?.id===s.id);}
 $('kiln-small').textContent=state.kiln?`${Math.ceil(state.kiln.remaining)}s`:state.kilnResult?'✓':'';
 const interact=playing&&nearest;$('interaction').classList.toggle('hidden',!interact);
 if(interact){const p=world.project(world.player.group.position.x,2.25,world.player.group.position.z);$('interaction').style.left=`${Math.max(125,Math.min($('world-wrap').clientWidth-125,p.x+128))}px`;$('interaction').style.top=`${Math.max(4,p.y-76)}px`;$('interact-title').textContent=stationMessage(nearest.id);$('interact-sub').textContent='按 F 开始操作';}
 updateTutorial();updateKiln();if(started&&!activeTask?.editor)world.update(dt,t,state,playing);requestAnimationFrame(frame);
}
let heroCarousel=null;
function mountHero(host){heroCarousel?.dispose();heroCarousel=host?createHeroCarousel(host):null;updateSoundButtons();refreshLang();}
opening=createOpening($('welcome'),{getState:()=>state,onStart:enterGame,onNewGame:()=>{started=true;requestNewGame();},onPorcelain:mountHero});
document.addEventListener('click',e=>{if(e.target.closest('[data-lang-toggle]'))toggleLang();});
function refreshLang(){document.querySelectorAll('[data-lang-toggle]').forEach(b=>{b.textContent=langButtonLabel();b.setAttribute('aria-label',document.documentElement.lang==='en'?'切换到中文':'Switch to English');});}
onLangChange(refreshLang);initI18n();refreshLang();
if(import.meta.env.DEV)window.__terra={get state(){return state;},world,sfx,music,closeTask,showHelp,hideHelp,openStation,openKiln,openUpgrades,syncClocks,openJourney,openCityMap,setLang,toggleLang,enter:enterGame};
updateUI();requestAnimationFrame(frame);
