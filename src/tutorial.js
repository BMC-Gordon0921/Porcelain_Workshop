export const TUTORIAL_STEPS = [
 {id:'move',title:'先走动一下',copy:'按 WASD、方向键或屏幕方向按钮移动，再走近取泥台。'},
 {id:'clay',title:'领取第一块瓷泥',copy:'走近取泥台，按 F 或操作按钮，领取白色瓷泥。'},
 {id:'wheel',title:'推压瓷泥的边缘',copy:'在塑形台沿边缘拖动一次，对照轮廓推压或拉伸。操作完成后可继续修整，再去雕刻台。'},
 {id:'carve',title:'刻去多余瓷泥',copy:'在雕刻台拖动刻刀，去除轮廓外的一小块瓷泥。保留器身，刻多了可以撤销。'},
 {id:'paint',title:'画上第一抹青花',copy:'到上色台选择钴蓝，在器身中间画一条宽横带。对照参考图完善作品。'},
 {id:'kiln',title:'守住窑火',copy:'到窑炉开始烧制。按住空格或鼓风按钮升温，松开降温，完成 12 秒烧制。'},
 {id:'serve',title:'交付你的第一件作品',copy:'带作品到交付台提交评分。达到 80% 算第 1 单；首次提交后教学结束，未通过可自由重试。'},
];
export const freshTutorial = () => ({status:'active',step:'move'});
export const completedTutorial = () => ({status:'complete',step:null});
export function tutorialInfo(value){return value?.status==='active'?TUTORIAL_STEPS.find(s=>s.id===value.step):null;}
export function nextTutorialStep(value,action){
 const index=TUTORIAL_STEPS.findIndex(s=>s.id===value?.step);
 if(value?.status!=='active'||index<0||value.step!==action)return value;
 return index===TUTORIAL_STEPS.length-1?completedTutorial():{status:'active',step:TUTORIAL_STEPS[index+1].id};
}
export function tutorialAllows(value,station){
 if(!tutorialInfo(value))return true;
 return TUTORIAL_STEPS.findIndex(s=>s.id===station)<=TUTORIAL_STEPS.findIndex(s=>s.id===value.step)&&station!=='move';
}
