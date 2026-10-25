import {getLang} from './i18n.js';

// Translate the complete heading before splitting it for the Blur Text-inspired reveal.
export function createOpeningTitle(element){
 element.dataset.noI18n='';
 function replay(){
  const english=getLang()==='en',text=english?'Fire Up the Kiln!':'开窑啦！';
  element.setAttribute('aria-label',text);element.dataset.language=english?'en':'zh';
  element.replaceChildren();let index=0;
  const length=Array.from(text.replaceAll(' ','')).length;
  for(const word of text.split(' ')){
   if(element.childNodes.length)element.append(' ');
   const group=document.createElement('span');group.className='opening-title-word';group.setAttribute('aria-hidden','true');
   for(const character of word){
    const letter=document.createElement('span');letter.textContent=character;letter.style.setProperty('--letter-delay',`${index++*300/Math.max(1,length-1)}ms`);group.append(letter);
   }
   element.append(group);
  }
 }
 // The event also runs during silent initialization of a saved language.
 document.addEventListener('terra:lang',replay);replay();
 return {replay,dispose(){document.removeEventListener('terra:lang',replay);}};
}
