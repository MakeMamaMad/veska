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
