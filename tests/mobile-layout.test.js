import test from 'node:test';
import assert from 'node:assert/strict';
import {rotateInsets,latestWindowResponse} from '../src/platform/safe-area.js';
import {createOrbitGesture} from '../src/platform/orbit-gesture.js';

test('clockwise rotation maps each physical safe edge into layout space',()=>{
  assert.deepEqual(rotateInsets({top:77,right:12,bottom:24,left:9}),{top:12,right:24,bottom:9,left:77});
});

test('earlier window info cannot replace a newer measurement',()=>{
  assert.equal(latestWindowResponse(1,2),false);
  assert.equal(latestWindowResponse(2,2),true);
});

test('pinch scales both ways and leaves the remaining finger ready to rotate',()=>{
  const gesture=createOrbitGesture();
  gesture.add(1,0,0,true);
  gesture.add(2,100,0,true);
  assert.equal(gesture.add(3,200,0,true),false);
  assert.deepEqual(gesture.move(2,150,0),{scale:1.5});
  assert.deepEqual(gesture.move(2,75,0),{scale:.5});
  gesture.remove(2);
  assert.deepEqual(gesture.move(1,2,3),{dx:2,dy:3});
  gesture.clear();
  assert.equal(gesture.move(1,20,30),null);
});
