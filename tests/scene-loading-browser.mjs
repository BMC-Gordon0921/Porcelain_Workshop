import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'msedge',headless:true});
const url=process.env.GAME_URL||'http://127.0.0.1:5174/';
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let attempts=0;await page.route('**/models/maps/museum.glb',route=>++attempts===1?route.abort():route.continue());
 await page.goto(url);await page.click('#unfold-map');await page.locator('#opening-scene-carousel [data-carousel-index]').nth(1).click();
 await page.locator('.scene-load button').waitFor();assert.equal(await page.evaluate(()=>window.__terra.state.startedJourney),false);
 await page.click('.scene-load button');await page.waitForFunction(()=>document.querySelector('#opening-scene-carousel canvas').dataset.landmark==='museum');assert.equal(attempts,2);
 for(const index of [3,0,2])await page.locator('#opening-scene-carousel [data-carousel-index]').nth(index).click();
 await page.waitForFunction(()=>document.querySelector('#opening-scene-carousel canvas').dataset.landmark==='imperial');
 await page.waitForTimeout(200);assert.equal(await page.locator('#opening-scene-carousel').getAttribute('data-index'),'2');assert.ok(Number(await page.locator('#opening-scene-carousel').getAttribute('data-customers'))<=3);
 await page.evaluate(()=>document.activeElement.blur());await page.mouse.move(5,5);
 const index=await page.locator('#opening-scene-carousel').getAttribute('data-index');
 await page.waitForFunction(index=>document.querySelector('#opening-scene-carousel').dataset.index!==index,index,{timeout:48000});
 assert.equal(await page.locator('#opening-scene-carousel').getAttribute('data-demo-step'),'clay');
 await page.click('.opening-lang');await page.waitForTimeout(150);assert.match(await page.locator('#start-button').innerText(),/Start here/);assert.match(await page.locator('.demo-caption').innerText(),/demonstration/);
 assert.deepEqual(errors,[]);console.log('PASS: failed GLB retry, latest request wins, preserved progress, real full-cycle autoplay and English');
}finally{await browser.close();}
