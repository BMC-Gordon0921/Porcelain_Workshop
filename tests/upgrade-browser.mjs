import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const url=process.env.GAME_URL||'http://127.0.0.1:5174/';
const out=new URL('../qa/upgrade/',import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'zh-CN'});
const errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
const page=await context.newPage();
const shot=async(name,p=page)=>p.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
const ready=async(p=page)=>p.waitForFunction(()=>!!window.__terra);
const camera=()=>page.evaluate(()=>({...window.__terra.world.orbit}));
async function station(id){
 await page.evaluate(id=>{const t=window.__terra;t.closeTask();const s=t.world.stations.find(s=>s.id===id);t.world.player.group.position.set(s.approach[0],0,s.approach[1]);},id);
 await page.waitForTimeout(80);await page.keyboard.press('f');
}
async function drag(locator,dx,dy){const b=await locator.boundingBox(),x=b.x+b.width*.5,y=b.y+b.height*.42;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:10});await page.mouse.up();}
async function hidden(p,value){await p.evaluate(value=>{Object.defineProperty(document,'hidden',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange'));},value);}
try{
 await page.goto(url);await ready();await page.mouse.move(0,0);
 const hero=page.locator('#prologue-carousel');assert.equal(await hero.getAttribute('data-visible-count'),'1');const first=await hero.getAttribute('data-index');
 await page.waitForTimeout(2200);await shot('01-home');await page.waitForFunction(i=>document.querySelector('#prologue-carousel').dataset.index!==i,first,{timeout:7500});
 assert.equal(await page.locator('#welcome').getAttribute('data-opening-stage'),'intro');
 const b=await hero.boundingBox();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.45);const hovered=await hero.getAttribute('data-index');
 await page.waitForTimeout(5300);assert.equal(await hero.getAttribute('data-index'),hovered);assert.equal(await page.locator('.hero-caption p').isVisible(),true);
 const rotation=Number(await hero.getAttribute('data-rotation'));await drag(page.locator('.hero-canvas'),110,45);assert.ok(Math.abs(Number(await hero.getAttribute('data-rotation'))-rotation)>.5);await shot('02-home-drag');
 await page.mouse.move(0,0);await hidden(page,true);await page.waitForTimeout(1200);assert.equal(await hero.getAttribute('data-index'),hovered);await hidden(page,false);
 await page.click('.opening-lang');await page.waitForTimeout(120);assert.equal((await page.locator('#unfold-map').innerText()).replace(/\s+/g,' '),'Explore the map introduction →');await shot('03-home-en');await page.click('.opening-lang');
 await page.click('#unfold-map');assert.equal(await page.locator('#welcome').getAttribute('data-opening-stage'),'map');await page.click('#skip-opening');await page.click('#start-button');await page.click('#brief-done');
 const initial=await camera();await drag(page.locator('#world'),150,70);const rotated=await camera();assert.notEqual(rotated.azimuth,initial.azimuth);assert.notEqual(rotated.polar,initial.polar);
 await page.mouse.wheel(0,-400);await page.waitForTimeout(100);assert.ok((await camera()).zoom>1);
 await drag(page.locator('#world'),0,1400);assert.ok(Math.abs((await camera()).polar-Math.PI/2)<1e-8);await drag(page.locator('#world'),0,-1400);assert.ok(Math.abs((await camera()).polar-24*Math.PI/180)<1e-8);
 await page.mouse.move(600,460);await page.mouse.wheel(0,-100000);await page.waitForTimeout(100);assert.equal((await camera()).zoom,2.6);await page.mouse.wheel(0,100000);await page.waitForTimeout(100);assert.equal((await camera()).zoom,.62);
 await page.click('#reset-view');assert.deepEqual(await camera(),initial);await shot('04-workshop');
 await page.click('#help-button');await page.locator('#world').dispatchEvent('wheel',{deltaY:-500});assert.deepEqual(await camera(),initial);await page.click('#help-done');
 await station('clay');await page.click('#fresh-clay');await page.keyboard.down('f');await page.waitForTimeout(100);await page.click('#close-task');await page.keyboard.down('f');assert.equal(await page.locator('#task-overlay').isVisible(),false);await page.keyboard.up('f');
 await page.keyboard.press('e');assert.equal(await page.locator('#task-overlay').isVisible(),false);
 await station('serve');assert.equal(await page.locator('#confirm-review').isDisabled(),true);await page.click('#close-task');
 await station('wheel');assert.equal(await page.locator('#sculpt-canvas').isVisible(),true);
 const board=await page.locator('#sculpt-canvas').boundingBox();const x=board.x+board.width*8/112,y=board.y+board.height*38/112;
 const before=await page.evaluate(()=>Array.from(window.__terra.state.piece.pixels));
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+board.width*.16,y+board.height*.12,{steps:12});await page.mouse.up();
 assert.notDeepEqual(await page.evaluate(()=>Array.from(window.__terra.state.piece.pixels)),before);await shot('05-shaping');
 await page.click('#undo-stroke');assert.deepEqual(await page.evaluate(()=>Array.from(window.__terra.state.piece.pixels)),before);await page.click('#redo-stroke');await page.click('#save-editor');
 await station('kiln');await page.click('#fire-button');await page.waitForTimeout(500);await page.keyboard.press('Escape');
 const remaining=await page.evaluate(()=>window.__terra.state.kiln.remaining);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.__terra.state.kiln.remaining),remaining);
 await page.keyboard.press('f');await page.evaluate(()=>window.__terra.showHelp());const helpRemaining=await page.evaluate(()=>window.__terra.state.kiln.remaining);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__terra.state.kiln.remaining),helpRemaining);await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>window.__terra.state.kilnResult),null);if(await page.locator('#help-overlay').isVisible())await page.keyboard.press('Escape');assert.equal(await page.locator('#kiln-grade').isVisible(),true);
 await hidden(page,true);const hiddenRemaining=await page.evaluate(()=>window.__terra.state.kiln.remaining);await page.waitForTimeout(300);await hidden(page,false);assert.ok(Math.abs(await page.evaluate(()=>window.__terra.state.kiln.remaining)-hiddenRemaining)<.2);
 // Set the sweep near its window, then use a real keyboard input to lock it.
 await page.evaluate(()=>{window.__terra.state.kiln.remaining=9*(1-.65);});await shot('06-kiln');await page.keyboard.down('Space');await page.keyboard.down('Space');await page.keyboard.up('Space');
 assert.equal(await page.evaluate(()=>window.__terra.state.kilnResult.grade),'perfect');await shot('07-perfect');await page.click('#fire-button');assert.equal(await page.evaluate(()=>window.__terra.state.kilnResult.grade),'perfect');
 await page.reload();await ready();await page.click('#skip-opening');await page.click('#brief-done');assert.equal(await page.evaluate(()=>window.__terra.state.kilnResult.grade),'perfect');
 await station('kiln');assert.ok((await page.locator('#fire-button').innerText()).includes('完成'));await page.click('#fire-button');
 await station('paint');const paintBoard=await page.locator('#sculpt-canvas').boundingBox();await page.mouse.click(paintBoard.x+paintBoard.width*.5,paintBoard.y+paintBoard.height*.5);assert.equal(await page.evaluate(()=>window.__terra.state.kilnResult),null);await page.click('#save-editor');
 await station('kiln');await page.click('#fire-button');await page.evaluate(()=>{const c=window.__terra.state;c.piece.pixels=c.target.slice();c.kiln.remaining=.01;});await page.waitForFunction(()=>!!window.__terra.state.kilnResult);assert.equal(await page.evaluate(()=>window.__terra.state.kilnResult.grade),'plain');await page.click('#fire-button');
 await station('serve');await page.click('#confirm-review');assert.equal(await page.evaluate(()=>window.__terra.state.money),100);assert.ok((await page.locator('.reward-breakdown').innerText()).includes('基础奖励'));await shot('08-result');
 console.log('PASS: homepage, camera limits, F input, shaping, firing pause/resume, persistence and delivery');

 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));await mp.goto(url);await ready(mp);await mp.waitForTimeout(2200);await shot('09-mobile-home',mp);
 assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await mp.locator('.hero-caption p').isVisible(),true);
 await mp.click('#skip-opening');await mp.click('#brief-done');await shot('10-mobile-workshop',mp);
 await mp.evaluate(()=>{const t=window.__terra;t.state.collectClay();const s=t.world.stations.find(s=>s.id==='wheel');t.world.player.group.position.set(s.approach[0],0,s.approach[1]);});await mp.waitForTimeout(100);await mp.tap('#touch-interact');await shot('11-mobile-shaping',mp);
 const tooSmall=await mp.locator('#task-overlay').evaluate(el=>[...el.querySelectorAll('p,button,label,small')].filter(e=>e.getClientRects().length&&parseFloat(getComputedStyle(e).fontSize)<12).map(e=>e.textContent));assert.deepEqual(tooSmall,[]);
 await mp.click('#save-editor');await mp.evaluate(()=>window.__terra.openKiln());await mp.click('#fire-button');await mp.waitForTimeout(250);await mp.tap('#strike-button');assert.equal(await mp.evaluate(()=>window.__terra.state.kilnResult.grade),'plain');await shot('12-mobile-kiln',mp);await mobile.close();
 const reduced=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});const rp=await reduced.newPage();await rp.goto(url);await ready(rp);await rp.mouse.move(0,0);const rr=await rp.locator('#prologue-carousel').getAttribute('data-rotation');await rp.waitForTimeout(250);assert.equal(await rp.locator('#prologue-carousel').getAttribute('data-rotation'),rr);await rp.click('#unfold-map');assert.equal(await rp.locator('#welcome').getAttribute('data-intro-state'),'complete');await reduced.close();
 assert.deepEqual(errors,[]);console.log('PASS: touch, narrow-screen typography, reduced motion and no browser errors');
}finally{await browser.close();}
