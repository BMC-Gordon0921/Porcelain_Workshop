import {readStorage,writeStorage} from './platform/storage.js';

/* 新手聚光灯：只讲"界面在哪、点它做什么"，制作流程本身交给纸卡教练（coach.js）。
   首次进入工坊自动走一遍，之后从 ⋯ 菜单的"新手引导"重看。 */
export const TOUR_STEPS=[
 {id:'map',target:'#map-button',title:'回城看看',copy:'想换一处工坊、看看四座城的进度，点这里。'},
 {id:'upgrades',target:'#upgrades-button',title:'升级工作台',copy:'攒到的硬币可以升级六张工作台，做起来更快更稳。'},
 {id:'changelog',target:'#changelog-button',title:'更新说明',copy:'每次改版都记在这里，随时可以翻。'},
 {id:'more',target:'#more-button',title:'更多',copy:'声音、设置、玩法说明、重看新手教学，都收在这个 ⋯ 里。'},
 {id:'orders',target:'.commissions',title:'今天的订单',copy:'左边这张卡是这一单的参考瓷器，点开能看制作要求。',place:'corner'},
 {id:'stations',target:'#station-labels',title:'六个工位',copy:'走近任一工位按 F 开始；脚下光圈就是下一步要去的地方。',place:'corner'}
];
const SEEN_KEY='terra-tour-seen';
const MARGIN=12,GAP=14;
export const tourSeen=()=>readStorage(SEEN_KEY)==='1';
export function markTourSeen(){try{writeStorage(SEEN_KEY,'1');}catch{}}

/* 卡片贴着目标放：下方空间够就放下面，否则放上面，都挤就居中。纯函数，方便测。 */
export function cardPosition(rect,viewport,size,gap=GAP,margin=MARGIN){
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const left=clamp(rect.left+rect.width/2-size.width/2,margin,Math.max(margin,viewport.width-size.width-margin));
 let top=rect.bottom+gap;
 if(top+size.height>viewport.height-margin)top=rect.top-gap-size.height;
 if(top<margin)top=clamp((viewport.height-size.height)/2,margin,Math.max(margin,viewport.height-size.height-margin));
 return {left,top};
}

/* 侧栏与大景步骤落到左下角和纸卡教练同一位置：不压侧栏参考图，也不盖中间场景。 */
export function cornerPosition(viewport,size){
 const touch=viewport.width<=760;
 const left=touch?12:22;
 const bottom=touch?188:74;
 const top=Math.max(MARGIN,viewport.height-size.height-bottom);
 return {left:Math.min(left,Math.max(MARGIN,viewport.width-size.width-MARGIN)),top};
}

let card=null,hole=null,index=0,done=null,keyHandler=null;

function teardown(){
 if(card){card.remove();card=null;}
 if(hole){hole.remove();hole=null;}
 if(keyHandler){document.removeEventListener('keydown',keyHandler,true);keyHandler=null;}
 document.body.classList.remove('tour-on');
}

function finish(){
 teardown();markTourSeen();const cb=done;done=null;cb?.();
}

function render(){
 const step=TOUR_STEPS[index];
 const target=step?document.querySelector(step.target):null;
 if(!step||!target||!target.getClientRects().length){index=Math.min(index+1,TOUR_STEPS.length);if(index>=TOUR_STEPS.length){finish();return;}render();return;}
 const rect=target.getBoundingClientRect();
 const pad=8;
 hole.style.left=rect.left-pad+'px';hole.style.top=rect.top-pad+'px';
 hole.style.width=rect.width+pad*2+'px';hole.style.height=rect.height+pad*2+'px';
 hole.dataset.step=step.id;
 card.dataset.step=step.id;
 card.querySelector('.tour-count').textContent=String(index+1).padStart(2,'0')+' / '+String(TOUR_STEPS.length).padStart(2,'0');
 card.querySelector('h3').textContent=step.title;
 card.querySelector('p').textContent=step.copy;
 card.querySelector('.tour-next').textContent=index===TOUR_STEPS.length-1?'开始制作':'下一步';
 card.querySelector('.tour-dots').innerHTML=TOUR_STEPS.map((s,i)=>'<span class="'+(i===index?'now':'')+'"></span>').join('');
 const size={width:card.offsetWidth,height:card.offsetHeight};
 const view={width:innerWidth,height:innerHeight};
 const pos=step.place==='corner'?cornerPosition(view,size):cardPosition(rect,view,size);
 card.style.left=pos.left+'px';card.style.top=pos.top+'px';
}
function step(delta){index=Math.max(0,Math.min(TOUR_STEPS.length-1,index+delta));render();}

export function startSpotlight({onDone}={}){
 if(card)return;
 done=onDone||null;index=0;
 hole=document.createElement('div');hole.className='tour-hole';
 card=document.createElement('section');card.className='tour-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','新手引导');
 card.innerHTML='<div class="tour-head"><span class="tour-count"></span><span class="tour-dots" aria-hidden="true"></span></div><h3></h3><p></p><div class="tour-actions"><button type="button" class="tour-skip">跳过引导</button><button type="button" class="tour-next primary-button">下一步</button></div>';
 document.body.append(hole,card);document.body.classList.add('tour-on');
 card.querySelector('.tour-skip').onclick=finish;
 card.querySelector('.tour-next').onclick=()=>{if(index>=TOUR_STEPS.length-1)finish();else step(1);};
 keyHandler=e=>{
  if(e.key==='Escape'){e.preventDefault();finish();}
  else if(e.key==='ArrowRight'){e.preventDefault();if(index>=TOUR_STEPS.length-1)finish();else step(1);}
  else if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}
  else if(e.key==='Tab'){const items=[...card.querySelectorAll('button')];if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 };
 document.addEventListener('keydown',keyHandler,true);
 render();
 card.querySelector('.tour-next').focus({preventScroll:true});
 return card;
}

/* 首次进世界才自动播；测试/无头环境与已看过的直接跳过。 */
export function maybeStartSpotlight({onDone}={}){
 if(card||tourSeen())return null;
 if(navigator.webdriver)return null;
 return startSpotlight({onDone});
}
