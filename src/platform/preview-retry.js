export function installPreviewRetry(root){
 root.addEventListener('error',event=>{
  const image=event.target;
  if(image.tagName!=='IMG'||!image.closest('#task-body,.commissions')||image.hidden)return;
  const action=document.createElement('button');
  action.type='button';action.className='secondary-button preview-retry';
  action.textContent='重新加载';
  const holder=document.createElement('div');
  const name=document.createElement('span');name.textContent=image.alt;
  holder.className='preview-unavailable';holder.append(name,action);
  const anchor=image.closest('button')||image;
  anchor.insertAdjacentElement('afterend',holder);
  image.hidden=true;
  action.onclick=()=>{
   holder.remove();image.hidden=false;
   const source=image.getAttribute('src');
   image.removeAttribute('src');image.setAttribute('src',source);
  };
 },true);
}
