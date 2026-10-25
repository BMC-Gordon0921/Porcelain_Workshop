import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const require=createRequire(path.join(root,'package.json'));
const {chromium}=require('playwright-core');
const out=path.resolve(fileURLToPath(new URL('../assets/',import.meta.url)));
await fs.mkdir(out,{recursive:true});
const url=process.env.GAME_URL||'http://127.0.0.1:5176/';
const browser=await chromium.launch({channel:'msedge',headless:true});
const ctx=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1,locale:'zh-CN',reducedMotion:'reduce'});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route(url+'__presentation-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Presentation fixture</title>'}));
const ready=async()=>{await page.waitForFunction(()=>!!window.__terra);await page.waitForTimeout(250);};
const shot=async(name,selector=null)=>{await page.waitForTimeout(180);await (selector?page.locator(selector):page).screenshot({path:path.join(out,name+'.png')});console.log('Captured '+name);};
async function enter(){await page.click('#skip-opening');if(await page.locator('#brief-done').isVisible())await page.click('#brief-done');}
async function station(id){await page.evaluate(id=>{const t=window.__terra;t.closeTask();const s=t.world.stations.find(s=>s.id===id);t.world.player.group.position.set(s.approach[0],0,s.approach[1]);},id);await page.waitForTimeout(70);await page.keyboard.press('f');}
async function seed(mode){
 const save=await page.evaluate(async mode=>{const {SculptureChallenge}=await import('/src/sculpture.js');const c=new SculptureChallenge();const pass=()=>{c.collectClay();c.piece.pixels=c.target.slice();c.fire();c.tick(9);c.submit();};
  if(mode==='shop')for(let i=0;i<5;i++)pass();
  if(mode==='collection')for(let scene=0;scene<4;scene++){for(let i=0;i<5;i++)pass();c.buyDecal();c.applyDecal();c.nextScene();}
  return c.serialize();
 },mode);
 await page.goto(url+'__presentation-fixture');
 await page.evaluate(save=>{const value=JSON.stringify(save);localStorage.setItem('terra-porcelain-journey-v5',value);sessionStorage.setItem('terra-porcelain-journey-v5',value);},save);
 await page.goto(url);await ready();await enter();
}
try{
 await page.goto(url);await ready();await page.mouse.move(0,0);await shot('home');
 const box=await page.locator('#prologue-carousel').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.4);await shot('home-hover');
 await page.click('#unfold-map');await shot('map');await page.click('#start-button');await shot('order','.task-panel');await page.click('#brief-done');await shot('workshop');
 const bowls=await page.evaluate(async()=>{
  const {createBowlPreview}=await import('/src/decals.js');const images=[];
  for(let i=0;i<4;i++){const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;left:0;top:0;width:1400px;height:1000px;opacity:0;pointer-events:none';document.body.append(canvas);const preview=createBowlPreview(canvas,{index:i,decorated:true,animate:false});images.push(preview.snapshot());preview.dispose();canvas.remove();}
  return images;
 });
 for(let i=0;i<4;i++)await fs.writeFile(path.join(out,`bowl-${i+1}.png`),Buffer.from(bowls[i].split(',')[1],'base64'));
 await page.evaluate(()=>window.__terra.state.collectClay());await station('wheel');
 const board=await page.locator('#sculpt-canvas').boundingBox();const x=board.x+board.width*8/112,y=board.y+board.height*38/112;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+board.width*.15,y,{steps:16});await page.mouse.up();await shot('shaping','.task-panel');await page.click('#save-editor');
 await page.evaluate(()=>{const c=window.__terra.state;c.piece.pixels=c.target.map(v=>v?1:0);c.piece.revision++;});await station('paint');
 const paint=await page.locator('#sculpt-canvas').boundingBox();await page.mouse.move(paint.x+paint.width*.25,paint.y+paint.height*.57);await page.mouse.down();await page.mouse.move(paint.x+paint.width*.65,paint.y+paint.height*.57,{steps:16});await page.mouse.up();await shot('painting','.task-panel');await page.click('#save-editor');
 await page.evaluate(()=>{const c=window.__terra.state;c.piece.pixels=c.target.slice();c.piece.revision++;});await station('kiln');await page.click('#fire-button');await page.evaluate(()=>{window.__terra.state.kiln.remaining=9*.35;});await page.keyboard.press('Space');await shot('kiln','.task-panel');await page.click('#fire-button');
 await station('serve');await page.click('#confirm-review');await shot('result','.task-panel');
 await seed('shop');await shot('shop','.task-panel');await page.click('#buy-decal');await page.click('#select-decal');await shot('decal','.task-panel');await page.click('#apply-decal');await page.waitForTimeout(1700);await shot('crafted','.task-panel');
 await seed('collection');await shot('collection','.task-panel');
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce',locale:'zh-CN'});const mp=await mobile.newPage();await mp.goto(url);await mp.waitForFunction(()=>!!window.__terra);await mp.waitForTimeout(250);await mp.screenshot({path:path.join(out,'mobile-home.png')});
 await mp.click('#skip-opening');await mp.click('#brief-done');await mp.screenshot({path:path.join(out,'mobile-workshop.png')});await mp.evaluate(()=>{const t=window.__terra;t.state.collectClay();t.openKiln();t.state.fire();t.state.tick(9*.66);t.state.strike();});await mp.waitForTimeout(100);await mp.screenshot({path:path.join(out,'mobile-kiln.png')});await mobile.close();
 await fs.copyFile(path.join(root,'public/maps/jingdezhen.png'),path.join(out,'map-art.png'));
 await fs.copyFile(path.join(root,'src/assets/logo-lockup.png'),path.join(out,'logo.png'));
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('All presentation screenshots captured in an isolated browser context.');
}finally{await browser.close();}
