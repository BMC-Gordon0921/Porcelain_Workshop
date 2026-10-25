export const DEMO_DURATION=40;
const phases=[
 {id:'clay',start:0,end:5,move:2,path:[[1.7,0],[1.7,-1.8],[-5.65,-1.8],[-5.65,-2.05]],face:Math.PI},
 {id:'wheel',start:5,end:10,move:2,path:[[-5.65,-2.05],[-2.7,-1.95]],face:Math.PI},
 {id:'carve',start:10,end:15,move:2,path:[[-2.7,-1.95],[.4,-2.05]],face:Math.PI},
 {id:'paint',start:15,end:20,move:3,path:[[.4,-2.05],[1.7,-1.8],[1.7,2.95],[-1.25,2.95]],face:Math.PI},
 {id:'kiln',start:20,end:36,move:4,path:[[-1.25,2.95],[-3.3,2.95],[-3.3,.3],[-3.95,.3]],face:-Math.PI/2},
 {id:'serve',start:36,end:40,move:2,path:[[-3.95,.3],[-3.5,-1.8],[1.7,-1.8],[1.7,0]],face:Math.PI/2},
];
function along(path,fraction){
 const lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1]));let distance=lengths.reduce((a,b)=>a+b,0)*fraction;
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const a=path[i],b=path[i+1],t=Math.min(1,distance/lengths[i]);return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,angle:Math.atan2(b[0]-a[0],b[1]-a[1])};}distance-=lengths[i];}
}
export function demoFrame(time){
 const local=((time%DEMO_DURATION)+DEMO_DURATION)%DEMO_DURATION,phase=phases.find(p=>local<p.end),elapsed=local-phase.start,moving=elapsed<phase.move;
 const progress=Math.max(0,(elapsed-phase.move)/(phase.end-phase.start-phase.move));
 return {step:phase.id,time:local,progress,moving,...along(phase.path,Math.min(1,elapsed/phase.move)),face:phase.face,hasClay:phase.id!=='clay'||progress>.5,firing:phase.id==='kiln'&&!moving,heat:.6+Math.sin(elapsed)*.05};
}
export class WorkshopDemo{
 time=0;idle=0;rotationIdle=5;
 interact({rotate=false}={}){this.idle=0;if(rotate)this.rotationIdle=0;}
 tick(dt,{paused=false,blocked=false}={}){
  if(paused||!Number.isFinite(dt)||dt<0)return false;
  const before=Math.floor(this.time/DEMO_DURATION);this.time+=dt;this.idle=blocked?0:this.idle+dt;this.rotationIdle+=dt;
  return Math.floor(this.time/DEMO_DURATION)>before&&!blocked&&this.idle>=5;
 }
 get frame(){return demoFrame(this.time);}
}
