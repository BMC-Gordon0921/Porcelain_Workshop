import test from 'node:test';
import assert from 'node:assert/strict';
import {rotateInsets,latestWindowResponse,gestureExtent} from '../src/platform/safe-area.js';
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
  assert.deepEqual(gesture.move(2,150,0),{scale:1.5,panX:25,panY:0});
  assert.deepEqual(gesture.move(2,75,0),{scale:.5,panX:-37.5,panY:0});
  gesture.remove(2);
  assert.deepEqual(gesture.move(1,2,3),{dx:2,dy:3});
  gesture.clear();
  assert.equal(gesture.move(1,20,30),null);
});

import {panLimit,edgeCorrection} from '../src/platform/camera-framing.js';
import {mobileGuidance} from '../src/platform/mobile-guidance.js';
import {loupeSample} from '../src/sculpture-view.js';

test('the return gesture space is independent of the safe insets',()=>{
  const safe={top:77,right:12,bottom:24,left:9};
  assert.equal(gestureExtent({width:48,right:48}),48);
  assert.equal(gestureExtent({width:0,right:48}),0);
  assert.deepEqual(rotateInsets(rotateInsets(rotateInsets(rotateInsets(safe)))),safe);
});
test('right-button input pans without rotating',()=>{
  const gesture=createOrbitGesture();
  gesture.add(1,10,12,false,true);
  assert.deepEqual(gesture.move(1,15,18),{panX:5,panY:6});
  gesture.remove(1);
  assert.equal(gesture.move(1,30,30),null);
});
test('camera stays within bounds and only follows near the viewport edges',()=>{
  assert.equal(panLimit(0,-10,10,20,1),0);
  assert.equal(panLimit(0,-10,10,20,2),10);
  assert.equal(edgeCorrection(50,100),0);
  assert.equal(edgeCorrection(8,100),-10);
  assert.equal(edgeCorrection(88,100),6);
});
test('mobile displays one hint with blocked, action and next priority',()=>{
  assert.match(mobileGuidance({blocked:'先领取瓷泥',action:'烧制',next:'取泥台'}),/先领取瓷泥/);
  assert.equal(mobileGuidance({action:'烧制',next:'取泥台'}),'烧制');
  assert.equal(mobileGuidance({next:'取泥台'}),'下一步 · 取泥台');
});
test('the loupe centers on the actual stroke even at canvas edges',()=>{
  for(const [x,y] of [[0,0],[82,51],[300,240]]){
    const sample=loupeSample(x,y,300,240);
    assert.equal(sample.left+sample.size/2,x);
    assert.equal(sample.top+sample.size/2,y);
  }
});

import {containedCanvasPoint} from '../src/platform/canvas-metrics.js';
import {createPanelTapCooldown} from '../src/platform/tap-cooldown.js';

test('touches map to the painted canvas, with no stroke starting in the letterbox',()=>{
 assert.deepEqual(containedCanvasPoint({x:10,y:90,w:300,h:180},112,112),{x:-31.11111111111111,y:56,inside:false});
 assert.deepEqual(containedCanvasPoint({x:60,y:0,w:300,h:180},112,112),{x:0,y:0,inside:true});
 assert.deepEqual(containedCanvasPoint({x:90,y:60,w:180,h:300},112,112),{x:56,y:0,inside:true});
});
test('panel cooldown covers taps on newly exposed controls',()=>{
 const gate=createPanelTapCooldown();
 assert.equal(gate.blocked(1000),false);
 gate.mark(1000);
 assert.equal(gate.blocked(1299),true);
 assert.equal(gate.blocked(1300),false);
});

import {openInitialOrder,firstWorkshopHint} from '../src/tutorial.js';
test('first visit guides movement and clay without opening the order',()=>{
 assert.equal(openInitialOrder('move'),false);
 assert.equal(openInitialOrder('clay'),false);
 assert.equal(firstWorkshopHint('move','clay',true).action,'move');
 assert.equal(firstWorkshopHint('clay','clay',true).action,'collect');
 assert.match(firstWorkshopHint('clay','clay',false).text,/F/);
 assert.equal(openInitialOrder('wheel'),true);
 assert.equal(firstWorkshopHint('wheel',null,true),null);
 assert.equal(openInitialOrder(null),true);
});
