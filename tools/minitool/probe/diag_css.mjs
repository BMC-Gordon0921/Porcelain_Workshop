import {chromium} from '../../../qa/pw/node_modules/playwright-core/index.mjs';
const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:800}});
await p.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'});
await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{
  const rail=document.querySelector('.commissions');
  const card=rail&&rail.querySelector('.reference-card');
  const img=card&&card.querySelector('img');
  const board=rail&&rail.querySelector('.quest-board');
  const sheets=[...document.styleSheets].map(s=>s.href? s.href.split('/').pop():'(inline)');
  let hit=null;
  for(const s of document.styleSheets){try{for(const rule of s.cssRules||[]){
    if(rule.cssText&&rule.cssText.includes('.quest-board')&&!hit)hit=(s.href||'(inline)')+' :: '+rule.cssText.slice(0,90);
  }}catch(e){}}
  return {
    railDisplay:rail?getComputedStyle(rail).display:'none',
    railH:rail&&rail.clientHeight,
    cardDisplay:card?getComputedStyle(card).display:'?',
    imgH:img?getComputedStyle(img).height:'?',
    pDisplay:card&&card.querySelector('p')?getComputedStyle(card.querySelector('p')).display:'?',
    board:!!board, boardH:board&&board.offsetHeight,
    boardText:board?board.textContent.slice(0,40):'',
    sheets, hit,
  };
});
console.log(JSON.stringify(r,null,1));
await b.close();