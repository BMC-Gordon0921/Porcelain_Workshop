import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {resolveGameAsset} from '../desktop/asset-path.cjs';

const root=path.resolve('virtual-desktop/web');
test('desktop assets resolve under a stable offline origin, including encoded names',()=>{
 assert.equal(resolveGameAsset(root,'terra://app/'),path.join(root,'index.html'));
 assert.equal(resolveGameAsset(root,'terra://app/models/maps/guyao.glb'),path.join(root,'models/maps/guyao.glb'));
 assert.equal(resolveGameAsset(root,'terra://app/assets/pottery%20backround%20music.wav'),path.join(root,'assets/pottery backround music.wav'));
 assert.equal(resolveGameAsset(root,'terra://app/assets/%E5%BC%80%E7%AA%91.png?cache=1'),path.join(root,'assets/开窑.png'));
});
test('desktop protocol rejects external origins and encoded filesystem escapes',()=>{
 for(const url of ['https://app/index.html','file:///C:/Windows/win.ini','terra://other/index.html','terra://user@app/index.html','terra://app/%00','terra://app/%2e%2e%2fpackage.json','terra://app/%E0%A4%A'])assert.equal(resolveGameAsset(root,url),null,url);
 if(process.platform==='win32')assert.equal(resolveGameAsset(root,'terra://app/%2e%2e%5cpackage.json'),null);
});
