// Seconds of visible, uninterrupted inactivity; independent of rendering speed.
export class HeroPlayback {
 constructor(count=4){this.count=count;this.index=0;this.idle=0;this.fade=null;this.opacity=1;}
 interact(){this.idle=0;this.fade=null;this.opacity=1;}
 show(index){this.index=((index%this.count)+this.count)%this.count;this.interact();}
 tick(seconds,{paused=false,reduced=false}={}){
  if(paused||!Number.isFinite(seconds)||seconds<0)return;
  if(this.fade===null){this.idle+=seconds;if(this.idle<5)return;seconds=this.idle-5;this.idle=0;this.fade=0;}
  const previous=this.fade;this.fade+=seconds;
  if(reduced||previous<.3&&this.fade>=.3)this.index=(this.index+1)%this.count;
  this.opacity=this.fade<.3?1-this.fade/.3:(this.fade-.3)/.3;
  if(reduced||this.fade>=.6){this.fade=null;this.opacity=1;}
 }
}
