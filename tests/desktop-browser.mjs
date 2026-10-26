import {_electron as electron} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SAVE_KEY} from '../src/campaign.js';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'qa/desktop');
await mkdir(out,{recursive:true});
const extracted=await mkdtemp(path.join(out,'离线 游戏包-'));
const unpack=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','$ErrorActionPreference = "Stop"; Expand-Archive -LiteralPath $env:TERRA_TEST_ZIP -DestinationPath $env:TERRA_TEST_EXTRACT'],{windowsHide:true,stdio:'inherit',env:{...process.env,TERRA_TEST_ZIP:path.join(root,'release/开窑啦-Windows-x64.zip'),TERRA_TEST_EXTRACT:extracted}});
if(unpack.error||unpack.status!==0)throw unpack.error||new Error('Package extraction failed');
const profile=await mkdtemp(path.join(out,'profile-'));
const executablePath=path.join(extracted,'KaiYaoLa-win32-x64/开窑啦.exe');
const errors=[],requests=[];let app;
async function launch(){
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;delete env.NODE_PATH;
 for(const key of Object.keys(env))if(key.toLowerCase()==='path')env[key]=path.join(process.env.SystemRoot||'C:\\Windows','System32');
 app=await electron.launch({executablePath,args:['--smoke-test','--user-data-dir='+profile],cwd:extracted,env,timeout:30000});
 const page=await app.firstWindow();
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.waitForSelector('.opening-title');
 await page.waitForFunction(()=>document.querySelector('#opening-background canvas')?.dataset.loading==='false');
 return page;
}
try{
 let page=await launch();
 const packaged=await app.evaluate(({app,BrowserWindow})=>({packaged:app.isPackaged,path:app.getAppPath(),profile:app.getPath('userData'),preferences:BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()}));
 assert.equal(packaged.packaged,true);assert.ok(packaged.path.endsWith('app.asar'));assert.equal(packaged.profile,profile);
 assert.equal(packaged.preferences.nodeIntegration,false);assert.equal(packaged.preferences.contextIsolation,true);assert.equal(packaged.preferences.sandbox,true);
 assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
 assert.equal(page.url(),'terra://app/index.html');
 assert.equal(await page.locator('.opening-title').getAttribute('aria-label'),'开窑啦！');
 const manifest=await page.evaluate(()=>fetch('./models/maps/manifest.json').then(r=>r.json()));assert.equal(Object.keys(manifest).length,4);
 // Capture audio from the production game without adding shipped debug hooks.
 await page.addInitScript(()=>{const AudioClass=window.Audio;window.Audio=function(...args){const a=new AudioClass(...args);window.__desktopAudio=a;return a;};});
 await page.reload();await page.waitForSelector('#unfold-map');
 await page.click('#prologue-carousel [data-carousel-next]');
 await page.waitForFunction(()=>window.__desktopAudio.currentTime>.1&&!window.__desktopAudio.paused);
 assert.equal(await page.evaluate(()=>window.__desktopAudio.volume),.2);
 await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'packaged-home.png')});
 await page.click('#unfold-map');
 for(let i=0;i<4;i++){
  await page.locator('#opening-scene-carousel [data-carousel-index]').nth(i).click();
  await page.waitForFunction(i=>document.querySelector('#opening-scene-carousel canvas')?.dataset.landmark===['guyao','museum','imperial','taoxichuan'][i]&&document.querySelector('#opening-scene-carousel canvas').dataset.loading==='false',i);
 }
 await page.click('.opening-brand');assert.equal(await page.locator('#welcome').getAttribute('data-opening-stage'),'intro');
 await page.click('#unfold-map');await page.locator('#opening-scene-carousel [data-carousel-index]').nth(0).click();await page.click('#start-button');await page.click('#brief-done');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.keyboard.down('s');await page.waitForTimeout(250);await page.keyboard.up('s');
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).tutorial.step==='clay',SAVE_KEY);
 await page.keyboard.press('f');await page.click('#fresh-clay');
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).hasClay,SAVE_KEY);
 await page.screenshot({path:path.join(out,'packaged-game.png')});
 await page.click('#sound-button');await page.click('#lang-toggle');
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
 assert.equal(saved.hasClay,true);assert.equal(saved.tutorial.step,'wheel');
 console.log('PASS: extracted EXE without Node/browser on PATH, isolated renderer, all four offline models, music and real tutorial input');
 await app.close();app=null;
 page=await launch();
 assert.equal(await page.locator('.opening-title').getAttribute('aria-label'),'Fire Up the Kiln!');
 assert.equal(await page.evaluate(()=>localStorage.getItem('terra-sound-enabled')),'false');
 const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
 assert.equal(restored.hasClay,true);assert.equal(restored.tutorial.step,'wheel');assert.equal(restored.scene,saved.scene);assert.equal(restored.money,saved.money);
 assert.equal(requests.some(url=>/^https?:/.test(url)),false,'game must not request a server or CDN');
 assert.deepEqual(errors,[]);
 const info=JSON.parse(await readFile(path.join(extracted,'KaiYaoLa-win32-x64/build-info.json'),'utf8'));
 console.log('PASS: progress, language and sound restored after full app restart; no remote requests or browser errors');
 console.log(JSON.stringify({executablePath,electron:info.electron,version:info.version},null,2));
}finally{await app?.close();}
