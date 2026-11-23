import test from 'node:test';
import assert from 'node:assert/strict';
import {readSettings} from '../src/settings.js';

test('missing or damaged settings retain the original volume and distinct orientation defaults', () => {
  for (const value of [null, '{', '{}']) {
    assert.deepEqual(readSettings(value), {
      effects: 100, music: 100,
      portrait: {x: 100, y: 0}, landscape: {x: 0, y: 0},
    });
  }
});

test('volume channels and joystick positions survive storage independently', () => {
  const settings = {effects: 0, music: 65, portrait: {x: 82, y: 35}, landscape: {x: 10, y: 72}};
  assert.deepEqual(readSettings(JSON.stringify(settings)), settings);
  assert.deepEqual(readSettings('{"effects":-10,"music":"bad","landscape":{"x":120,"y":18.5}}'), {
    effects: 0, music: 100,
    portrait: {x: 100, y: 0}, landscape: {x: 100, y: 19},
  });
});
