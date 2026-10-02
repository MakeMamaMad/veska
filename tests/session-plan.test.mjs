import test from 'node:test';
import assert from 'node:assert/strict';
import {breathAt,buildSessionPlan,phaseAt,stageAt,takeDueCue,TIMELINES,earnAt} from '../src/session-plan.js';
import {VOICE_CUES} from '../src/voice-cues.js';
test('two-minute prelude then four phases, with no speech after fourteen minutes',()=>{
  assert.deepEqual([0,120,299,300,539,540,839,840,1320].map(phaseAt),['prelude','breathing','breathing','story','story','drifting','drifting','ambience','ambience']);
  assert.deepEqual([0,120,210,300,540].map(stageAt),[-1,0,1,2,3]);
  for(const lang of ['ru','en']) for(let chapter=0;chapter<4;chapter++) {
    const plan=buildSessionPlan(lang,chapter);
    const story=plan.filter(c=>phaseAt(c.at)==='story');
    for(let i=1;i<story.length;i++) assert.ok(Math.abs(story[i].at-story[i-1].at-story[i-1].duration-12)<.001);
    const drift=plan.filter(c=>phaseAt(c.at)==='drifting');
    assert.deepEqual(drift.map(c=>c.at),[540,600,660,720,780]);
    assert.ok(drift.every(c=>c.duration<=6&&c.soft));
    assert.ok(plan.every(c=>c.at>=120&&c.at+c.duration<840));
    for(let i=1;i<plan.length;i++) assert.ok(plan[i-1].at+plan[i-1].duration<=plan[i].at,'clips must not overlap');
    assert.equal(takeDueCue(plan,0,840).cue,null);
    assert.equal(takeDueCue(plan,0,620).cue,null);
    assert.equal(takeDueCue(plan,0,600).cue.at,600);
  }
});
test('sentence slices stay inside their recording',()=>{
  for(const chapters of Object.values(VOICE_CUES)) for(const parts of chapters) for(const part of parts)
    for(const s of part.sentences) assert.ok(s.offset>=(part.offset ?? 0)-.001&&s.duration>0&&s.offset+s.duration<=(part.offset ?? 0)+part.duration+.001);
});

test('breathing completes ten 4-4-4 cycles without narration',()=>{
 assert.deepEqual([0,4,8,12,116].map(s=>breathAt(s).phase),[0,1,2,0,2]);
 assert.equal(breathAt(4).scale,1.12);assert.equal(breathAt(0).scale,.85);
 for(const lang of ['ru','en'])assert.equal(takeDueCue(buildSessionPlan(lang,0),0,119).cue,null);
});

test('short evening: story at once, one bedtime phrase, ten minutes in all',()=>{
 const tl=TIMELINES.short;
 assert.deepEqual([0,89,90,180,419,420,479,480].map(x=>phaseAt(x,tl)),['breathing','breathing','breathing','story','story','drifting','drifting','ambience']);
 assert.equal(stageAt(0,tl),0);
 assert.equal(earnAt(tl),420);
 assert.equal(earnAt(),540);
 for(const lang of ['ru','en']) for(let chapter=0;chapter<4;chapter++){
  const plan=buildSessionPlan(lang,chapter,tl);
  assert.equal(plan[0].at,0);
  assert.equal(takeDueCue(plan,0,0,tl).cue.at,0);
  assert.deepEqual(plan.filter(c=>c.soft).map(c=>c.at),[420]);
  assert.ok(plan.every(c=>c.at+c.duration<480));
 }
});
