// 新手引导层：世界屏任务板 + 各面板的补全说明。只改表现层，不碰玩法数值。
import {STATIONS} from './world.js';
import './redesign.css';
import './art-direction.css';

const CTA={clay:'取泥台',wheel:'塑形台',carve:'雕刻台',paint:'上色台',kiln:'窑炉',serve:'交付台'};
const STEPS=[
 {id:'clay',label:'取泥',what:'领一块完整瓷泥'},
 {id:'wheel',label:'塑形',what:'推出器形，再刻出细节'},
 {id:'paint',label:'上色',what:'对照订单涂釉色'},
 {id:'kiln',label:'烧制',what:'看火候，等出窑'},
 {id:'serve',label:'交付',what:'评分收硬币'},
];

let S=null,H=null,sig='',watching=false;

function progress(state){
 return (state.hasClay?1:0)+(state.hasShape?1:0)+(state.hasPaint?1:0)+(state.kilnResult?1:0);
}

function watchPanels(){
 if(watching)return;const overlay=document.getElementById('task-overlay');if(!overlay)return;
 watching=true;let queued=false;
 new MutationObserver(()=>{
  if(queued)return;queued=true;requestAnimationFrame(()=>{
   queued=false;const panel=document.querySelector('.task-panel');
   if(!panel||overlay.classList.contains('hidden'))return;
   enrichPanel(panel.dataset.panel,panel);
  });
 }).observe(overlay,{subtree:true,childList:true,attributes:true,attributeFilter:['data-panel','class']});
}

export function updateQuestRail(state,handlers){
 S=state;H=handlers;watchPanels();
 const rail=document.querySelector('.commissions');if(!rail)return;
 const p=Math.min(progress(state),4);
 const key=[state.scene,state.level,state.attempt,p,state.money,state.phase,state.canWork?1:0].join('|');
 let board=rail.querySelector('.quest-board');
 if(!board){
  board=document.createElement('section');board.className='quest-board';
  const ref=rail.querySelector('.reference-card');
  if(ref)ref.insertAdjacentElement('afterend',board);else rail.append(board);
  sig='';
 }
 if(key===sig)return;sig=key;
 const done=p>=4,step=STEPS[p],target=STATIONS.find(s=>s.id===step.id);
 board.innerHTML='<p class="quest-kicker">'+(state.canWork?'现在做这个':'本场景已完成')+'</p>'
  +'<b class="quest-goal">'+(done?'三单都过了，去贴花收尾':step.label+' · '+step.what)+'</b>'
  +'<button type="button" class="quest-cta" id="quest-cta">'+(done?'去贴花台':'去'+(CTA[step.id]||target?.name||step.label))+'<span>→</span></button>'
  +'<ol class="quest-steps">'+STEPS.map((s,i)=>'<li class="'+(i<p?'done':i===p?'now':'todo')+'"><span>'+(i<p?'✓':i+1)+'</span>'+s.label+'</li>').join('')+'</ol>';
 board.querySelector('#quest-cta').onclick=()=>{if(done||!state.canWork)H.routeTask();else H.openStation(step.id);};
}

export function enrichResult(r){
 if(!r||!r.valid)return;
 const panel=document.querySelector('.task-panel[data-panel="result"]');if(!panel)return;
 if(panel.querySelector('.result-explain'))return;
 const shape=Number(r.shape)||0,paint=Number(r.paint)||0,score=Number(r.score)||0;
 const gapS=Math.max(0,(100-shape)*.65),gapP=Math.max(0,(100-paint)*.35);
 const main=gapS>=gapP?'形状':'上色';
 const advice=main==='形状'
  ?'回塑形台：多出来的泥推掉，瓶身再收紧一点，让外轮廓贴住订单。'
  :'回上色台：对照订单图，釉色只画在深色花纹里，留白别涂满。';
 const money=r.earned>0?'本单 +'+r.earned+' 硬币':'低于 60 分不产出硬币 · 本次 0 币';
 const box=document.createElement('section');box.className='result-explain';
 box.innerHTML='<div class="explain-verdict '+(r.passed?'pass':'fail')+'">'+(r.passed?'通过':'未通过')
  +' · 本单 '+score.toFixed(1)+' 分 / 通关线 80 分</div>'
  +'<table class="explain-table"><thead><tr><th>评分项</th><th>你的得分</th><th>权重</th><th>丢分</th></tr></thead><tbody>'
  +'<tr class="'+(main==='形状'?'weak':'')+'"><td>形状</td><td>'+shape.toFixed(1)+'</td><td>65%</td><td>'+gapS.toFixed(1)+'</td></tr>'
  +'<tr class="'+(main==='上色'?'weak':'')+'"><td>上色</td><td>'+paint.toFixed(1)+'</td><td>35%</td><td>'+gapP.toFixed(1)+'</td></tr>'
  +'</tbody></table>'
  +'<p class="explain-diagnosis"><b>主要差在'+main+'</b>：'+advice+'</p>'
  +'<p class="explain-reward">'+money+'</p>'
  +'<p class="explain-standard">通关 80 分 · 60 分起有硬币 · 形状 65% + 上色 35%</p>';
 const anchor=panel.querySelector('.result-images')||document.getElementById('task-body');
 if(anchor)anchor.insertAdjacentElement('afterend',box);
 if(!r.passed){
  const next=document.getElementById('result-next');
  if(next){
   next.textContent='领新瓷泥，再试一次 →';
   next.onclick=()=>{const ok=S&&S.collectClay();H.closeTask();H.toast(ok?'新瓷泥已就位，去塑形台开始吧。':'去取泥台领一块新瓷泥。');};
  }
 }
}

function enrichPanel(kind,panel){
 if(!S)return;
 if(kind==='editor'){
  const body=panel.querySelector('#task-body');if(!body||body.querySelector('.panel-steps'))return;
  const p=progress(S),strip=document.createElement('ol');strip.className='panel-steps';
  strip.innerHTML=STEPS.map((s,i)=>'<li class="'+(i<p?'done':i===p?'now':'todo')+'">'+(i+1)+'. '+s.label+'</li>').join('');
  body.prepend(strip);
  const more=panel.querySelector('.editor-more');if(more)more.open=true;
 }
 if(kind==='review'){
  const desc=document.getElementById('task-description');
  if(desc)desc.textContent='对照订单图看一眼，再决定要不要回工作台改。评分标准会在提交后给出。';
  const body=panel.querySelector('#task-body');
  if(body&&!body.querySelector('.review-check')){
   const box=document.createElement('div');box.className='review-check';
   box.innerHTML='<b>交之前自己看一眼</b><ul><li>轮廓和订单一致吗？</li><li>釉色是不是涂在深色花纹上？</li><li>该留白的地方有没有被涂满？</li></ul>';
   body.prepend(box);
  }
 }
}
