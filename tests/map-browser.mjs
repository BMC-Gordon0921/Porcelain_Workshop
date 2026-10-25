const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {SculptureChallenge} from '../src/sculpture.js';
import {SAVE_KEY} from '../src/campaign.js';
import {PLACES} from '../src/places.js';
const url=process.env.GAME_URL||'http://127.0.0.1:5174/';
const out=fileURLToPath(new URL('../qa/',import.meta.url));await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'msedge',headless:true,args:[]});
const errors=[];
function listen(page){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();listen(page);
await page.route('**/__map-test-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Map test fixture</title>'}));
async function enter(){await page.locator('#unfold-map').click();await page.locator('#start-button').click();}
async function seed(c){await page.goto(url+'__map-test-fixture');await page.evaluate(({key,data})=>{localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem(key,JSON.stringify(data));},{key:SAVE_KEY,data:c.serialize()});await page.goto(url);await enter();}
const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
const pass=c=>{c.collectClay();c.shapeEdits=1;c.piece.pixels=c.target.slice();c.fire();c.tick(60);c.submit();};
try{
 await page.goto(url);await page.locator('#unfold-map').waitFor();
 assert.equal(await page.locator('#welcome').getAttribute('data-opening-stage'),'intro');assert.equal(await page.locator('.opening-map-phase').isVisible(),false);
 await page.waitForTimeout(1800);await page.screenshot({path:out+'map-introduction.png'});
 assert.equal(await page.locator('#welcome').getAttribute('data-opening-stage'),'intro');await page.locator('#unfold-map').click();assert.equal(await page.locator('.city-prologue').isVisible(),false);
 assert.equal(await page.locator('#opening-scene-carousel canvas').getAttribute('data-landmark'),'guyao');await page.locator('#pause-opening').click();
 const chapter=await page.locator('#welcome').getAttribute('data-chapter');await page.waitForTimeout(500);assert.equal(await page.locator('#welcome').getAttribute('data-chapter'),chapter);
 await page.screenshot({path:out+'map-opening.png'});
 await page.locator('button[data-chapter="0"]').click();await page.locator('#pause-opening').click();await page.mouse.move(0,0);await page.waitForFunction(()=>document.getElementById('welcome').dataset.chapter==='1',{},{timeout:7000});
 await page.locator('#start-button').click();await page.locator('#brief-done').click();assert.equal(await page.locator('#world').getAttribute('data-landmark'),'guyao');
 const initial=await read();await page.locator('#map-button').click();await page.locator('#city-map-content [data-place="3"]').click();assert.ok((await page.locator('.atlas-place-details').innerText()).includes('尚未抵达'));assert.deepEqual(await read(),initial);
 await page.locator('#map-continue').click();await page.locator('#brief-done').click();await page.screenshot({path:out+'map-location-1.png'});
 console.log('PASS: introduction precedes map; explicit map entry, pause, skip, rewind/resume; future pins cannot skip progression');
 // Replaying the opening never resets a sculpture or wallet.
 const edited=new SculptureChallenge({tutorial:false});edited.collectClay();edited.piece.pixels[5000]=2;edited.money=70;await seed(edited);await page.locator('#brief-done').click();const beforeReplay=await read();await page.locator('#map-button').click();await page.locator('#map-replay-opening').click();assert.equal(await page.locator('#welcome').getAttribute('data-opening-stage'),'intro');await enter();const afterReplay=await read();assert.ok(afterReplay.efficiency.elapsedMs>=beforeReplay.efficiency.elapsedMs);assert.ok(afterReplay.efficiency.elapsedMs-beforeReplay.efficiency.elapsedMs<2000);assert.deepEqual({...afterReplay,efficiency:beforeReplay.efficiency},beforeReplay);
 console.log('PASS: replay preserves live clay, money and scene');
 let c=new SculptureChallenge({tutorial:false});
 for(let scene=0;scene<3;scene++){
  for(let i=0;i<3;i++)pass(c);c.buyDecal();c.applyDecal();await seed(c);await page.locator('#next-scene').click();await page.locator('#arrive-scene').waitFor();
  assert.equal((await read()).scene,scene+1);assert.equal(await page.locator('#app').getAttribute('data-task'),'travel');assert.ok((await page.locator('#task-title').innerText()).includes('下一站'));
  assert.equal(await page.locator('.route-travel').count(),1);await page.waitForTimeout(3000);await page.screenshot({path:out+`map-travel-${scene+1}.png`});
  await page.locator('#arrive-scene').click();await page.locator('#brief-done').click();assert.equal(await page.locator('#world').getAttribute('data-landmark'),PLACES[scene+1].id);await page.screenshot({path:out+`map-location-${scene+2}.png`});
  c=SculptureChallenge.restore(await read());
  console.log(`PASS: map travel to ${PLACES[scene+1].name}, landmark ${PLACES[scene+1].id}`);
 }
 // Reloading in transit has already saved the arrival; no duplicate reward or unlock.
 await page.reload();await enter();assert.equal((await read()).scene,3);assert.equal((await read()).collection.length,3);
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('#unfold-map').waitFor();await page.screenshot({path:out+'map-mobile-intro.png'});await page.locator('#unfold-map').click();await page.waitForTimeout(1500);await page.screenshot({path:out+'map-mobile-opening.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#start-button').click();await page.locator('#brief-done').click();await page.locator('#map-button').click();await page.locator('#city-map-content [data-place="2"]').click();await page.locator('#map-continue').click();await page.locator('#brief-done').click();
 console.log('PASS: narrow-screen intro, map and return to gameplay');
 const reducedContext=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});const reducedPage=await reducedContext.newPage();listen(reducedPage);await reducedPage.goto(url);await reducedPage.locator('#unfold-map').waitFor();assert.equal(await reducedPage.locator('#welcome').getAttribute('data-opening-stage'),'intro');await reducedPage.locator('#unfold-map').click();assert.equal(await reducedPage.locator('#welcome').getAttribute('data-intro-state'),'playing');await reducedContext.close();
 assert.deepEqual(errors,[]);console.log('PASS: reduced motion retains introduction; no browser errors');
}finally{await browser.close();}
