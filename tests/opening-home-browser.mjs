import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'msedge',headless:true});
const url=process.env.GAME_URL||'http://127.0.0.1:5174/';
await mkdir('qa/opening-home',{recursive:true});
const errors=[];
async function context(options={}){
 const c=await browser.newContext(options);
 c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await c.addInitScript(()=>{
  window.__glCreated=0;window.__glLost=0;
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){
   const context=get.call(this,type,...args);
   if(context&&type.startsWith('webgl')&&!this.__tracked){this.__tracked=true;window.__glCreated++;this.addEventListener('webglcontextlost',()=>window.__glLost++);}
   return context;
  };
  const AudioClass=window.Audio;window.Audio=function(...args){const audio=new AudioClass(...args);window.__musicElement=audio;return audio;};
 });
 return c;
}
const loaded=(p,host='#opening-background')=>p.waitForFunction(h=>document.querySelector(h+' canvas')?.dataset.loading==='false',host);
const time=(p,host='#opening-background')=>p.locator(host).getAttribute('data-demo-time').then(Number);
try{
 const c=await context({viewport:{width:1440,height:1000},deviceScaleFactor:2}),page=await c.newPage();
 await page.goto(url);await loaded(page);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1100);
 assert.equal(await page.locator('.opening-title').getAttribute('aria-label'),'开窑啦！');
 assert.equal(await page.evaluate(()=>document.fonts.check('40px "ZCOOL KuaiLe Title"','开窑啦！')),true);
 assert.equal(await page.locator('#opening-background .scene-carousel').getAttribute('inert'),'');
 assert.equal(await page.locator('#opening-background .carousel-controls').isVisible(),false);
 assert.equal(await page.locator('#opening-background canvas').getAttribute('tabindex'),'-1');
 assert.ok(await page.locator('#opening-background canvas').evaluate(c=>c.width<=c.getBoundingClientRect().width+1));
 await page.evaluate(()=>{window.__openingCanvas=document.querySelector('#opening-background canvas');window.__beforePreview=JSON.stringify(window.__terra.state.serialize());});
 await page.screenshot({path:'qa/opening-home/desktop.png'});
 await page.click('#pause-background');const frozen=await time(page);await page.waitForTimeout(300);assert.equal(await time(page),frozen);
 await page.click('#pause-background');await page.waitForFunction(()=>window.__musicElement.currentTime>0&&!window.__musicElement.paused);
 const musicTime=await page.evaluate(()=>window.__musicElement.currentTime);
 await page.click('#unfold-map');await loaded(page,'#opening-scene-carousel');
 assert.equal(await page.evaluate(()=>document.querySelector('#opening-scene-carousel canvas')===window.__openingCanvas),true);
 assert.ok(await time(page,'#opening-scene-carousel')>=frozen);
 assert.ok(await page.locator('#opening-scene-carousel canvas').evaluate(c=>c.width/c.getBoundingClientRect().width>1.4));
 await page.locator('#opening-scene-carousel [data-carousel-index]').nth(2).click();await loaded(page,'#opening-scene-carousel');
 await page.click('#pause-opening');const mapTime=await time(page,'#opening-scene-carousel');
 await page.locator('.opening-brand').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#welcome').getAttribute('data-opening-stage'),'intro');
 assert.equal(await page.locator('#opening-background').getAttribute('data-index'),'2');
 await page.waitForTimeout(150);assert.equal(await time(page),mapTime);
 assert.equal(await page.locator('#pause-background').getAttribute('aria-pressed'),'true');
 const same=await page.evaluate(()=>document.querySelector('#opening-background canvas')===window.__openingCanvas);assert.equal(same,true);
 await page.locator('.opening-brand').focus();await page.keyboard.press('Space');assert.equal(await time(page),mapTime);
 assert.ok(await page.evaluate(()=>window.__musicElement.currentTime)>musicTime);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__terra.state.serialize())===window.__beforePreview),true);
 await page.click('.opening-lang');assert.equal(await page.locator('.opening-title').getAttribute('aria-label'),'Fire Up the Kiln!');
 await page.waitForTimeout(1100);await page.screenshot({path:'qa/opening-home/english.png'});await page.click('.opening-lang');
 for(let i=0;i<6;i++){
  await page.click('#unfold-map');await page.click('.opening-brand');
  assert.equal(await page.evaluate(()=>document.querySelector('#opening-background canvas')===window.__openingCanvas),true);
 }
 await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>window.__glCreated-window.__glLost)<=3);
 console.log('PASS: local font, decorative input isolation, logo/keyboard, shared preview, pause, music, language and disposal');

 // Real background time: a complete demonstration must finish, even while the
 // foreground porcelain has hover/focus. No demo clock or result is injected.
 await page.click('#pause-background');
 await page.locator('#prologue-carousel [data-carousel-next]').click();
 const initialIndex=await page.locator('#opening-background').getAttribute('data-index');
 console.log('Waiting for a real full background demonstration…');
 await page.waitForFunction(i=>document.querySelector('#opening-background').dataset.index!==i,initialIndex,{timeout:55000});
 await loaded(page);assert.ok(await time(page)>=40);
 assert.equal(await page.locator('#opening-background').getAttribute('data-demo-step'),'clay');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__terra.state.serialize())===window.__beforePreview),true);
 // Exercise the application's visibility handler without altering its clock.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const hiddenTime=await time(page);await page.waitForTimeout(350);assert.equal(await time(page),hiddenTime);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(t=>Number(document.querySelector('#opening-background').dataset.demoTime)>t,hiddenTime);
 for(let i=0;i<4;i++){
  await page.click('#unfold-map');await page.locator('#opening-scene-carousel [data-carousel-index]').nth(i).click();await loaded(page,'#opening-scene-carousel');await page.click('.opening-brand');
  await page.waitForTimeout(1000);await page.screenshot({path:`qa/opening-home/background-${i}.png`});
 }
 console.log('PASS: real full-cycle autoplay, foreground independence, hidden pause and all four scene backgrounds');
 await c.close();

 const mc=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),mp=await mc.newPage();
 await mp.goto(url);await loaded(mp);await mp.evaluate(()=>document.fonts.ready);await mp.waitForTimeout(1200);
 await mp.screenshot({path:'qa/opening-home/mobile.png',fullPage:true});
 assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const titleBounds=await mp.locator('.opening-title').boundingBox();assert.ok(titleBounds.x>=0&&titleBounds.x+titleBounds.width<=390);
 await mp.locator('#prologue-carousel [data-carousel-next]').tap();assert.equal(await mp.locator('#prologue-carousel').getAttribute('data-index'),'1');
 await mp.locator('#unfold-map').tap();await loaded(mp,'#opening-scene-carousel');await mp.locator('#opening-scene-carousel [data-carousel-next]').tap();
 await mp.locator('.opening-brand').tap();assert.equal(await mp.locator('#welcome').getAttribute('data-opening-stage'),'intro');assert.equal(await mp.locator('#welcome').evaluate(el=>el.scrollTop),0);
 await mp.locator('.opening-lang').tap();await mp.waitForTimeout(1200);await mp.screenshot({path:'qa/opening-home/mobile-english.png',fullPage:true});
 assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await mp.reload();await loaded(mp);assert.equal(await mp.locator('.opening-title').getAttribute('aria-label'),'Fire Up the Kiln!');await mc.close();

 const rc=await context({viewport:{width:390,height:844},reducedMotion:'reduce'}),rp=await rc.newPage();
 await rp.route('**/*zcool-kuaile-title.woff2*',r=>r.abort());
 await rp.goto(url);await loaded(rp);const rotation=await rp.locator('#opening-background').getAttribute('data-rotation');await rp.waitForTimeout(300);
 assert.equal(await rp.locator('#opening-background').getAttribute('data-rotation'),rotation);
 assert.equal(await rp.locator('.opening-title-word>span').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(await rp.locator('.opening-title').getAttribute('aria-label'),'开窑啦！');
 await rp.screenshot({path:'qa/opening-home/font-fallback.png',fullPage:true});await rc.close();

 const fc=await context(),fp=await fc.newPage();let attempts=0;
 await fp.route('**/models/maps/guyao.glb',route=>++attempts===1?route.abort():route.continue());
 await fp.goto(url);await fp.waitForFunction(()=>document.querySelector('#opening-background canvas')?.dataset.loading==='error');
 assert.equal(await fp.locator('#unfold-map').isEnabled(),true);await fp.click('#unfold-map');
 await fp.locator('#opening-scene-carousel .scene-load button').click();await loaded(fp,'#opening-scene-carousel');
 assert.equal(attempts,2);await fp.click('.opening-brand');await loaded(fp);
 await fp.click('#unfold-map');await fp.click('#start-button');await fp.waitForFunction(()=>document.querySelector('#welcome').classList.contains('hidden'));
 assert.equal(await fp.locator('#welcome canvas').count(),0);await fc.close();
 assert.deepEqual(errors,[]);console.log('PASS: mobile touch, reduced motion, missing font, scene retry and enter-game cleanup; no browser exceptions');
}finally{await browser.close();}
