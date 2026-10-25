import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const out=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const require=createRequire(path.join(root,'package.json'));
const {chromium}=require('playwright-core');
const manifest=JSON.parse(await fs.readFile(path.join(out,'source/manifest.json'),'utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1800,height:1400},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 for(const [i,deck] of manifest.decks.entries()){
  const thumbs=await Promise.all(deck.slides.map(async(name)=>{
   const png=await fs.readFile(path.join(out,deck.folder,name+'.png'));
   return `<figure><img src="data:image/png;base64,${png.toString('base64')}"><figcaption>${name.replace('_',' · ')}</figcaption></figure>`;
  }));
  const html=`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:36px;background:#e9ede9;color:#243e50;font-family:'Microsoft YaHei',sans-serif}h1{font-size:34px;margin:0 0 16px}p{font-size:19px;margin:0 0 26px;color:#65767b}section{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}figure{margin:0;background:#fffdf7;overflow:hidden;border-radius:8px;box-shadow:0 4px 12px #243e5015}img{width:100%;display:block}figcaption{padding:11px 16px;font-size:18px}</style><h1>Terra · ${i===0?'课程汇报':'游戏原型图集'}</h1><p>${deck.slides.length} 页 · ${i===0?'约 8 分钟讲解，附逐页讲稿':'页面结构、实际界面与交互规则'}</p><section>${thumbs.join('')}</section>`;
  await page.setContent(html);await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  await page.screenshot({path:path.join(out,i===0?'课程汇报总览.png':'原型图总览.png'),fullPage:true});
 }
 await page.goto(pathToFileURL(path.join(out,'原型图预览.html')).href);
 await page.locator('#board').evaluate(img=>img.decode());
 for(let i=1;i<=manifest.prototypes.length;i++){
  if(await page.locator('#counter').textContent()!==`${i} / ${manifest.prototypes.length}`)throw new Error('Navigation counter mismatch');
  await page.locator('#board').evaluate(img=>img.decode());
  await page.keyboard.press('ArrowRight');
 }
 await page.locator('#board').evaluate(img=>img.decode());
 if(await page.locator('#counter').textContent()!=='1 / 10')throw new Error('Navigation wrap failed');
 await page.setViewportSize({width:390,height:844});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error('Preview horizontal overflow');
 if(errors.length)throw new Error(errors.join('\n'));
 await fs.writeFile(path.join(out,'source/browser-audit.json'),JSON.stringify({slides:manifest.presentation.length,prototypePages:manifest.prototypes.length,allPrototypeImagesDecoded:true,navigationPassed:true,mobileHorizontalOverflow:false,pageErrors:errors},null,2));
 console.log('Contact sheets generated; all 10 offline prototype pages and narrow-screen layout verified.');
}finally{await browser.close();}
