import { VOICE_CUES } from './voice-cues.js';

export const PRELUDE_SECONDS = 120;
export const SESSION_SECONDS = 22 * 60;
export const DRIFT_START = 540, GUIDED_END = 840;
export function breathAt(seconds) {
  const cycle = Math.max(0, seconds) % 12;
  const phase = Math.floor(cycle / 4);
  const progress = cycle % 4 / 4;
  return {phase, remaining: Math.ceil(4-cycle%4), scale: phase === 0 ? .85 + .27*progress : phase === 1 ? 1.12 : 1.12-.27*progress};
}
export function phaseAt(seconds) {
  if (seconds < 120) return 'prelude';
  seconds -= PRELUDE_SECONDS;
  if (seconds < 180) return 'breathing';
  if (seconds < 420) return 'story';
  if (seconds < 720) return 'drifting';
  return 'ambience';
}
export function stageAt(seconds) {
  if(seconds < PRELUDE_SECONDS) return -1;
  seconds -= PRELUDE_SECONDS;
  return seconds < 90 ? 0 : seconds < 180 ? 1 : seconds < 420 ? 2 : 3;
}
export function buildSessionPlan(lang, chapter) {
  const parts = VOICE_CUES[lang][chapter], common = VOICE_CUES[lang][0];
  const full = (part,at) => ({url:part.url,offset:part.offset ?? 0,duration:part.duration,text:part.sentences.map(s=>s.text).join(' '),at,gain:.9,soft:false});
  const phrase = (part,index,at,gain=.9,soft=false) => ({url:part.url,...part.sentences[index],at,gain,soft});
  const cues=[full(parts[0],0),full(parts[1],90)];
  const breath=common[0].sentences.length-2;
  for (const at of [50,145]) {
    cues.push(phrase(common[0],breath,at));
    cues.push(phrase(common[0],breath+1,at+15));
  }
  let at=180;
  for (const part of parts.slice(2)) for (const sentence of part.sentences) {
    cues.push({url:part.url,...sentence,at,gain:.82,soft:false});
    at+=sentence.duration+12;
  }
  if (at-12>420) throw new Error('Story exceeds its four-minute phase');
  const bedtime=common[3];
  const short=bedtime.sentences.map((s,index)=>({s,index})).filter(x=>x.s.duration<=6).slice(-5);
  if(short.length!==5) throw new Error('Five short bedtime phrases required');
  short.forEach(({index},i)=>cues.push(phrase(bedtime,index,420+i*60,.5-i*.08,true)));
  return cues.map(c=>({...c,at:c.at+PRELUDE_SECONDS})).sort((a,b)=>a.at-b.at);
}

// A delayed background tick skips expired cues; it never plays a queue of missed speech.
export function takeDueCue(plan, next, elapsed) {
  let cue=null;
  while(next<plan.length && plan[next].at<=elapsed) {
    const candidate=plan[next++];
    if(elapsed-candidate.at<3 && phaseAt(elapsed)!=='ambience') cue=candidate;
  }
  return {cue,next};
}
