const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {SculptureChallenge} from '../src/sculpture.js';
import {SAVE_KEY,SCENES} from '../src/campaign.js';
const out=new URL('../qa/',import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'msedge',headless:true,args:[]});
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const url=process.env.GAME_URL||'http://127.0.0.1:5174/';
await page.route('**/__smoke-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Test fixture</title>'}));
const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
const pass=c=>{c.collectClay();c.piece.pixels=c.target.slice();c.fire();c.tick(60);c.submit();};
async function seed(c){await page.goto(url+'__smoke-fixture');await page.evaluate(({key,data})=>{localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem(key,JSON.stringify(data));},{key:SAVE_KEY,data:c.serialize()});await page.goto(url);await page.locator('#unfold-map').click();await page.locator('#start-button').click();}
async function moveTo(x,z){
 for(let n=0;n<100;n++){
  const p=JSON.parse(await page.locator('#world').getAttribute('data-player')),vx=x-p.x,vz=z-p.z;if(Math.hypot(vx,vz)<.16)return;
  const dx=vx*.89-vz*.454,dz=vx*.454+vz*.89;
  const keys=[];if(Math.abs(dx)>.12)keys.push(dx>0?'d':'a');if(Math.abs(dz)>.12)keys.push(dz>0?'s':'w');
  for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(75);for(const key of keys)await page.keyboard.up(key);
 }
 throw new Error('Movement did not reach '+x+','+z);
}
async function interact(){await page.keyboard.press('f');await page.waitForTimeout(650);}
try{
 await page.goto(url);await page.locator('#unfold-map').waitFor();await page.screenshot({path:fileURLToPath(new URL('01-welcome.png',out))});
 await page.locator('#unfold-map').click();await page.locator('#start-button').click();await page.locator('#brief-done').click();await interact();await page.locator('#fresh-clay').click();assert.equal((await read()).hasClay,true);
 await moveTo(.4,-2.05);await interact();await page.locator('#sculpt-canvas').waitFor();
 const board=await page.locator('#sculpt-canvas').boundingBox();await page.mouse.move(board.x+board.width*.2,board.y+board.height*.35);await page.mouse.down();await page.mouse.move(board.x+board.width*.3,board.y+board.height*.35,{steps:6});await page.mouse.up();await page.locator('#save-editor').click();assert.ok((await read()).edits>0);
 console.log('PASS: starting a game, collecting clay, walking and carving');
 const work=new SculptureChallenge();work.collectClay();work.piece.pixels=work.target.slice();work.fire();work.tick(60);await seed(work);await page.locator('#brief-done').click();await moveTo(1.7,-2.05);await moveTo(1.7,0);await interact();await page.locator('#confirm-review').click();await page.locator('#result-next').waitFor();assert.equal((await read()).money,180);assert.equal((await read()).level,1);await page.screenshot({path:fileURLToPath(new URL('02-scoring.png',out))});
 console.log('PASS: submitting through the real counter awards 180 coins and advances');
 let c=new SculptureChallenge();
 for(let scene=0;scene<4;scene++){
  for(let i=0;i<5;i++)pass(c);c.money=400;
  await seed(c);assert.equal(await page.locator('#buy-decal').isEnabled(),true);
  await page.screenshot({path:fileURLToPath(new URL(`scene-${scene+1}-shop.png`,out))});
  await page.locator('#buy-decal').click();assert.equal((await read()).money,0);assert.equal((await read()).phase,'decal');assert.equal(await page.locator('#apply-decal').isDisabled(),true);
  await page.reload();await page.locator('#unfold-map').click();await page.locator('#start-button').click();assert.equal((await read()).phase,'decal');assert.equal((await read()).money,0);
  await page.locator('#select-decal').click();
  if(scene%2===0)await page.locator('#apply-decal').click();else await page.locator('#bowl-preview').click();
  await page.locator('#next-scene').waitFor();assert.equal((await read()).collection.length,scene+1);
  await page.screenshot({path:fileURLToPath(new URL(`scene-${scene+1}-bowl.png`,out))});
  await page.reload();await page.locator('#unfold-map').click();await page.locator('#start-button').click();await page.locator('#next-scene').click();
  const saved=await read();assert.equal(saved.phase,scene===3?'complete':'levels');assert.equal(saved.scene,Math.min(scene+1,3));assert.equal(saved.level,scene===3?4:0);
  c=SculptureChallenge.restore(saved);console.log(`PASS: scene ${scene+1} exact-400 purchase, reload, application, collection and transition`);
 }
 await page.screenshot({path:fileURLToPath(new URL('07-final-collection.png',out))});assert.equal(await page.locator('.collection-card.owned').count(),4);
 await page.locator('[data-bowl="0"]').click();await page.locator('#bowl-preview').waitFor();await page.locator('#back-collection').click();
 // Confirm the narrow layout stays inside the viewport and the purchasing controls remain usable.
 await page.setViewportSize({width:390,height:844});c=new SculptureChallenge();for(let i=0;i<5;i++)pass(c);c.money=400;await seed(c);await page.screenshot({path:fileURLToPath(new URL('08-mobile-shop.png',out))});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('#buy-decal').click();await page.locator('#select-decal').click();await page.locator('#apply-decal').click();await page.locator('#next-scene').waitFor();
 console.log('PASS: mobile purchase and application');
 await page.setViewportSize({width:1440,height:1000});
 const textures=await page.evaluate(async()=>{const {decalImage,bowlImage}=await import('/src/decals.js');return Array.from({length:4},(_,i)=>({texture:decalImage(i),bowl:bowlImage(i)}));});
 await fs.mkdir(new URL('decals/',out),{recursive:true});
 for(let i=0;i<4;i++){await fs.writeFile(new URL(`decals/0${i+1}-${SCENES[i].id}.png`,out),Buffer.from(textures[i].texture.split(',')[1],'base64'));await fs.writeFile(new URL(`bowl-${i+1}.png`,out),Buffer.from(textures[i].bowl.split(',')[1],'base64'));}
 assert.deepEqual(errors,[]);console.log('PASS: no browser errors; four PNG textures exported');
}finally{await browser.close();}
