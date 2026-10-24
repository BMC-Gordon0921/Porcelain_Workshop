import './style.css';
import './challenge.css';
import './journey.css';
import './city-map.css';
import './upgrade.css';
import {PLACES} from './places.js';
import {createOpening, createCityMap} from './city-map.js';
import {SculptureChallenge, PRESETS, DESIGNS, PALETTE, COLOR_NAMES, createTarget, KILN_GRADES, KILN_WINDOWS} from './sculpture.js';
import {SAVE_KEY, SCENES, DECAL_PRICE} from './campaign.js';
import {attachEditor, thumbnail} from './sculpture-view.js';
import {createBowlPreview, decalImage, bowlImage} from './decals.js';
import {createWorld, STATIONS} from './world.js';
import {createHeroCarousel} from './hero-carousel.js';
import {initI18n, setLang, toggleLang, onLangChange, langButtonLabel} from './i18n.js';
import {icon} from './art.js';
import logoMark from './assets/logo-mark.png';
const $=id=>document.getElementById(id);
let saved=null;
try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||sessionStorage.getItem(SAVE_KEY)||sessionStorage.getItem('terra-porcelain-challenge-v4')||'null');}catch{}
let state=SculptureChallenge.restore(saved);
const world=createWorld($('world'));
const presetImages=Object.fromEntries(PRESETS.map(p=>[p.id,thumbnail(createTarget(p.id))]));
const decalImages=SCENES.map((_,i)=>decalImage(i));
let started=false,helpOpen=false,activeTask=null,nearest=null,previousTime=0,toastTimeout;
const keys=new Set();let soundEnabled=false,audioCtx=null,opening=null;
function save(){const value=JSON.stringify(state.serialize());try{sessionStorage.setItem(SAVE_KEY,value);}catch{}try{localStorage.setItem(SAVE_KEY,value);}catch{}}
function sound(kind='tap'){if(!soundEnabled)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const notes=kind==='coin'?[523,659,784,1047]:kind==='fail'?[294,247,196]:[392,523];notes.forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+i*.08;o.frequency.value=f;g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.001,t+.24);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+.25);});}catch{}}
function toast(message){clearTimeout(toastTimeout);$('toast').textContent=message;$('toast').classList.add('show');toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),4200);}
$('brand-mark').innerHTML=`<img src="${logoMark}" alt="terra little clay workshop"/>`;$('coin-icon').innerHTML=icon('coin');$('sound-button').innerHTML=icon('muted');
$('sound-button').onclick=()=>{soundEnabled=!soundEnabled;$('sound-button').innerHTML=icon(soundEnabled?'sound':'muted');$('sound-button').setAttribute('aria-label',soundEnabled?'关闭声音':'开启声音');sound();};
const labels={};STATIONS.forEach((s,i)=>{const el=document.createElement('div');el.className='station-label';el.innerHTML=`<span class="station-num">${i+1}</span><span>${s.name}</span>${s.id==='kiln'?'<span class="kiln-small" id="kiln-small"></span>':''}`;$('station-labels').append(el);labels[s.id]=el;});
const rewardTable=()=>`<div class="reward-table" aria-label="评分奖励表">${[["低于60%",0],["60–69%",60],["70–79%",70],["80–89%",80],["90–99%",90],["100%",100]].map(([score,coins])=>`<div><span>${score}</span><b>${coins}<small> 币</small></b></div>`).join('')}</div>`;
function updateUI(){
 const p=state.preset,theme=state.sceneInfo;
 document.documentElement.style.setProperty('--scene-accent',theme.accent);document.documentElement.style.setProperty('--scene-light',theme.light);world.setScene(state.scene);
 $('money').innerHTML=`${state.money}<span> 硬币</span>`;
 document.querySelector('.day-pill b').textContent=PLACES[state.scene].shortName;
 document.querySelector('.day-pill small').textContent=`场景 ${state.scene+1} / 4 · ${theme.decal}`;
 document.querySelector('.commissions').innerHTML=`<div class="scene-heading"><span>瓷器之旅 · ${state.scene+1} / 4</span><h2 title="${theme.name}">${PLACES[state.scene].shortName}</h2></div><div class="scene-path">${SCENES.map((s,i)=>`<span class="${i===state.scene?'current':''} ${i<state.collection.length?'done':''}" title="${s.name}">${i<state.collection.length?'✓':String(i+1).padStart(2,'0')}</span>`).join('')}</div><button class="reference-card" id="view-brief"><div class="reference-heading"><span>${state.phase==='practice'?'练习订单':`第 ${state.level+1} 关 / 5`}</span><span>80% 通关</span></div><img src="${presetImages[p.id]}" alt="${p.name}参考图"/><h3>${p.name}</h3><p>60% 起奖励 · 火候加成最高 125 硬币</p><span class="reference-link">${state.canWork?'查看订单 ↗':'五关已完成 ✓'}</span></button><div class="preset-path">${PRESETS.map((d,i)=>`<div class="preset-step ${i===state.level?'current':''} ${state.sceneResults.some(r=>r.level===i+1)?'passed':''}" title="第 ${i+1} 关：${d.name}"><img src="${presetImages[d.id]}" alt="${d.name}"/><span>${state.sceneResults.some(r=>r.level===i+1)?'✓':i+1}</span></div>`).join('')}</div><button class="decal-goal" id="open-journey"><img src="${decalImages[state.scene]}" alt="${theme.decal}贴画"/><div><small>本场景贴画 · 400 币</small><b>${theme.decal}</b><span>${state.phase==='decal'?'已购买 · 点击贴花':state.phase==='crafted'?'已制成 · 进入下一场景':state.completed?'四件作品已集齐':`${state.scenePassed}/5 关 · ${state.money}/400 币`}</span></div><span>↗</span></button><button class="collection-link" id="view-collection">我的瓷器藏品 <b>${state.collection.length} / 4</b></button>`;
 $('view-brief').onclick=routeTask;$('open-journey').onclick=openJourney;$('view-collection').onclick=openCollection;
 $('carrying').classList.toggle('hidden',!state.hasClay);$('carry-art').innerHTML=`<img src="${thumbnail(state.piece.pixels,112)}" alt="当前瓷泥"/>`;$('carry-name').textContent=p.name;$('carry-stage').textContent=`第 ${state.level+1} 关 · 第 ${state.attempt} 次尝试`;
 $('guide-number').textContent=String(state.scene+1).padStart(2,'0');$('guide-kicker').textContent=state.canWork?'80% 通关 · 60% 起奖励':'五关完成 · 制作场景成品';$('guide-title').textContent=state.canWork?(state.hasClay?(state.canSubmit?'烧制完成 · 前往交付台':'塑形、雕刻、上色后烧窑'):'到取泥台领取瓷泥'):'点击右侧贴画，完成你的瓷碗';$('guide-copy').textContent=state.canWork?'走近对应工作台，按 F 开始操作。':'购买 → 选择贴画 → 贴到碗上 → 下一场景';
 $('app').dataset.scene=String(state.scene+1);$('app').dataset.phase=state.phase;save();
}
function cleanupTask(){activeTask?.editor?.finish();activeTask?.preview?.dispose();activeTask?.cityMap?.dispose();}
function taskShell(kind,eyebrow,title,description,body,footer='进度自动保存。按 Esc 返回工坊。'){
 cleanupTask();activeTask={kind};world.setInteractionEnabled(false);keys.clear();clearTimeout(toastTimeout);$('toast').classList.remove('show');$('task-overlay').classList.remove('hidden');document.querySelector('.task-panel').classList.toggle('atlas-panel',kind==='citymap'||kind==='travel');document.querySelector('.task-panel').classList.toggle('wide-panel',['editor','result','brief','journey','decal','crafted','collection','citymap','travel'].includes(kind));
 $('task-eyebrow').textContent=eyebrow;$('task-title').textContent=title;$('task-description').textContent=description;$('task-body').innerHTML=body;$('task-footer').innerHTML=footer;$('close-task').focus();
}
function closeTask(){cleanupTask();state.endStation();activeTask=null;keys.clear();$('task-overlay').classList.add('hidden');updateUI();}
$('close-task').onclick=closeTask;
function routeTask(){if(state.canWork)openBrief();else if(state.completed)openCollection();else openJourney();}
function openBrief(){
 if(!state.canWork){openJourney();return;}
 const p=state.preset;taskShell('brief',`${state.sceneInfo.name} · ${state.phase==='practice'?'练习订单':`第 ${state.level+1} 关 / 5`} · 尝试 ${state.attempt}`,p.name,p.task,`<div class="brief-pair"><figure><span class="board-label">${state.hasClay?'你正在制作的瓷泥':'初始瓷泥'}</span><img src="${thumbnail(state.piece.pixels,448)}" alt="当前瓷泥"/><figcaption>${state.hasClay?'保留当前作品，继续完善。':'到取泥台领取一整块瓷泥。'}</figcaption></figure><div class="brief-arrow">→</div><figure><span class="board-label">订单参考图</span><img src="${presetImages[p.id]}" alt="${p.name}"/><figcaption>对照形状与蓝色装饰，自由制作。</figcaption></figure></div><div class="brief-rules"><span><b>达到 80% 通关</b>未通过则重试本关，已获得硬币保留。</span><span><b>累计 400 币购买贴画</b>完成五关后购买，贴到瓷碗上进入下一场景。</span></div>${rewardTable()}<div class="task-action-row"><button class="primary-button" id="brief-done">${state.hasClay?'继续制作':'去领取瓷泥'} <span>→</span></button></div>`);
 $('brief-done').onclick=closeTask;
}
function enterGame(){heroCarousel?.pause();started=true;sound();world.resize();routeTask();}
$('map-button').onclick=()=>openCityMap();
$('reset-view').onclick=()=>{if(started&&!activeTask&&!helpOpen)world.resetView();};
function showHelp(){helpOpen=true;world.setInteractionEnabled(false);keys.clear();$('help-overlay').classList.remove('hidden');$('help-done').focus();}
function hideHelp(){helpOpen=false;$('help-overlay').classList.add('hidden');keys.clear();}
$('help-button').onclick=showHelp;$('close-help').onclick=hideHelp;$('help-done').onclick=hideHelp;
function openEditor(station){
 if(!state.canWork){openJourney();return;}
 if(nearest?.id!==station)return;
 if(!state.hasClay){toast('请先到取泥台领取瓷泥。');return;}
 if(!state.startStation(station))return;
 const setup={wheel:{mode:'push',name:'粗塑成形',title:'用双手推压瓷泥',description:'从外边缘向内拖动以压缩瓷泥，向外拖动以拉伸。用宽手掌调整大体形状，再去雕刻台修整。',tool:'✋ 推压瓷泥 · 宽手掌',min:14,max:26,size:18,note:'这里只能推压塑形，现有颜色会随瓷泥一起移动。雕刻和上色请去对应工作台。'},carve:{mode:'cut',name:'细节雕刻',title:'刻去多余的瓷泥',description:'拖动刻刀去除多余瓷泥，对照右侧图片修整轮廓。刻多了可以撤销。',tool:'✂ 雕刻 · 刻刀',min:1,max:14,size:4,note:'这里只能去除瓷泥。推压造型请去塑形台，绘制颜色请去上色台。'},paint:{mode:'paint',name:'手绘上色',title:'画上你的青花',description:'选择颜色，在瓷器表面拖动画笔。上色只改变颜色，不改变轮廓。',tool:'● 上色 · 画笔',min:1,max:16,size:5,note:'这里只能绘画。切去瓷泥请去雕刻台，改变造型请去塑形台。'}}[station];
 const p=state.preset;
 taskShell('editor',`第 ${state.level+1} 关 · ${setup.name} · 尝试 ${state.attempt}`,setup.title,setup.description,`<div class="editor-layout"><section class="work-area"><div class="board-top"><span class="board-label">你的瓷泥 · 正面</span><span id="work-status">已保存</span></div><div class="sculpt-canvas-wrap"><canvas id="sculpt-canvas" width="560" height="560" tabindex="0" aria-label="${setup.name}. Drag to ${setup.mode==='push'?'push clay':setup.mode==='cut'?'cut clay':'paint clay'}. Compare with the separate reference picture."></canvas><span class="canvas-corner">亲手制作</span></div><div class="tool-row"><span class="station-tool" data-station-tool="${setup.mode}">${setup.tool}</span><button class="small-tool" id="undo-stroke" title="Undo this station's last stroke (Ctrl/Cmd Z)" aria-label="Undo stroke">↶</button><button class="small-tool" id="redo-stroke" title="Redo stroke" aria-label="Redo stroke">↷</button></div><div class="brush-row"><label for="brush-size">${setup.mode==='push'?'手掌宽度':'工具大小'}</label><input type="range" id="brush-size" min="${setup.min}" max="${setup.max}" value="${setup.size}"/><output id="brush-size-value">${setup.size}</output><span class="station-only">${setup.mode==='push'?'仅用于粗塑':'本站专用工具'}</span></div></section><aside class="editor-reference"><span class="board-label">订单参考图</span><img class="target-preview" src="${presetImages[p.id]}" alt="Target ${p.name}"/><h3>${p.name}</h3><p>${p.task}</p>${setup.mode==='paint'?`<div class="palette-label">选择颜色</div><div class="paint-colors">${PALETTE.slice(1).map((c,i)=>`<button class="paint-color ${i===1?'selected':''}" data-color="${i+1}" style="--paint:${c}" title="${COLOR_NAMES[i+1]}" aria-label="${COLOR_NAMES[i+1]} paint"><span></span></button>`).join('')}</div><span class="color-name" id="color-name">钴蓝</span>`:''}<div class="maker-tip station-note"><b>${setup.name}</b><p>${setup.note}</p></div><p class="guide-note" id="tool-hint">对照参考图，观察形状与花纹。</p></aside></div><div class="editor-bottom"><button class="primary-button" id="save-editor">保存并离开 <span>→</span></button><span>完成制作后先到窑炉烧制，再到交付台评分。</span></div>`, '<span>拖动操作</span><span><kbd>⌘ / Ctrl Z</kbd> 撤销本次操作</span><span><kbd>[</kbd><kbd>]</kbd> 工具大小</span><span><kbd>Esc</kbd> 保存并关闭</span>');
 const editor=attachEditor($('sculpt-canvas'),state,{mode:setup.mode,onHint:message=>{if($('tool-hint').textContent!==message)$('tool-hint').textContent=message;},onChange:()=>{$('work-status').textContent='正在制作…';},onFinish:()=>{$('work-status').textContent='已保存';save();}});activeTask.editor=editor;activeTask.station=station;editor.setRadius(setup.size);
 document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{editor.setColor(b.dataset.color);document.querySelectorAll('[data-color]').forEach(c=>c.classList.toggle('selected',c===b));$('color-name').textContent=COLOR_NAMES[b.dataset.color];});
 $('brush-size').oninput=e=>{editor.setRadius(e.target.value);$('brush-size-value').textContent=e.target.value;};$('undo-stroke').onclick=()=>editor.undo();$('redo-stroke').onclick=()=>editor.redo();$('save-editor').onclick=closeTask;
}
const KILN_ARC=a=>-120+a*240;
const kilnPoint=(angle,r)=>{const rad=angle*Math.PI/180;return [110+r*Math.sin(rad),114-r*Math.cos(rad)];};
function kilnArc(from,to,r0,r1){const [x0,y0]=kilnPoint(from,r0),[x1,y1]=kilnPoint(to,r0),[x2,y2]=kilnPoint(to,r1),[x3,y3]=kilnPoint(from,r1);const large=Math.abs(to-from)>180?1:0;return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r0} ${r0} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r1} ${r1} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;}
function openKiln(){
 if(!state.hasClay){toast('请先到取泥台领取瓷泥。');return;}
 const good=kilnArc(KILN_ARC(KILN_WINDOWS.good[0]),KILN_ARC(KILN_WINDOWS.good[1]),93,65);
 const perfect=kilnArc(KILN_ARC(KILN_WINDOWS.perfect[0]),KILN_ARC(KILN_WINDOWS.perfect[1]),93,65);
 taskShell('kiln','提交前必经 · 瓷器窑炉','让窑火温暖你的作品','在 9 秒烧制中，指针进入火候区间时按一次空格。一般 / 成功 / 完美分别获得金币 ×1 / ×1.1 / ×1.25；未按键记为一般。',`<div class="kiln-view"><div class="kiln-preview"><img src="${thumbnail(state.piece.pixels,224)}" alt="你的作品"/></div></div><div class="kiln-gauge-wrap"><svg class="kiln-gauge" viewBox="0 0 220 214" role="img" aria-label="火候判定扇环"><path class="kiln-track" d="${kilnArc(-120,120,93,65)}"/><path class="kiln-good" d="${good}"/><path class="kiln-perfect" d="${perfect}"/><g id="kiln-needle" class="live" transform="rotate(-120 110 114)"><line x1="110" y1="30" x2="110" y2="62"/><circle cx="110" cy="26" r="4"/></g></svg><div class="kiln-readout"><strong id="kiln-percent">0<small>%</small></strong><span id="kiln-grade" role="status" aria-live="polite">等待烧制</span></div></div><div class="kiln-legend"><span>一般 ×1</span><span class="grade-good">成功 ×1.1</span><span class="grade-perfect">完美 ×1.25</span></div><p class="kiln-caption" id="kiln-caption">在扇环里按下空格，锁定火候。</p><div class="task-action-row"><button class="primary-button" id="fire-button">开始烧制 <span>✦</span></button><button class="secondary-button" id="strike-button">锁定火候 <span>空格</span></button></div>`);
 $('fire-button').onclick=()=>{if(state.kilnResult){closeTask();return;}if(state.fire()){sound();save();updateKiln();$('strike-button').focus();}};
 $('strike-button').onclick=strikeKiln;
 updateKiln();
}
function announceKiln(){
 const grade=KILN_GRADES[state.kilnResult.grade];save();sound('coin');if(activeTask?.kind!=='kiln')toast(`火候${grade.label} · 本关金币 ×${grade.multiplier}`);
}
function strikeKiln(){
 if(helpOpen||activeTask?.kind!=='kiln'||document.hidden)return;
 if(state.strike()){announceKiln();updateKiln();}
}
function updateKiln(){
 if(activeTask?.kind!=='kiln')return;
 const k=state.kiln,result=state.kilnResult,p=state.kilnProgress(),pct=Math.round(p*100);
 if($('kiln-percent').dataset.value!==String(pct)){$('kiln-percent').dataset.value=String(pct);$('kiln-percent').innerHTML=`${pct}<small>%</small>`;}
 $('kiln-needle').setAttribute('transform',`rotate(${KILN_ARC(p)} 110 114)`);
 const status=result?result.grade:k?'firing':'idle';
 if(activeTask.kilnStatus===status)return;activeTask.kilnStatus=status;
 const grade=$('kiln-grade'),firing=!!k;
 grade.className=result?`grade-${result.grade}`:'';
 grade.textContent=result?KILN_GRADES[result.grade].label:firing?'判定中…':'等待烧制';
 $('strike-button').classList.toggle('hidden',!firing);$('strike-button').disabled=!firing;
 const fire=$('fire-button');fire.disabled=firing;
 fire.innerHTML=result?'完成 · 返回工坊 <span>✦</span>':firing?'烧制中…':'开始烧制 <span>✦</span>';
 $('kiln-caption').textContent=result?`火候${KILN_GRADES[result.grade].label} · 金币 ×${KILN_GRADES[result.grade].multiplier}`:firing?'按空格锁定火候；退出面板会暂停烧制。':'修改作品后需要重新烧制。';
 $('kiln-needle').classList.toggle('live',firing);
 if(result)fire.focus();
}
function openReview(){
 if(nearest?.id!=='serve')return;if(!state.canWork){openJourney();return;}if(!state.hasClay){toast('先带上你制作的瓷器，再到这里评分。');return;}
 taskShell('review',`${state.sceneInfo.name} · 第 ${state.level+1} 关`,'看看这件作品吧','评分由形状 65% 和上色 35% 组成。达到 80% 通过本关；低于 80% 重试，60% 起仍可获得硬币。',`<div class="review-pair"><figure><img src="${thumbnail(state.piece.pixels,336)}" alt="你的作品"/><figcaption>你的作品</figcaption></figure><figure><img src="${presetImages[state.preset.id]}" alt="参考作品"/><figcaption>参考作品</figcaption></figure></div>${rewardTable()}<div class="task-action-row"><button class="secondary-button" id="keep-working">继续完善</button><button class="primary-button" id="confirm-review">提交评分 <span>→</span></button></div>`);
 $('keep-working').onclick=closeTask;$('confirm-review').onclick=submit;
 if(!state.canSubmit){$('confirm-review').disabled=true;$('confirm-review').textContent=state.kiln?'请先完成烧制':'请先到窑炉烧制';}
}
function submit(){
 const result=state.submit();if(!result.valid){if(result.reason==='firing-required')toast('请先到窑炉完成烧制，再提交作品。');return;}save();sound(result.earned?'coin':'fail');
 const next=result.practice||state.sceneComplete?'前往贴画台':result.passed?'查看下一关':'再试一次';
 taskShell('result',`${SCENES[result.scene].name} · ${result.practice?'练习订单':`第 ${result.level} 关`}`,result.passed?'作品通过啦！':'再完善一点，就更好了',result.passed?'本次得分与硬币已保存。':'本关需要达到 80%。这次获得的硬币保留，领取新瓷泥后继续尝试。',`<div class="result-layout"><div class="result-images"><figure><img src="${thumbnail(result.pixels,336)}" alt="提交的作品"/><figcaption>你的作品</figcaption></figure><figure><img src="${presetImages[result.design]}" alt="参考作品"/><figcaption>订单参考</figcaption></figure></div><div class="score-card ${result.passed?'pass':'fail'}"><span class="score-label">相似度</span><strong>${result.score.toFixed(1)}<small>%</small></strong><b>${result.passed?'已通过':'未通过 · 重新尝试'}</b><p>通关标准 80%</p><div class="score-detail"><span>形状 · 权重 65%</span><b>${result.shape.toFixed(1)}%</b></div><div class="score-meter"><span style="width:${result.shape}%"></span></div><div class="score-detail"><span>上色 · 权重 35%</span><b>${result.paint.toFixed(1)}%</b></div><div class="score-meter"><span style="width:${result.paint}%"></span></div></div></div>${result.kiln?`<div class="kiln-verdict grade-${result.kiln.grade}">火候 ${result.kiln.label} · 金币 ×${result.kiln.multiplier}</div>`:''}<div class="reward-breakdown"><span>基础奖励 <b>${result.baseEarned}</b> 币</span><span>火候加成 <b>+${result.kilnBonus}</b> 币</span></div><div class="earnings-banner"><b>+${result.earned} <small>硬币</small></b><span>当前余额 ${state.money} 币 · 本场景 ${state.scenePassed}/5 关</span></div>${rewardTable()}<div class="task-action-row"><button class="primary-button" id="result-next">${next} <span>→</span></button></div>`);
 activeTask.result=result;$('result-next').onclick=()=>{if(result.practice||state.sceneComplete)openJourney();else openBrief();};updateUI();if(result.passed)confetti();
}
function openSupply(){
 if(!state.canWork){openJourney();return;}
 taskShell('supply',`${state.sceneInfo.name} · 第 ${state.level+1} 关`,'从一块瓷泥开始','领取瓷泥后，自由选择塑形、雕刻、上色的顺序。每个工作台使用自己的工具。',`<div class="preset-gallery">${PRESETS.map((p,i)=>`<article class="preset-gallery-card ${i===state.level?'current':''}"><img src="${presetImages[p.id]}" alt="${p.name}"/><span>第 ${i+1} 关</span><b>${p.name}</b><small>${state.sceneResults.some(r=>r.level===i+1)?'✓ 已通过':i===state.level?'当前订单':'80% 解锁下一关'}</small></article>`).join('')}</div><div class="task-action-row"><button class="secondary-button" id="supply-brief">查看订单</button><button class="primary-button" id="fresh-clay">领取完整瓷泥 <span>→</span></button></div>`);
 $('supply-brief').onclick=openBrief;$('fresh-clay').onclick=()=>{if(state.hasClay)openRestart();else{state.collectClay();closeTask();toast('瓷泥已领取，去工作台开始制作吧。');}};
}
function openRestart(){
 if(nearest?.id!=='clay'){toast('请到取泥台领取新瓷泥。');return;}
 if(!state.canWork){openJourney();return;}
 taskShell('restart','重新制作','换一块新瓷泥？','当前作品会重置，已通过的关卡、藏品与硬币会保留。',`<div class="task-action-row"><button class="secondary-button" id="cancel-restart">保留作品</button><button class="primary-button" id="confirm-restart">领取新瓷泥 <span>↺</span></button></div>`);
 $('cancel-restart').onclick=closeTask;$('confirm-restart').onclick=()=>{state.restart();state.collectClay();closeTask();};
}
$('discard-button').onclick=()=>toast('走到取泥台，可以换一块新瓷泥。');$('discard-button').title='到取泥台更换瓷泥';
function openJourney(){
 if(state.phase==='decal'||state.phase==='crafted'){openDecal();return;}
 if(state.completed){openCollection();return;}
 const theme=state.sceneInfo;
 taskShell('journey',`场景 ${state.scene+1} / 4 · 贴画工坊`,theme.decal,theme.description,`<div class="journey-layout"><div class="bowl-stage"><canvas id="bowl-preview" aria-label="${theme.product}成品预览，可拖动旋转"></canvas><span class="preview-caption">成品预览 · 拖动旋转</span></div><div class="decal-details"><span class="board-label">参考图 ${String(state.scene+1).padStart(2,'0')} · 按上传顺序</span><div class="reference-texture"><img src="${theme.reference}" alt="用户提供的第 ${state.scene+1} 张陶瓷参考图"/><span>→</span><img src="${decalImages[state.scene]}" alt="${theme.decal}环绕贴图"/></div><h3>${theme.product}</h3><p>完成本场景五关，用 400 硬币购买贴画；亲手贴到白瓷碗上，开启下一场景。</p><div class="purchase-check ${state.sceneComplete?'met':''}"><span>${state.sceneComplete?'✓':'○'}</span> 五关通过 <b>${state.scenePassed} / 5</b></div><div class="purchase-check ${state.money>=400?'met':''}"><span>${state.money>=400?'✓':'○'}</span> 硬币余额 <b>${state.money} / 400</b></div><button class="primary-button" id="buy-decal" ${state.canPurchase?'':'disabled'}>购买贴画 · ${DECAL_PRICE} 币 <span>→</span></button><small class="purchase-note">${state.canPurchase?`购买后余额 ${state.money-400} 币；剩余硬币带入下一场景。`:state.sceneComplete?'余额不足，可以完成练习订单获得硬币。':'先完成本场景的五个订单。'}</small>${state.phase==='ready'&&state.money<400?'<button class="secondary-button" id="practice-order">接一个练习订单</button>':''}${state.canWork?'<button class="secondary-button" id="return-order">继续当前订单</button>':''}</div></div>`, '达到 400 币即可购买 · 贴好后进入下一场景 · 每个场景限购一次');
 activeTask.preview=createBowlPreview($('bowl-preview'),{index:state.scene,decorated:true});
 $('buy-decal').onclick=()=>{if(state.buyDecal()){save();updateUI();sound('coin');openDecal();}};
 if($('practice-order'))$('practice-order').onclick=()=>{if(state.beginPractice()){updateUI();openBrief();}};
 if($('return-order'))$('return-order').onclick=openBrief;
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
 taskShell('collection',`瓷器之旅 · ${state.collection.length} / 4 件藏品`,state.completed?'四方瓷韵，圆满收藏':'你的瓷器藏品',state.completed?'四个场景、二十个订单，四张贴画都成为了你亲手完成的瓷碗。':'按参考图的顺序，走过四个工坊，收集四种瓷器。',`<div class="collection-grid">${SCENES.map((s,i)=>{const owned=state.collection.some(c=>c.scene===i);return `<article class="collection-card ${owned?'owned':'locked'}"><span>0${i+1} · ${s.name}</span>${owned?`<button data-bowl="${i}" aria-label="欣赏${s.product}"><img src="${bowlImage(i)}" alt="已制作的${s.product}"/></button>`:`<div class="locked-bowl"><img src="${decalImages[i]}" alt="待收集的${s.decal}"/><b>待收藏</b></div>`}<h3>${s.product}</h3><p>${owned?'✓ 已贴花 · 已收藏':'五关通关 + 400 硬币'}</p></article>`;}).join('')}</div><p class="collection-money">剩余 ${state.money} 硬币</p><div class="task-action-row">${state.completed?'<button class="secondary-button" id="replay">重新开启旅程</button><button class="primary-button" id="collection-done">返回工坊</button>':'<button class="primary-button" id="continue-journey">继续旅程 <span>→</span></button>'}</div>`);
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
 taskShell(traveling?'travel':'citymap',traveling?`${PLACES[from].shortName} → ${PLACES[state.scene].shortName}`:'景德镇 · 四站游历图',traveling?'循着地图，走向下一站':'你的瓷都足迹',traveling?PLACES[state.scene].chapter:'沿地图上的 1—4 号地点，完成五关、收集贴画，把每一站做成一件纪念。','<div id="city-map-content"></div>','游戏探索路线 · 当前关卡、硬币与瓷器进度自动保存');
 activeTask.cityMap=createCityMap($('city-map-content'),{state,from,onContinue:()=>routeTask(),onReplay:()=>{closeTask();started=false;opening.show(true);}});
}

function requestNewGame(){
 taskShell('restart','重新开启旅程','从第一间工坊重新开始？','会清空本次旅程的关卡、硬币和四件藏品。', '<div class="task-action-row"><button class="secondary-button" id="cancel-new">取消</button><button class="primary-button" id="confirm-new">重新开始</button></div>');
 $('cancel-new').onclick=closeTask;$('confirm-new').onclick=()=>{state=new SculptureChallenge();started=true;$('welcome').classList.add('hidden');updateUI();opening.show(true);started=false;closeTask();};
}
function confetti(){for(let i=0;i<25;i++){const e=document.createElement('div');e.className='confetti';e.style.cssText=`left:60%;top:40%;background:${['#315fa9','#e1bc76','#d5a0ba'][i%3]};--dx:${Math.cos(i*2.4)*(100+i*7)}px;--dy:${140+Math.sin(i*7)*140}px;animation-delay:${i*.02}s`;$('app').append(e);setTimeout(()=>e.remove(),3000);}}
function stationMessage(id){return {clay:'领取完整瓷泥',wheel:'推压瓷泥，调整形状',carve:'用刻刀去除多余瓷泥',paint:'选择颜色，亲手绘制',kiln:state.canSubmit?'查看火候结果':state.kiln?'继续烧制瓷器':'烧制瓷器 · 必经环节',serve:state.canWork?'提交作品并评分':'购买贴画与制作成品'}[id];}
function openStation(id){if(activeTask||helpOpen||!started)return;sound();if(!state.canWork){openJourney();return;}({clay:openSupply,wheel:()=>openEditor('wheel'),carve:()=>openEditor('carve'),paint:()=>openEditor('paint'),kiln:openKiln,serve:openReview})[id]();}
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase();
 if(!started){if(key==='escape'){e.preventDefault();opening?.skip();}else if(key==='enter'&&$('welcome').dataset.openingStage==='map'&&e.target.tagName!=='BUTTON'){e.preventDefault();$('start-button').click();}return;}
 if(key==='escape'){e.preventDefault();if(helpOpen)hideHelp();else if(activeTask)closeTask();return;}
 if(key===' '&&activeTask?.kind==='kiln'&&!helpOpen){if(e.repeat||state.kiln){e.preventDefault();if(!e.repeat)strikeKiln();}return;}
 if(helpOpen)return;
 if(activeTask?.editor){if((e.metaKey||e.ctrlKey)&&key==='z'){e.preventDefault();e.shiftKey?activeTask.editor.redo():activeTask.editor.undo();return;}if(key==='['||key===']'){e.preventDefault();const slider=$('brush-size');slider.value=Math.max(Number(slider.min),Math.min(Number(slider.max),Number(slider.value)+(key===']'?1:-1)));activeTask.editor.setRadius(slider.value);$('brush-size-value').textContent=slider.value;return;}return;}
 if(activeTask||helpOpen)return;
 if(e.target.matches('input,textarea,[contenteditable=true]'))return;
 if(key==='f'){e.preventDefault();if(e.repeat)return;nearest=world.nearest();if(nearest)openStation(nearest.id);return;}
 if([' ','arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)){e.preventDefault();keys.add(key);}
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());});
window.addEventListener('blur',()=>{keys.clear();activeTask?.editor?.finish();});
document.addEventListener('visibilitychange',()=>{previousTime=0;if(document.hidden){keys.clear();save();}});
window.addEventListener('beforeunload',save);window.addEventListener('resize',()=>world.resize());
document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.move);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.move);});
$('touch-interact').onpointerdown=e=>{e.preventDefault();if(!started||activeTask||helpOpen)return;nearest=world.nearest();if(nearest)openStation(nearest.id);};
function frame(ms){
 const t=ms/1000,elapsed=previousTime?Math.max(0,t-previousTime):0,dt=Math.min(.05,elapsed);previousTime=t;
 const before=state.kilnResult;
 if(started&&!helpOpen&&!document.hidden&&activeTask?.kind==='kiln')state.tick(elapsed);
 if(!before&&state.kilnResult)announceKiln();
 const playing=started&&!activeTask&&!helpOpen&&!document.hidden;world.setInteractionEnabled(playing);$('reset-view').disabled=!playing;const dx=playing?Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')):0,dz=playing?Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')):0;
 world.move(dx,dz,dt);nearest=world.nearest();$('world').dataset.player=JSON.stringify({x:world.player.group.position.x,z:world.player.group.position.z});$('app').dataset.task=activeTask?.kind||'';$('app').dataset.level=state.level+1;$('app').dataset.attempt=state.attempt;
 for(const s of STATIONS){const p=world.project(s.x,s.labelY,s.z);labels[s.id].style.left=`${p.x}px`;labels[s.id].style.top=`${p.y}px`;labels[s.id].classList.toggle('near',playing&&nearest?.id===s.id);}
 $('kiln-small').textContent=state.kiln?`${Math.ceil(state.kiln.remaining)}s`:state.kilnResult?'✓':'';
 const interact=playing&&nearest;$('interaction').classList.toggle('hidden',!interact);
 if(interact){const p=world.project(world.player.group.position.x,2.25,world.player.group.position.z);$('interaction').style.left=`${Math.max(115,Math.min($('world-wrap').clientWidth-115,p.x))}px`;$('interaction').style.top=`${Math.max(4,p.y-76)}px`;$('interact-title').textContent=stationMessage(nearest.id);$('interact-sub').textContent='按 F 开始操作';}
 updateKiln();if(started&&!activeTask?.editor)world.update(dt,t,state);requestAnimationFrame(frame);
}
let heroCarousel=null;
function mountHero(host){heroCarousel?.dispose();heroCarousel=host?createHeroCarousel(host):null;}
opening=createOpening($('welcome'),{getState:()=>state,onStart:enterGame,onNewGame:()=>{started=true;requestNewGame();},onPorcelain:mountHero});
document.addEventListener('click',e=>{if(e.target.closest('[data-lang-toggle]'))toggleLang();});
const refreshLang=()=>document.querySelectorAll('[data-lang-toggle]').forEach(b=>{b.textContent=langButtonLabel();b.setAttribute('aria-label',document.documentElement.lang==='en'?'切换到中文':'Switch to English');});
onLangChange(refreshLang);initI18n();refreshLang();
if(import.meta.env.DEV)window.__terra={get state(){return state;},world,closeTask,showHelp,hideHelp,openStation,openKiln,openJourney,openCityMap,setLang,toggleLang,enter:enterGame};
updateUI();requestAnimationFrame(frame);
