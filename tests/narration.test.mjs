import test from "node:test";
import assert from "node:assert/strict";
import { Narrator, hasNarration, RECORDINGS } from "../src/narration.js";
test("all bilingual chapters have four existing narration files", async () => {
  const { stat } = await import("node:fs/promises");
  for (const lang of ["ru", "en"])
    for (let ch = 0; ch < 4; ch++) {
      assert.equal(hasNarration(lang, ch), true);
      for (const path of RECORDINGS[lang][ch])
        assert.ok(
          (await stat(new URL("../src/" + path, import.meta.url))).size > 10000,
        );
    }
  assert.equal(hasNarration("ru", 4), false);
});
test("narration resumes from the paused offset instead of restarting", () => {
  const n = new Narrator();
  const starts = [];
  const gains = [];
  n.ctx = {
    currentTime: 0,
    createBufferSource: () => ({
      connect() {},
      start: (_, offset) => starts.push(offset),
      stop() {
        this.onended?.();
      },
    }),
    createGain: () => {
      const node = { gain: { value: 0 }, connect() {}, disconnect() {} };
      gains.push(node);
      return node;
    },
  };
  n.buffer = { duration: 30 };
  n.resume();
  assert.equal(gains[0].gain.value, 0.9);
  n.ctx.currentTime = 9;
  n.pause();
  assert.equal(n.offset, 9);
  n.ctx.currentTime = 50;
  n.resume();
  assert.deepEqual(starts, [0, 9]);
  n.source.onended();
  assert.equal(n.busy, false);
});

test("stopping during a download prevents late narration from starting", async (t) => {
  let deliver;
  t.mock.method(
    globalThis,
    "fetch",
    () =>
      new Promise((resolve) => {
        deliver = resolve;
      }),
  );
  const narrator = new Narrator();
  let starts = 0;
  const context = {
    decodeAudioData: async () => ({ duration: 20 }),
    createBufferSource: () => {
      starts++;
      throw new Error("must not start");
    },
  };
  const pending = narrator.play(context, "../assets/narration/ru-1-1.mp3");
  assert.equal(narrator.busy, true);
  narrator.stop();
  deliver({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
  await pending;
  assert.equal(starts, 0);
  assert.equal(narrator.busy, false);
});

test("a missing recording releases the scene instead of hanging the session", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: false }));
  const narrator = new Narrator();
  await assert.rejects(
    narrator.play({}, "../assets/narration/missing.mp3"),
    /unavailable/,
  );
  assert.equal(narrator.busy, false);
});

test("a quiet sentence plays only its slice and resumes within that slice", async () => {
  const n = new Narrator(), starts=[], gains=[], filters=[];
  n.cache.set('slice', {duration:30});
  const ctx={currentTime:0,destination:{},
    createBufferSource:()=>({connect(){},start:(...args)=>starts.push(args),stop(){this.onended?.();}}),
    createGain:()=>{const g={gain:{value:0},connect(){},disconnect(){}};gains.push(g);return g;},
    createBiquadFilter:()=>{const f={frequency:{value:0},Q:{value:0},connect(){},disconnect(){}};filters.push(f);return f;}
  };
  await n.play(ctx,'slice',ctx.destination,{offset:10,duration:4,gain:.26,soft:true});
  assert.deepEqual(starts[0],[0,10,4]);
  assert.equal(gains[0].gain.value,.26);
  assert.equal(filters[0].frequency.value,4200);
  ctx.currentTime=1;n.pause();ctx.currentTime=20;n.resume();
  assert.deepEqual(starts[1],[0,11,3]);
});
test("a slow download cannot start an expired phrase", async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}));
  const n=new Narrator();
  const ctx={currentTime:10,decodeAudioData:async()=>({duration:20}),createBufferSource(){throw Error('expired cue started');}};
  await n.play(ctx,'late',undefined,{expiresAt:3});
  assert.equal(n.busy,false);
});
