import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';

const url=process.env.GAME_URL||'http://127.0.0.1:5174/';
const manifest=JSON.parse(await readFile(new URL('../public/models/maps/manifest.json',import.meta.url),'utf8'));
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'msedge',headless:true});
await mkdir('qa/chimney',{recursive:true});
const errors=[];
async function smokeState(page){
 return page.evaluate(()=>{
  const world=window.__terra.world,smoke=world.scene.getObjectByName('chimney-smoke');
  const position=smoke.getWorldPosition(smoke.position.clone()),projected=position.clone().project(world.camera);
  return {visible:smoke.visible,time:smoke.material.uniforms.uTime.value,intensity:smoke.material.uniforms.uActive.value,position:position.toArray(),projected:projected.toArray(),kilnPaused:window.__terra.state.kilnPaused,firing:!!window.__terra.state.kiln};
 });
}
try{
 for(const [index,id] of ['guyao','museum','imperial','taoxichuan'].entries()){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.click('#unfold-map');await page.locator('#opening-scene-carousel [data-carousel-index]').nth(index).click();
  await page.click('#start-button');await page.click('#brief-done');
  await page.waitForFunction(()=>window.__terra.world.loading===false&&document.querySelector('#welcome').classList.contains('hidden'));
  const before=await smokeState(page);await page.waitForTimeout(650);const after=await smokeState(page);
  console.log(id,JSON.stringify(after));
  assert.equal(after.firing,false);assert.equal(after.kilnPaused,true);
  if(manifest[id].chimney){
   assert.equal(after.visible,true,'landmark chimney must smoke before the player starts firing');
   assert.ok(after.time>before.time+.2,'ambient smoke must advance independently of the kiln clock');
   assert.ok(after.intensity>.5);
   const anchor=manifest[id].chimney;
   for(const [i,axis] of ['x','y','z'].entries())assert.ok(Math.abs(after.position[i]-anchor[axis])<.001,'emission uses the imported chimney anchor');
   // Compare actual WebGL pixels with and without smoke in the same frame.
   const changed=await page.evaluate(()=>{
    const w=window.__terra.world,s=w.scene.getObjectByName('chimney-smoke'),gl=w.renderer.getContext();
    const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
    const withSmoke=new Uint8Array(width*height*4),withoutSmoke=new Uint8Array(withSmoke.length);
    w.renderer.render(w.scene,w.camera);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,withSmoke);
    s.visible=false;w.renderer.render(w.scene,w.camera);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,withoutSmoke);s.visible=true;w.renderer.render(w.scene,w.camera);
    let changed=0;for(let i=0;i<withSmoke.length;i+=4)if(Math.abs(withSmoke[i]-withoutSmoke[i])+Math.abs(withSmoke[i+1]-withoutSmoke[i+1])+Math.abs(withSmoke[i+2]-withoutSmoke[i+2])>3)changed++;
    return changed;
   });
   assert.ok(changed>20,`smoke must contribute visible pixels in the gameplay camera (${changed})`);
   await page.screenshot({path:`qa/chimney/${id}-gameplay.png`});
   // Returning from help must not leave smoke locked to the paused kiln.
   await page.click('#help-button');await page.click('#help-done');const resumed=await smokeState(page);await page.waitForTimeout(300);
   assert.ok((await smokeState(page)).time>resumed.time);
  }else assert.equal(after.visible,false,'scenes without a landmark chimney must not emit at an invented location');
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: ambient smoke in real gameplay, shader pixels, both Blender anchors, help recovery and smoke-free scenes');
}finally{await browser.close();}
