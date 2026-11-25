export const TUTORIAL_STEPS = [
 {id:'move',group:0,title:'先走动一下',copy:'按 WASD、方向键或屏幕方向按钮移动，再走近取泥台。',touchCopy:'拖动摇杆移动，走近取泥台。'},
 {id:'clay',group:0,title:'领取第一块瓷泥',copy:'走近取泥台，按 F 或操作按钮，领取白色瓷泥。',touchCopy:'走近取泥台，点按「操作」，再领取瓷泥。'},
 {id:'wheel',group:1,title:'推压瓷泥的边缘',copy:'在塑形台沿边缘拖动一次，对照轮廓推压或拉伸。操作完成后可继续修整，再去雕刻台。'},
 {id:'carve',group:1,title:'刻去多余瓷泥',copy:'在雕刻台拖动刻刀，去除轮廓外的一小块瓷泥。保留器身，刻多了可以撤销。'},
 {id:'paint',group:2,title:'画上第一抹釉色',copy:'到上色台选择主色釉，在器身中间画一条宽横带。对照参考图完善作品。'},
 {id:'kiln',group:2,title:'守住窑火',copy:'到窑炉开始烧制。按住空格或鼓风按钮升温，松开降温，完成 12 秒烧制。',touchCopy:'按住鼓风按钮升温，松开降温，完成 12 秒烧制。'},
 {id:'serve',group:2,title:'交付你的第一件作品',copy:'带作品到交付台提交评分。达到 80% 算第 1 单；首次提交后教学结束，未通过可自由重试。'},
];
// 玩家只看到三段说明：每个 step 归属一段，文案按段落而不是按步骤换。
export const TUTORIAL_GROUPS = [
 {title:'1 / 3 · 走动与取泥',copy:'走到取泥台，按 F 或点「操作」领一块白瓷泥。',touchCopy:'拖动摇杆走到取泥台，点按「操作」领一块白瓷泥。'},
 {title:'2 / 3 · 塑形与雕刻',copy:'塑形台按住左右或上下拖动，推压这一段轮廓；雕刻台刻掉多余瓷泥，刻多了可以撤销。'},
 {title:'3 / 3 · 上色 · 烧制 · 交付',copy:'上色台画上釉色，窑炉鼓风 12 秒烧制，最后到交付台提交评分，80% 通过。'},
];
export const freshTutorial = () => ({status:'active',step:'move'});
export const completedTutorial = () => ({status:'complete',step:null});
export function tutorialInfo(value){return value?.status==='active'?TUTORIAL_STEPS.find(s=>s.id===value.step):null;}
export function tutorialGroup(step){return step?TUTORIAL_GROUPS[step.group??0]:null;}
export function nextTutorialStep(value,action){
 const index=TUTORIAL_STEPS.findIndex(s=>s.id===value?.step);
 if(value?.status!=='active'||index<0||value.step!==action)return value;
 return index===TUTORIAL_STEPS.length-1?completedTutorial():{status:'active',step:TUTORIAL_STEPS[index+1].id};
}
export function tutorialAllows(value,station){
 if(!tutorialInfo(value))return true;
 return TUTORIAL_STEPS.findIndex(s=>s.id===station)<=TUTORIAL_STEPS.findIndex(s=>s.id===value.step)&&station!=='move';
}

export function openInitialOrder(step){return step!=='move'&&step!=='clay';}
export function firstWorkshopHint(step,station,touch){
 if(step==='move'||(step==='clay'&&station!=='clay'))return {action:'move',text:touch?'拖动摇杆，走近取泥台。':'用方向键移动，走近取泥台。'};
 if(step==='clay')return {action:'collect',text:touch?'点按操作，领取瓷泥。':'按 F，领取瓷泥。'};
 return null;
}