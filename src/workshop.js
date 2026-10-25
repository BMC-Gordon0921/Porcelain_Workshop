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
// One continuous firing: hold to stoke, release to cool, and keep the heat inside
// a drifting band. The time spent in each band is the score.
export const FIRE_DURATION = 12;
export const FIRE_HEAT_RATE = .85;
export const FIRE_COOL_RATE = .5;
export const FIRE_START_HEAT = .42;
const FIRE_BAND_GOOD = .12, FIRE_BAND_PERFECT = .045;
export const FIRE_RATIO_PERFECT = .72, FIRE_RATIO_GOOD = .38;
export function fireBand(level=1){
 const bonus=Math.max(0,Math.min(2,Math.floor(level)-1));
 return {good:FIRE_BAND_GOOD+bonus*.012,perfect:FIRE_BAND_PERFECT+bonus*.004};
}
const TAU=Math.PI*2;
export function fireSeed(){return (Math.random()*4294967296)>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Every firing gets its own slow, layered drift plus one or two short gusts.
// Amplitudes and gust widths are bounded so the band stays readable and reachable.
export function createFireDrift(seed=1){
 const rnd=mulberry32(seed>>>0),base=.6+(rnd()-.5)*.024;
 const waves=Array.from({length:3},(_,i)=>({
  amp:[.03,.016,.008][i]+rnd()*[.012,.008,.004][i],
  freq:[.08+rnd()*.06,.18+rnd()*.08,.32+rnd()*.1][i],
  phase:rnd()*TAU,
 }));
 const gusts=Array.from({length:1+(rnd()<.45?1:0)},()=>({at:2.2+rnd()*7.4,amp:(rnd()<.5?-1:1)*(.015+rnd()*.015),width:.8+rnd()*.7}));
 return t=>{
  let v=base;
  for(const w of waves)v+=w.amp*Math.sin(TAU*w.freq*t+w.phase);
  for(const g of gusts){const x=(t-g.at)/g.width;if(Math.abs(x)<1)v+=g.amp*(1+Math.cos(x*Math.PI))/2;}
  const settle=Math.min(1,Math.max(0,t/1.2)),target=.6+(v-.6)*settle;
  return Math.min(.72,Math.max(.48,target));
 };
}
export function fireGrade(seconds,duration=FIRE_DURATION){
 const total=Math.max(1e-9,seconds.perfect+seconds.good+seconds.fair);
 const ratio=(seconds.perfect+seconds.good*.5)/total;
 return ratio>=FIRE_RATIO_PERFECT?'perfect':ratio>=FIRE_RATIO_GOOD?'good':'plain';
}
export function fireRatio(seconds){const total=Math.max(1e-9,seconds.perfect+seconds.good+seconds.fair);return (seconds.perfect+seconds.good*.5)/total;}
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
