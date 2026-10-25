import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const url=process.env.GAME_URL||'http://127.0.0.1:5174/';
await mkdir('qa/progression',{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
const snapshot=(name,p=page)=>p.screenshot({path:`qa/progression/${name}.png`});
const elapsed=()=>page.evaluate(()=>{window.__terra.syncClocks();return window.__terra.state.efficiency.elapsedMs;});
async function enter(p=page){await p.waitForFunction(()=>!!window.__terra);await p.evaluate(()=>{window.__terra.state.tutorial={status:'complete',step:null};});await p.click('#skip-opening');if(await p.locator('#brief-done').isVisible())await p.click('#brief-done');}
async function station(id,p=page){await p.evaluate(id=>{const t=window.__terra;t.closeTask();const s=t.world.stations.find(s=>s.id===id);t.world.player.group.position.set(s.approach[0],0,s.approach[1]);},id);await p.waitForTimeout(80);await p.keyboard.press('f');}
async function paused(action,leave){await action();const a=await elapsed();await page.waitForTimeout(300);assert.equal(await elapsed(),a);await leave();}
async function finishFire(p=page,seconds={perfect:12,good:0,fair:0}){await p.waitForFunction(()=>!!window.__terra.state.kiln);await p.evaluate(seconds=>{const s=window.__terra.state;s.kiln.seconds={...seconds};s.kiln.remaining=0;s.finishFiring();},seconds);await p.waitForFunction(()=>!!window.__terra.state.kilnResult);}
try{
 await page.goto(url);await enter();await snapshot('01-workshop');
 await page.click('#upgrades-button');assert.equal(await page.locator('[data-upgrade]:disabled').count(),6);await page.click('#close-task');
 await page.evaluate(()=>{window.__terra.state.money=540;});await page.click('#upgrades-button');await page.click('[data-upgrade="clay"]');await page.waitForTimeout(360);await page.click('[data-upgrade="clay"]');await page.waitForTimeout(360);await page.click('[data-upgrade="wheel"]');assert.equal(await page.evaluate(()=>window.__terra.state.stationLevel('clay')),3);assert.equal(await page.evaluate(()=>window.__terra.state.money),420);await snapshot('02-upgrades');
 await station('clay');await page.click('#fresh-clay');assert.equal(await page.evaluate(()=>window.__terra.state.efficiency.eligible),true);
 await station('wheel');assert.equal(await page.locator('#sculpt-canvas').getAttribute('data-guides'),'true');const board=await page.locator('#sculpt-canvas').boundingBox();assert.ok(Math.abs(board.width-board.height)<1);
 const before=await page.evaluate(()=>Array.from(window.__terra.state.piece.pixels));const edge=await page.evaluate(()=>{const a=window.__terra.state.piece.pixels,y=45;let x=0;while(!a[y*112+x])x++;return {x:x+.5,y:y+.5};});
 await page.mouse.move(board.x+board.width*edge.x/112,board.y+board.height*edge.y/112);await page.mouse.down();await page.mouse.move(board.x+board.width*(edge.x+9)/112,board.y+board.height*edge.y/112,{steps:12});await page.mouse.up();
 assert.notDeepEqual(await page.evaluate(()=>Array.from(window.__terra.state.piece.pixels)),before);await snapshot('03-shaping');await page.click('#undo-stroke');assert.deepEqual(await page.evaluate(()=>Array.from(window.__terra.state.piece.pixels)),before);await page.click('#redo-stroke');
 await paused(()=>page.evaluate(()=>window.__terra.showHelp()),()=>page.click('#help-done'));
 await page.click('#save-editor');const start=await elapsed();await page.waitForTimeout(300);assert.ok(await elapsed()>start+250);
 await paused(()=>page.click('#upgrades-button'),()=>page.click('#close-task'));
 await paused(()=>page.click('#map-button'),()=>page.click('#close-task'));
 await paused(()=>page.evaluate(()=>window.dispatchEvent(new Event('blur'))),()=>page.evaluate(()=>window.dispatchEvent(new Event('focus'))));
 await paused(()=>page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}),()=>page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));}));
 const savedTime=await elapsed();await page.reload();await enter();assert.ok(await elapsed()>=savedTime-1000);assert.equal(await page.evaluate(()=>window.__terra.state.stationLevel('clay')),3);
 await station('paint');const firstPaint=await page.locator('#sculpt-canvas').boundingBox();await page.mouse.click(firstPaint.x+firstPaint.width*.5,firstPaint.y+firstPaint.height*.5);await page.click('#save-editor');await page.evaluate(()=>{const s=window.__terra.state;s.piece.pixels=s.target.slice();s.piece.revision++;});
 await station('kiln');await page.click('#fire-button');await page.waitForTimeout(350);await snapshot('04-kiln');await page.click('#close-task');const remaining=await page.evaluate(()=>window.__terra.state.kiln.remaining),walkingTime=await elapsed();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__terra.state.kiln.remaining),remaining);assert.ok(await elapsed()>walkingTime+250);
 await station('kiln');assert.equal(await page.evaluate(()=>window.__terra.state.kiln.duration),12);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));const beforeHeat=await page.evaluate(()=>window.__terra.state.kiln.heat);await page.keyboard.down('Space');await page.waitForTimeout(450);const afterHeat=await page.evaluate(()=>window.__terra.state.kiln.heat);assert.ok(afterHeat>beforeHeat+.1);await page.keyboard.up('Space');await finishFire();assert.equal(await page.evaluate(()=>window.__terra.state.kilnResult.grade),'perfect');assert.equal(await page.evaluate(()=>'rounds' in window.__terra.state.kilnResult),false);
 // Use a perfect-score fixture for settlement; the shaping gesture above exercises actual pointer input.
 await page.evaluate(()=>{const t=window.__terra;t.state.piece.pixels=t.state.target.slice();t.state.piece.revision++;t.state.invalidateFiring();});await station('kiln');await page.click('#fire-button');await finishFire();
 await station('serve');await page.click('#confirm-review');assert.equal(await page.locator('.efficiency-result b').innerText(),'效率达标 · +20%');assert.equal(await page.evaluate(()=>window.__terra.state.results[0].efficiencyBonus),25);assert.equal(await page.evaluate(()=>window.__terra.state.results[0].firstPassBonus),60);await snapshot('05-efficiency');
 await page.evaluate(()=>window.__terra.setLang('en'));await page.waitForTimeout(80);assert.ok((await page.locator('.efficiency-result').innerText()).includes('On time'));await page.click('#close-task');await page.click('#upgrades-button');assert.ok((await page.locator('#task-title').innerText()).includes('workshop'));await snapshot('06-upgrades-en');
 const cjk=await page.locator('#task-body').evaluate(el=>[...el.querySelectorAll('*')].filter(n=>n.children.length===0&&/[\u4e00-\u9fa5]/.test(n.textContent)).map(n=>n.textContent));assert.deepEqual(cjk,[]);
 await page.click('#close-task');await page.evaluate(()=>window.__terra.setLang('zh'));
 // Expired orders retain all ordinary income, without an efficiency award.
 await page.evaluate(()=>{const t=window.__terra;t.state.collectClay();t.state.shapeEdits=1;t.state.piece.pixels=t.state.target.slice();t.state.advanceEfficiency(300001);t.state.fire();t.state.tick(60);});await station('serve');await page.click('#confirm-review');assert.equal(await page.evaluate(()=>window.__terra.state.results.at(-1).efficiencyBonus),0);assert.equal(await page.evaluate(()=>window.__terra.state.results.at(-1).regularEarned),100);
 // Repeated close-ups are disposed, and painting upgrades unlock their controls.
 await page.evaluate(()=>{const s=window.__terra.state;s.collectClay();s.money=500;s.upgradeStation('paint');s.upgradeStation('paint');});
 await page.evaluate(()=>{const s=window.__terra.state;s.shapeEdits=1;s.piece.pixels=s.target.slice();});await station('paint');assert.equal(await page.locator('[data-assist="line"]').isEnabled(),true);assert.equal(await page.locator('[data-assist="mirror"]').isEnabled(),true);
 for(let i=0;i<4;i++){await station('kiln');await page.click('#close-task');}
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));await mp.goto(url);await enter(mp);await station('clay',mp);await mp.tap('#fresh-clay');await station('wheel',mp);
 const box=await mp.locator('#sculpt-canvas').boundingBox();assert.ok(Math.abs(box.width-box.height)<1);const touchSession=await mobile.newCDPSession(mp);await mp.bringToFront();const tx=box.x+box.width*.08,ty=box.y+box.height*.45;await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});for(let i=1;i<=8;i++)await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+25*i/8,y:ty}]});await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(await mp.evaluate(()=>window.__terra.state.edits)>0);await snapshot('07-mobile-shaping',mp);
 await station('paint',mp);const paintBox=await mp.locator('#sculpt-canvas').boundingBox();await mp.mouse.click(paintBox.x+paintBox.width*.5,paintBox.y+paintBox.height*.5);await mp.click('#save-editor');await station('kiln',mp);await mp.tap('#fire-button');await snapshot('08-mobile-kiln',mp);assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await station('clay',mp);await mp.click('#close-task');await mp.tap('#upgrades-button');await snapshot('09-mobile-upgrades',mp);assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.close();
 assert.deepEqual(errors,[]);console.log('PASS: upgrades, pointer shaping, clock pauses, save restore, fixed 12s firing, rewards, English and mobile layouts');
}finally{await browser.close();}
