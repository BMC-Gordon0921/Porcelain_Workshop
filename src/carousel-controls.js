export function createCarouselControls(host,playback,{names,previous='上一件',next='下一件',onChange}={}){
 const controls=document.createElement('nav');controls.className='carousel-controls';controls.setAttribute('aria-label','切换展示');
 controls.innerHTML=`<button type="button" data-carousel-prev aria-label="${previous}">‹</button><div class="carousel-dots">${names.map((name,i)=>`<button type="button" data-carousel-index="${i}" aria-label="${name}" aria-pressed="${i===0}"><span>${i+1}</span></button>`).join('')}</div><button type="button" data-carousel-next aria-label="${next}">›</button>`;
 host.append(controls);
 const show=index=>{playback.show(index);onChange?.(playback.index);update();};
 controls.querySelector('[data-carousel-prev]').onclick=()=>show(playback.index-1);
 controls.querySelector('[data-carousel-next]').onclick=()=>show(playback.index+1);
 controls.querySelectorAll('[data-carousel-index]').forEach(button=>button.onclick=()=>show(Number(button.dataset.carouselIndex)));
 function update(){controls.querySelectorAll('[data-carousel-index]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===playback.index)));}
 return {update,show,dispose(){controls.remove();}};
}
