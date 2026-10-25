import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const url=process.env.GAME_URL||'http://127.0.0.1:5174/';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'msedge',headless:true});
await mkdir('qa/journey-update',{recursive:true});
const errors=[];
async function newContext(options={}){
 const context=await browser.newContext(options);
 await context.addInitScript(()=>{const NativeAudio=window.Audio;window.Audio=function(...args){const element=new NativeAudio(...args);window.__musicElement=element;return element;};});
 context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
 return context;
}
const context=await newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const snapshot=(name,p=page)=>p.screenshot({path:`qa/journey-update/${name}.png`,fullPage:true});
async function enter(p=page){await p.click('#skip-opening');if(await p.locator('#brief-done').isVisible())await p.click('#brief-done');await p.evaluate(()=>window.dispatchEvent(new Event('focus')));}
async function station(id,p=page){
 await p.evaluate(id=>{const t=window.__terra;t.closeTask();const station=t.world.stations.find(s=>s.id===id);t.world.player.group.position.set(station.approach[0],0,station.approach[1]);},id);
 await p.waitForTimeout(100);await p.keyboard.press('f');
}
async function draw(x0,y0,x1,y1,p=page){
 const b=await p.locator('#sculpt-canvas').boundingBox();
 await p.mouse.move(b.x+b.width*x0/112,b.y+b.height*y0/112);await p.mouse.down();
 await p.mouse.move(b.x+b.width*x1/112,b.y+b.height*y1/112,{steps:15});await p.mouse.up();
}
try{
 await page.goto(url);await page.waitForFunction(()=>!!window.__terra);
 assert.equal(await page.locator('#prologue-carousel [data-carousel-index]').count(),4);
 await page.click('#prologue-carousel [data-carousel-prev]');assert.equal(await page.locator('#prologue-carousel').getAttribute('data-index'),'3');
 await page.waitForFunction(()=>window.__musicElement.currentTime>.1&&!window.__musicElement.paused);
 assert.equal(await page.evaluate(()=>window.__musicElement.volume),.2);assert.equal(await page.evaluate(()=>window.__musicElement.loop),true);
 await page.click('.opening-sound');assert.equal(await page.evaluate(()=>window.__musicElement.paused),true);assert.equal(await page.evaluate(()=>window.__terra.sfx.enabled),false);
 await page.reload();await page.waitForFunction(()=>!!window.__terra);assert.equal(await page.evaluate(()=>window.__terra.sfx.enabled),false);
 await page.click('.opening-sound');await page.waitForFunction(()=>!window.__musicElement.paused);
 await page.click('#prologue-carousel [data-carousel-next]');assert.equal(await page.locator('#prologue-carousel').getAttribute('data-index'),'1');
 await snapshot('01-home-controls');
 await page.evaluate(()=>document.activeElement.blur());await page.mouse.move(5,5);await page.waitForTimeout(5800);
 assert.equal(await page.locator('#prologue-carousel').getAttribute('data-index'),'2');
 const savedBefore=await page.evaluate(()=>JSON.stringify(window.__terra.state.serialize()));
 await page.click('#unfold-map');await page.waitForSelector('#opening-scene-carousel canvas');
 assert.equal(await page.locator('#welcome .city-map-image').count(),0);
 for(let i=0;i<4;i++){
  await page.click(`#opening-scene-carousel [data-carousel-index="${i}"]`);await page.waitForTimeout(350);
  assert.equal(await page.locator('#welcome').getAttribute('data-chapter'),String(i));
  await snapshot(`02-scene-${i}`);
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__terra.state.serialize())),savedBefore);
 const sceneCanvas=page.locator('#opening-scene-carousel canvas');await sceneCanvas.focus();
 const rotation=Number(await page.locator('#opening-scene-carousel').getAttribute('data-rotation'));await page.keyboard.press('ArrowLeft');await page.waitForTimeout(100);
 assert.notEqual(Number(await page.locator('#opening-scene-carousel').getAttribute('data-rotation')),rotation);
 await page.click('#start-button');await page.click('#brief-done');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 assert.equal(await page.locator('#app').getAttribute('data-tutorial'),'move');
 await page.keyboard.down('s');await page.waitForTimeout(220);await page.keyboard.up('s');
 await page.waitForFunction(()=>window.__terra.state.tutorial.step==='clay');
 await station('clay');await page.click('#fresh-clay');assert.equal(await page.evaluate(()=>window.__terra.state.tutorial.step),'wheel');
 await station('paint');assert.equal(await page.locator('#task-overlay').isVisible(),false);
 await station('wheel');await draw(8,40,24,40);await page.waitForFunction(()=>window.__terra.state.tutorial.step==='carve');
 await page.click('#save-editor');await page.reload();await page.waitForFunction(()=>!!window.__terra);await enter();
 assert.equal(await page.evaluate(()=>window.__terra.state.tutorial.step),'carve');
 await station('carve');await draw(12,75,15,75);await page.waitForFunction(()=>window.__terra.state.tutorial.step==='paint');await page.click('#save-editor');
 await station('paint');await draw(45,50,60,50);await page.waitForFunction(()=>window.__terra.state.tutorial.step==='kiln');await page.click('#save-editor');
 await station('kiln');await snapshot('03-tutorial-kiln');await page.click('#fire-button');
 const heat=await page.evaluate(()=>window.__terra.state.kiln.heat);
 await page.keyboard.down('Space');await page.waitForTimeout(330);await page.keyboard.up('Space');
 assert.ok(await page.evaluate(()=>window.__terra.state.kiln.heat)>heat+.1);
 await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__terra.state.kiln.stoking),false);
 const stokeBox=await page.locator('#stoke-button').boundingBox();await page.mouse.move(stokeBox.x+20,stokeBox.y+20);await page.mouse.down();await page.waitForTimeout(180);
 assert.equal(await page.evaluate(()=>window.__terra.state.kiln.stoking),true);await page.mouse.move(5,5);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__terra.state.kiln.stoking),false);await page.mouse.up();
 await page.click('#task-help');const paused=await page.evaluate(()=>window.__terra.state.kiln.remaining);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__terra.state.kiln.remaining),paused);await page.click('#help-done');
 await page.click('#close-task');const closed=await page.evaluate(()=>window.__terra.state.kiln.remaining);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__terra.state.kiln.remaining),closed);await station('kiln');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const blurred=await page.evaluate(()=>window.__terra.state.kiln.remaining);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__terra.state.kiln.remaining),blurred);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 console.log('PASS: music, home controls, four scene previews and tutorial inputs; waiting for real firing');
 await page.waitForFunction(()=>!!window.__terra.state.kilnResult,{},{timeout:18000});
 const firing=await page.evaluate(()=>window.__terra.state.kilnResult);
 assert.ok(Math.abs(firing.seconds.perfect+firing.seconds.good+firing.seconds.fair-12)<.001);assert.equal(await page.evaluate(()=>window.__terra.state.tutorial.step),'serve');
 await snapshot('04-firing-result');await page.click('#fire-button');await station('serve');await page.click('#confirm-review');
 assert.equal(await page.evaluate(()=>window.__terra.state.tutorial.status),'complete');assert.equal(await page.evaluate(()=>window.__terra.state.attempt),2);assert.equal(await page.evaluate(()=>window.__terra.state.scenePassed),0);
 await page.click('#close-task');await station('clay');await page.click('#fresh-clay');await station('carve');assert.equal(await page.locator('#sculpt-canvas').isVisible(),true);await page.click('#save-editor');
 // Replaying the opening keeps the actual game state and disposes each preview.
 const progress=await page.evaluate(()=>JSON.stringify(window.__terra.state.serialize()));
 for(let i=0;i<3;i++){await page.click('#map-button');assert.equal(await page.locator('.atlas-layout .city-map-image').count(),1);await page.click('#map-replay-opening');await page.click('#unfold-map');await page.click('#opening-scene-carousel [data-carousel-next]');await page.click('#start-button');await page.click('#brief-done');}
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__terra.state.serialize()).replace(/"elapsedMs":[\d.]+/g,'"elapsedMs":0')),progress.replace(/"elapsedMs":[\d.]+/g,'"elapsedMs":0'));
 await page.evaluate(()=>window.__terra.setLang('en'));await page.click('#map-button');await page.click('#map-replay-opening');await page.click('#unfold-map');await snapshot('05-scene-en');
 const mobile=await newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}),mp=await mobile.newPage();
 await mp.goto(url);await mp.waitForFunction(()=>!!window.__terra);await mp.tap('#prologue-carousel [data-carousel-next]');await snapshot('06-mobile-home',mp);await mp.tap('#unfold-map');await mp.tap('#opening-scene-carousel [data-carousel-next]');await snapshot('07-mobile-scene',mp);
 assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await enter(mp);await mp.evaluate(()=>{const s=window.__terra.state;s.tutorial={status:'complete',step:null};s.collectClay();s.shapeEdits=1;s.piece.pixels=s.target.slice();});await station('kiln',mp);await mp.tap('#fire-button');
 const b=await mp.locator('#stoke-button').boundingBox(),session=await mobile.newCDPSession(mp);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await mp.waitForTimeout(300);assert.equal(await mp.evaluate(()=>window.__terra.state.kiln.stoking),true);
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mp.waitForTimeout(100);assert.equal(await mp.evaluate(()=>window.__terra.state.kiln.stoking),false);await snapshot('08-mobile-kiln',mp);
 await mobile.close();
 const reduced=await newContext({viewport:{width:1200,height:900},reducedMotion:'reduce'}),rp=await reduced.newPage();await rp.goto(url);await rp.waitForFunction(()=>!!window.__terra);await rp.click('#unfold-map');await rp.click('#opening-scene-carousel [data-carousel-index="3"]');await rp.mouse.move(5,5);
 const angle=await rp.locator('#opening-scene-carousel').getAttribute('data-rotation');await rp.waitForTimeout(400);assert.equal(await rp.locator('#opening-scene-carousel').getAttribute('data-rotation'),angle);await reduced.close();
 assert.deepEqual(errors,[]);console.log('PASS: real 12-second firing, pauses, retry, replay disposal, English, touch and reduced motion');
}finally{await browser.close();}
