import {chromium} from 'playwright-core';
import {spawn,spawnSync} from 'node:child_process';
import {mkdir,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
await mkdir('qa/quick-package',{recursive:true});const extracted=await mkdtemp(path.resolve('qa/quick-package/解压 测试-'));
const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','Expand-Archive -LiteralPath $env:TERRA_ZIP -DestinationPath $env:TERRA_OUT'],{windowsHide:true,env:{...process.env,TERRA_ZIP:path.resolve('release/开窑啦-即开即玩-Windows.zip'),TERRA_OUT:extracted}});assert.equal(result.status,0);
const game=path.join(extracted,'开窑啦-即开即玩');
const child=spawn(path.join(game,'runtime/node.exe'),[path.join(game,'start-game.cjs'),'--no-open'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PATH:'C:\\Windows\\System32'}});
child.stderr.on('data',d=>process.stderr.write(d));
let browser;
try{
 await new Promise((done,reject)=>{child.stdout.once('data',done);child.once('error',reject);child.once('exit',c=>reject(Error('Server exited '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const AudioClass=window.Audio;window.Audio=function(...args){const a=new AudioClass(...args);window.__audio=a;return a;};});
 await page.goto('http://127.0.0.1:49173/');await page.waitForFunction(()=>document.querySelector('#opening-background canvas')?.dataset.loading==='false');
 await page.click('#prologue-carousel [data-carousel-next]');await page.waitForFunction(()=>window.__audio.currentTime>0&&!window.__audio.paused);
 await page.click('#unfold-map');for(let i=0;i<4;i++){await page.locator('#opening-scene-carousel [data-carousel-index]').nth(i).click();await page.waitForFunction(i=>document.querySelector('#opening-scene-carousel canvas').dataset.landmark===['guyao','museum','imperial','taoxichuan'][i]&&document.querySelector('#opening-scene-carousel canvas').dataset.loading==='false',i);}
 await page.locator('#opening-scene-carousel [data-carousel-index]').nth(0).click();await page.click('#start-button');await page.click('#brief-done');await page.keyboard.down('s');await page.waitForTimeout(300);await page.keyboard.up('s');await page.click('#sound-button');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('terra-porcelain-journey-v6')));assert.equal(saved.scene,0);
 await page.reload();await page.click('#skip-opening');await page.click('#brief-done');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('terra-porcelain-journey-v6')).scene),0);assert.equal(await page.evaluate(()=>localStorage.getItem('terra-sound-enabled')),'false');
 await page.screenshot({path:'qa/quick-package/verified-game.png'});assert.deepEqual(errors,[]);console.log('PASS: extracted package, bundled runtime, all four scenes, audio, gameplay entry and save recovery');
}finally{await browser?.close();child.kill();}
