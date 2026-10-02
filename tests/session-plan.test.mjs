import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSessionPlan,phaseAt,stageAt,takeDueCue} from '../src/session-plan.js';
import {VOICE_CUES} from '../src/voice-cues.js';
test('four timed phases and no speech after twelve minutes',()=>{
  assert.deepEqual([0,179,180,419,420,719,720,1200].map(phaseAt),['breathing','breathing','story','story','drifting','drifting','ambience','ambience']);
  assert.deepEqual([0,90,180,420].map(stageAt),[0,1,2,3]);
  for(const lang of ['ru','en']) for(let chapter=0;chapter<4;chapter++) {
    const plan=buildSessionPlan(lang,chapter);
    const story=plan.filter(c=>phaseAt(c.at)==='story');
    for(let i=1;i<story.length;i++) assert.ok(Math.abs(story[i].at-story[i-1].at-story[i-1].duration-12)<.001);
    const drift=plan.filter(c=>phaseAt(c.at)==='drifting');
    assert.deepEqual(drift.map(c=>c.at),[420,480,540,600,660]);
    assert.ok(drift.every(c=>c.duration<=6&&c.soft));
    assert.ok(plan.every(c=>c.at+c.duration<720));
    for(let i=1;i<plan.length;i++) assert.ok(plan[i-1].at+plan[i-1].duration<=plan[i].at,'clips must not overlap');
    assert.equal(takeDueCue(plan,0,720).cue,null);
    assert.equal(takeDueCue(plan,0,500).cue,null);
    assert.equal(takeDueCue(plan,0,480).cue.at,480);
  }
});
test('sentence slices stay inside their recording',()=>{
  for(const chapters of Object.values(VOICE_CUES)) for(const parts of chapters) for(const part of parts)
    for(const s of part.sentences) assert.ok(s.offset>=0&&s.duration>0&&s.offset+s.duration<=part.duration+.001);
});
