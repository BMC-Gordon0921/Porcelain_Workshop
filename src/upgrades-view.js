import {WORKBENCH_IDS,WORKBENCHES,UPGRADE_COSTS} from './workshop.js';
import {createWorkbenchPreview} from './workbench-model.js';

export function createUpgradesView(host,{state,initial='clay',onUpgrade}){
 let locked=null,hover=null,shown=null;
 host.innerHTML=`<div class="upgrade-wallet">当前余额 <b data-upgrade-balance></b> 币</div><div class="workbench-grid">${WORKBENCH_IDS.map(id=>`<button type="button" class="workbench-card" data-workbench="${id}" aria-pressed="false"><span class="workbench-heading"><b>${WORKBENCHES[id].name}</b><span data-level></span></span><span data-effect></span><small>悬停预览 · 点击选定</small></button>`).join('')}</div><section class="upgrade-detail"><h3 data-preview-title></h3><canvas aria-label="当前工作台与下一级外观对比"></canvas><div class="upgrade-comparison"><span data-current-effect></span><span data-next-effect></span></div></section><div class="upgrade-confirmation"><p data-selection role="status">点击卡片选定要升级的工作台</p><button type="button" class="primary-button" data-confirm-upgrade disabled>确认升级</button></div>`;
 const preview=createWorkbenchPreview(host.querySelector('canvas'));
 const cards=[...host.querySelectorAll('[data-workbench]')],button=host.querySelector('[data-confirm-upgrade]');
 function render(){
  const id=hover||locked?.id||initial,level=state.stationLevel(id),bench=WORKBENCHES[id];
  if(shown!==id+level){shown=id+level;preview.show(id,level);}
  host.querySelector('[data-upgrade-balance]').textContent=state.money;
  host.querySelector('[data-preview-title]').textContent=bench.name+' · 外观与加成';
  host.querySelector('[data-current-effect]').textContent=`当前 Lv.${level} · ${bench.effects[level-1]}`;
  host.querySelector('[data-next-effect]').textContent=level===3?'已满级':`下一级 Lv.${level+1} · ${bench.effects[level]} · ${UPGRADE_COSTS[level]} 币`;
  cards.forEach(card=>{const key=card.dataset.workbench,l=state.stationLevel(key);card.classList.toggle('previewing',id===key);card.classList.toggle('selected',locked?.id===key);card.setAttribute('aria-pressed',String(locked?.id===key));card.querySelector('[data-level]').textContent=`Lv.${l} / 3`;card.querySelector('[data-effect]').textContent=WORKBENCHES[key].effects[l-1];});
  const cost=locked&&UPGRADE_COSTS[locked.level];
  button.disabled=!locked||!cost||state.money<cost||state.scene!==locked.scene||state.stationLevel(locked.id)!==locked.level;
  const selected=host.querySelector('[data-selection]');
  selected.textContent=!locked?'点击卡片选定要升级的工作台':!cost?WORKBENCHES[locked.id].name+' · 已满级':`${WORKBENCHES[locked.id].name} · Lv.${locked.level} → Lv.${locked.level+1} · ${cost} 币 · ${state.money<cost?'还差 '+(cost-state.money)+' 币':'购买后余额 '+(state.money-cost)+' 币'}`;
 }
 cards.forEach(card=>{
  const id=card.dataset.workbench;
  card.onpointerenter=e=>{if(e.pointerType!=='touch'&&matchMedia('(hover: hover)').matches){hover=id;render();}};
  card.onpointerleave=()=>{hover=null;render();};card.onfocus=()=>{hover=id;render();};card.onblur=()=>{hover=null;render();};
  card.onpointermove=e=>{const r=card.getBoundingClientRect();card.style.setProperty('--spot-x',`${e.clientX-r.x}px`);card.style.setProperty('--spot-y',`${e.clientY-r.y}px`);};
  card.onclick=()=>{hover=null;locked={id,level:state.stationLevel(id),scene:state.scene};render();if(matchMedia('(max-width:760px)').matches)host.querySelector('.upgrade-detail').scrollIntoView({block:'start',behavior:'instant'});};
 });
 button.onclick=()=>{if(button.disabled||!locked)return;button.disabled=true;const choice=locked;locked=null;if(state.scene===choice.scene&&state.upgradeStation(choice.id,choice.level))onUpgrade?.(choice.id);shown=null;render();};
 render();return {update:dt=>preview.update(dt),dispose(){preview.dispose();host.replaceChildren();}};
}
