import musicUrl from './assets/pottery backround music.wav?url';

// One element for the whole journey; page changes never restart the track.
export function createMusic(){
 const audio=new Audio(musicUrl);audio.loop=true;audio.volume=.2;audio.preload='none';
 let enabled=true,unlocked=false,failed=false,pending=false;
 function pause(){audio.pause();}
 async function resume(){
  if(!enabled||!unlocked||failed||document.hidden||pending||!audio.paused)return;
  pending=true;
  try{await audio.play();if(!enabled||document.hidden)pause();}catch(error){if(error.name!=='NotAllowedError'&&error.name!=='AbortError')failed=true;}finally{pending=false;}
 }
 const visibility=()=>document.hidden?pause():resume();
 const error=()=>{failed=true;};
 audio.addEventListener('error',error);document.addEventListener('visibilitychange',visibility);
 return {
  unlock(){unlocked=true;resume();},
  setEnabled(value){enabled=!!value;enabled?resume():pause();},
  get enabled(){return enabled;},get unavailable(){return failed;},
  dispose(){pause();document.removeEventListener('visibilitychange',visibility);audio.removeEventListener('error',error);audio.removeAttribute('src');audio.load();},
 };
}
