// The onboarding answer «What keeps you awake?» sets two quiet defaults for the evening.
// Nothing here is medical: these are gentle starting points the listener can change.
//
// stress   → breathing with a longer exhale (4-2-6), which tends to slow people down.
// thoughts → box breathing (4-4-4-4) with a visible count to keep attention busy.
// noise    → a fuller two-layer background to mask city sounds.

export const OBSTACLES = ['stress', 'noise', 'thoughts'];

// Each pattern is a list of [phase, seconds]; phases: inhale, hold, exhale, rest.
export const BREATH_PATTERNS = {
  even: [['inhale', 4], ['hold', 4], ['exhale', 4]],
  stress: [['inhale', 4], ['hold', 2], ['exhale', 6]],
  thoughts: [['inhale', 4], ['hold', 4], ['exhale', 4], ['rest', 4]],
};
export const breathPattern = (obstacle) => BREATH_PATTERNS[obstacle] || BREATH_PATTERNS.even;

const SMALL = .85, BIG = 1.12;
export function breathFor(seconds, pattern = BREATH_PATTERNS.even) {
  const cycle = pattern.reduce((sum, [, s]) => sum + s, 0);
  let t = Math.max(0, seconds) % cycle, i = 0;
  while (t >= pattern[i][1]) t -= pattern[i++][1];
  const [name, length] = pattern[i], progress = t / length;
  const scale = name === 'inhale' ? SMALL + (BIG - SMALL) * progress
    : name === 'hold' ? BIG
    : name === 'exhale' ? BIG - (BIG - SMALL) * progress
    : SMALL;
  return { name, phase: i, remaining: Math.ceil(length - t), scale };
}

// Default background for an evening (indices: rain, fire, forest, wind+owls, mill wind, mill creak).
export function bedtimeLevels(obstacle, preferred) {
  const levels = [0, 0, 0, 0, 0, 0];
  if (obstacle !== 'noise') {
    levels[preferred] = .25;
    return levels;
  }
  const second = preferred === 2 ? 0 : 2;
  levels[preferred] = .32;
  levels[second] = .2;
  return levels;
}
