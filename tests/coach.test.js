// 教练卡：内容必须覆盖真实教学七步，且每一步都能落到具体面板与控件（不依赖浏览器）。
import test from 'node:test';
import assert from 'node:assert/strict';
import {COACH_STEPS, COACH_PANEL, COACH_FOCUS, COACH_PLACE, COACH_GOAL, COACH_GOAL_TOUCH, coachStep, coachEnabled, panelStep} from '../src/coach.js';
import {TUTORIAL_STEPS} from '../src/tutorial.js';

test('教练卡步骤与教学状态机一一对应', () => {
  assert.deepEqual(COACH_STEPS.map((s) => s.id), TUTORIAL_STEPS.map((s) => s.id));
  assert.deepEqual(COACH_STEPS.map((s) => s.id), ['move', 'clay', 'wheel', 'carve', 'paint', 'kiln', 'serve']);
  COACH_STEPS.forEach((s, i) => {
    assert.equal(s.index, i);
    assert.equal(s.total, COACH_STEPS.length);
    assert.ok(s.title && s.copy, s.id + ' 需要标题与正文');
    assert.ok(s.place, s.id + ' 需要工位名');
    assert.ok(s.goal, s.id + ' 需要一个当下动作');
  });
  assert.equal(coachStep('nope'), null);
});

test('每一步都有面板落点与高亮目标', () => {
  for (const id of ['clay', 'wheel', 'carve', 'paint', 'kiln', 'serve']) {
    assert.ok(COACH_PANEL[id], id + ' 缺面板');
    assert.ok(COACH_FOCUS[id], id + ' 缺高亮控件');
  }
  assert.equal(COACH_PANEL.move, undefined, '走动不该绑面板');
  assert.equal(COACH_PANEL.wheel, 'editor');
  assert.equal(COACH_PANEL.kiln, 'kiln');
  assert.equal(COACH_PANEL.serve, 'review');
  assert.equal(COACH_FOCUS.paint, '.paint-colors');
  assert.equal(COACH_PLACE.serve, '交付台');
  assert.match(COACH_GOAL.move, /取泥台/);
  for (const s of COACH_STEPS) assert.ok(COACH_GOAL_TOUCH[s.id], s.id + ' 需要触屏版动作');
});

test('面板里停在正在做的那一步，不被状态机抢先', () => {
  assert.equal(panelStep('editor', 'paint', {id: 'kiln'}).id, 'paint');
  assert.equal(panelStep('editor', 'carve', {id: 'paint'}).id, 'carve');
  assert.equal(panelStep('kiln', undefined, {id: 'kiln'}).id, 'kiln');
  assert.equal(panelStep(null, undefined, {id: 'move'}).id, 'move');
  assert.equal(panelStep('editor', 'paint', null), null);
});

test('教练卡开关是布尔值且默认开启', () => {
  assert.equal(typeof coachEnabled(), 'boolean');
  assert.equal(coachEnabled(), true);
});
