import test from 'node:test';
import assert from 'node:assert/strict';
import { breathFor, breathPattern, bedtimeLevels, BREATH_PATTERNS } from '../src/tuning.js';
import { breathAt } from '../src/session-plan.js';

test('even breathing matches the original 4-4-4 practice', () => {
  for (const s of [0, 1, 4, 5.5, 8, 11.9, 12, 116]) {
    const a = breathFor(s), b = breathAt(s);
    assert.equal(a.phase, b.phase); assert.equal(a.remaining, b.remaining); assert.ok(Math.abs(a.scale - b.scale) < 1e-9);
  }
});
test('stress breathes out longer than in', () => {
  const p = breathPattern('stress');
  assert.deepEqual([0, 4, 6, 11.5, 12].map((s) => breathFor(s, p).name), ['inhale', 'hold', 'exhale', 'exhale', 'inhale']);
  assert.equal(breathFor(6, p).remaining, 6);
  assert.ok(120 % 12 === 0, 'ten whole cycles in the two-minute practice');
});
test('thoughts use box breathing with a rest after the exhale', () => {
  const p = breathPattern('thoughts');
  assert.deepEqual([0, 4, 8, 12, 16].map((s) => breathFor(s, p).name), ['inhale', 'hold', 'exhale', 'rest', 'inhale']);
  assert.equal(breathFor(13, p).scale, .85);
  assert.equal(breathPattern('noise'), BREATH_PATTERNS.even);
});
test('city noise gets a fuller two-layer background', () => {
  assert.deepEqual(bedtimeLevels('stress', 1), [0, .25, 0, 0, 0, 0]);
  assert.deepEqual(bedtimeLevels('noise', 0), [.32, 0, .2, 0, 0, 0]);
  assert.deepEqual(bedtimeLevels('noise', 2), [.2, 0, .32, 0, 0, 0]);
});
