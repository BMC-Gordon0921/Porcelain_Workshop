import test from 'node:test';
import assert from 'node:assert/strict';
import {beatAt,INTRO_LINES,INTRO_DURATION} from '../src/places.js';

test('旁白节拍按时间切片，末句吃满最后一个区间',()=>{
 assert.equal(beatAt(0),0);
 assert.equal(beatAt(INTRO_DURATION/3+1),1);
 assert.equal(beatAt(INTRO_DURATION*0.99),INTRO_LINES.length-1);
 assert.equal(beatAt(INTRO_DURATION),INTRO_LINES.length-1);
});
