import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';

// Serve the production build at the same project subpath used by GitHub Pages.
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const prefix='/Porcelain_Workshop/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
  const file=resolve(root,decodeURIComponent(pathname.slice(prefix.length))||'index.html');
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(body);
 }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
 browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 const response=await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`);assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.querySelector('#prologue-carousel')?.dataset.index!==undefined);
 await page.click('#unfold-map');await page.waitForSelector('#opening-scene-carousel canvas');
 await page.click('#start-button');await page.click('#brief-done');await page.click('#map-button');
 await page.waitForFunction(()=>[...document.querySelectorAll('.city-map-image')].some(img=>img.complete&&img.naturalWidth>0));
 assert.ok((await page.locator('.city-map-image').first().getAttribute('src')).startsWith('./maps/'));
 await page.click('#map-continue');await page.click('#brief-done');await page.click('#open-journey');
 await page.waitForFunction(()=>[...document.querySelectorAll('.reference-texture img')].length>0&&[...document.querySelectorAll('.reference-texture img')].every(img=>img.complete&&img.naturalWidth>0));
 assert.ok((await page.locator('.reference-texture img').first().getAttribute('src')).startsWith('./references/'));
 await mkdir(new URL('../qa/',import.meta.url),{recursive:true});await page.screenshot({path:fileURLToPath(new URL('../qa/pages-preview.png',import.meta.url))});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log('PASS: production build loads scripts, styles, map and references at /Porcelain_Workshop/');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
