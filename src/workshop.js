export const WORKBENCH_IDS = ['clay','wheel','carve','paint','kiln','serve'];
export const UPGRADE_COSTS = {1:30,2:60};
export const FIRST_PASS_BONUS = 60;
export const EFFICIENCY_LIMIT_MS = 300000;
export const WORKBENCHES = {
 clay:{name:'取泥台',effects:['完整白坯','轮廓靠近目标 30%','轮廓靠近目标 50%']},
 wheel:{name:'塑形台',effects:['1 像素轻辅助','2 像素轻辅助','3 像素轻辅助']},
 carve:{name:'雕刻台',effects:['连续刻刀与落刀预览','轮廓保护 · 容错 1 像素','轮廓保护 · 保留目标陶土']},
 paint:{name:'上色台',effects:['连续画笔','画笔 + 直线笔','画笔 + 直线笔 + 镜像']},
 kiln:{name:'窑炉',effects:['原火候倍率','火候倍率 +0.1','火候倍率 +0.2']},
 serve:{name:'交付台',effects:['订单收益 ×1','订单收益 ×1.1','订单收益 ×1.2']},
};
export const freshWorkshopLevels=()=>Array.from({length:4},()=>Object.fromEntries(WORKBENCH_IDS.map(id=>[id,1])));
export function restoreWorkshopLevels(value){return freshWorkshopLevels().map((row,i)=>Object.fromEntries(WORKBENCH_IDS.map(id=>[id,[1,2,3].includes(value?.[i]?.[id])?value[i][id]:row[id]])));}
export const KILN_ROUNDS = [
 {seconds:6,center:.6},{seconds:5.8,center:.68},{seconds:5.6,center:.56},{seconds:5.4,center:.64},
];
export const kilnRoundCount=level=>level<2?2:level<4?3:4;
export function kilnWindows(round=0){const c=KILN_ROUNDS[round].center;return {good:[c-.17,c+.17],perfect:[c-.05,c+.05]};}
export function aggregateKilnGrade(rounds){const score=rounds.reduce((sum,r)=>sum+({plain:0,good:1,perfect:2}[r.grade]),0)/rounds.length;return score>=1.5?'perfect':score>=.75?'good':'plain';}
export function orderIncome(base,{kiln=1,serve=1,passed=false,elapsedMs=0,eligible=false,firstPass=false}={}){
 const kilnEarned=Math.round(base*kiln),regularEarned=Math.round(base*kiln*serve);
 const efficient=passed&&eligible&&elapsedMs<=EFFICIENCY_LIMIT_MS;
 const efficiencyBonus=efficient?Math.round(regularEarned*.2):0,firstPassBonus=firstPass?FIRST_PASS_BONUS:0;
 return {regularEarned,kilnBonus:kilnEarned-base,serveBonus:regularEarned-kilnEarned,efficiencyBonus,firstPassBonus,earned:regularEarned+efficiencyBonus+firstPassBonus,efficiency:{elapsedMs,limitMs:EFFICIENCY_LIMIT_MS,eligible,qualified:efficient}};
}
export const formatElapsed=ms=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
export function clockPolicy({started,helpOpen,hidden,focused,hasClay,canWork,kind}){
 const available=started&&!helpOpen&&!hidden&&focused;
 return {efficiency:available&&hasClay&&canWork&&!['citymap','travel','upgrades'].includes(kind),kiln:available&&kind==='kiln'};
}
