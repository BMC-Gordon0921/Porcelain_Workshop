import test from 'node:test';
import assert from 'node:assert/strict';
import {TOUR_STEPS,cornerPosition,cardPosition} from '../src/spotlight.js';

test('侧栏与大景步骤用左下角落点，避开参考图与场景中央',()=>{
 const cornered=TOUR_STEPS.filter(s=>s.place==='corner').map(s=>s.id);
 assert.deepEqual(cornered,['orders','stations']);
 const desk=cornerPosition({width:1280,height:800},{width:340,height:190});
 assert.equal(desk.left,22);
 assert.equal(desk.top,536);          // 800 - 190 - 74
 const phone=cornerPosition({width:393,height:852},{width:340,height:150});
 assert.equal(phone.left,12);
 assert.equal(phone.top,514);         // 852 - 150 - 188，让开摇杆
});

test('角落卡片在窄视口里也不越界',()=>{
 const pos=cornerPosition({width:200,height:120},{width:340,height:150});
 assert.ok(pos.left>=12);
 assert.ok(pos.top>=12);
});

test('贴目标的卡片默认落在目标下方',()=>{
 const pos=cardPosition({left:900,top:40,bottom:84,width:44,height:44},{width:1280,height:800},{width:340,height:190});
 assert.equal(pos.top,40+44+14);
});
