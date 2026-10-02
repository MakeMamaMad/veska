import { VOICE_CUES } from './voice-cues.js';

// Two session lengths share the same story recordings; only the quiet parts change.
// prelude: guided breathing without voice; intro: first two voiced parts with fog / lantern;
// story: sentence-by-sentence story; drift: soft bedtime phrases; then ambience until `total`.
export const TIMELINES = {
  full: {prelude: 120, intro: 180, story: 240, drift: 300, total: 22 * 60},
  short: {prelude: 0, intro: 180, story: 240, drift: 60, total: 10 * 60},
};
export const timeline = (mode = 'full') => TIMELINES[mode] || TIMELINES.full;
export const PRELUDE_SECONDS = TIMELINES.full.prelude;
export const SESSION_SECONDS = TIMELINES.full.total;
export const driftStart = (tl = TIMELINES.full) => tl.prelude + tl.intro + tl.story;
export const guidedEnd = (tl = TIMELINES.full) => driftStart(tl) + tl.drift;
export const DRIFT_START = driftStart(), GUIDED_END = guidedEnd();
// The evening counts once the story itself has been heard (or played through in text mode).
export const earnAt = driftStart;

export function breathAt(seconds) {
  const cycle = Math.max(0, seconds) % 12;
  const phase = Math.floor(cycle / 4);
  const progress = cycle % 4 / 4;
  return {phase, remaining: Math.ceil(4-cycle%4), scale: phase === 0 ? .85 + .27*progress : phase === 1 ? 1.12 : 1.12-.27*progress};
}
export function phaseAt(seconds, tl) {
  if (!tl || typeof tl !== "object") tl = TIMELINES.full;
  if (seconds < tl.prelude) return 'prelude';
  seconds -= tl.prelude;
  if (seconds < tl.intro) return 'breathing';
  if (seconds < tl.intro + tl.story) return 'story';
  if (seconds < tl.intro + tl.story + tl.drift) return 'drifting';
  return 'ambience';
}
export function stageAt(seconds, tl) {
  if (!tl || typeof tl !== "object") tl = TIMELINES.full;
  if(seconds < tl.prelude) return -1;
  seconds -= tl.prelude;
  return seconds < tl.intro / 2 ? 0 : seconds < tl.intro ? 1 : seconds < tl.intro + tl.story ? 2 : 3;
}
export function buildSessionPlan(lang, chapter, tl = TIMELINES.full) {
  const parts = VOICE_CUES[lang][chapter], common = VOICE_CUES[lang][0];
  const full = (part,at) => ({url:part.url,offset:part.offset ?? 0,duration:part.duration,text:part.sentences.map(s=>s.text).join(' '),at,gain:.9,soft:false});
  const phrase = (part,index,at,gain=.9,soft=false) => ({url:part.url,...part.sentences[index],at,gain,soft});
  const cues=[full(parts[0],0),full(parts[1],tl.intro/2)];
  const breath=common[0].sentences.length-2;
  for (const at of [50,145]) {
    cues.push(phrase(common[0],breath,at));
    cues.push(phrase(common[0],breath+1,at+15));
  }
  let at=tl.intro;
  for (const part of parts.slice(2)) for (const sentence of part.sentences) {
    cues.push({url:part.url,...sentence,at,gain:.82,soft:false});
    at+=sentence.duration+12;
  }
  if (at-12>tl.intro+tl.story) throw new Error('Story exceeds its four-minute phase');
  const bedtime=common[3];
  const short=bedtime.sentences.map((s,index)=>({s,index})).filter(x=>x.s.duration<=6).slice(-5);
  if(short.length!==5) throw new Error('Five short bedtime phrases required');
  const count=Math.min(5, Math.floor(tl.drift/60));
  short.slice(0,count).forEach(({index},i)=>cues.push(phrase(bedtime,index,tl.intro+tl.story+i*60,.5-i*.08,true)));
  return cues.map(c=>({...c,at:c.at+tl.prelude})).sort((a,b)=>a.at-b.at);
}

// A delayed background tick skips expired cues; it never plays a queue of missed speech.
export function takeDueCue(plan, next, elapsed, tl = TIMELINES.full) {
  let cue=null;
  while(next<plan.length && plan[next].at<=elapsed) {
    const candidate=plan[next++];
    if(elapsed-candidate.at<3 && phaseAt(elapsed, tl)!=='ambience') cue=candidate;
  }
  return {cue,next};
}
