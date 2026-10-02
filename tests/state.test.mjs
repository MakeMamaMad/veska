import test from "node:test";
import assert from "node:assert/strict";
import {
  fresh,
  load,
  normalize,
  complete,
  streak,
  remaining,
  clock,
} from "../src/state.js";
test("first launch has a cottage and onboarding", () => {
  assert.equal(fresh().level, 1);
  assert.equal(fresh().onboarded, false);
});
test("corrupt or blocked storage safely starts fresh", () => {
  assert.deepEqual(load({ getItem: () => "{broken" }), fresh());
  assert.deepEqual(
    load({
      getItem() {
        throw new Error("blocked");
      },
    }),
    fresh(),
  );
});
test("normalization constrains saved data", () => {
  const s = normalize({
    level: 999,
    lang: "bad",
    seconds: -10,
    mix: [3, -2, NaN, 0.6],
    dates: ["bad", "2026-10-01", "2026-10-01"],
  });
  assert.equal(s.level, 5);
  assert.equal(s.lang, "ru");
  assert.equal(s.seconds, 0);
  assert.deepEqual(s.mix, [1, 0, 0.4, 0.6, .25, .15]);
  assert.deepEqual(s.dates, ["2026-10-01"]);
});
test("each completed session unlocks exactly one object and caps at four", () => {
  let s = fresh();
  for (let i = 0; i < 8; i++) {
    s = complete(s, new Date(2026, 9, 2+i));
    assert.equal(s.level, Math.min(i + 2, 5));
  }
  assert.equal(s.dates.length, 8);
});
test("local-day streak handles yesterday, gaps and month boundaries", () => {
  const now = new Date(2026, 9, 2, 0, 1);
  assert.equal(streak(["2026-09-30", "2026-10-01", "2026-10-02"], now), 3);
  assert.equal(streak(["2026-09-30", "2026-10-01"], now), 2);
  assert.equal(streak(["2026-09-30"], now), 0);
  assert.equal(streak(["2026-09-29", "2026-10-01", "2026-10-02"], now), 2);
});
test("sleep uses a wall-clock deadline after background suspension", () => {
  const start = 100000;
  assert.equal(remaining(start + 900000, start + 45000), 855);
  assert.equal(remaining(start + 900000, start + 1000000), 0);
  assert.equal(remaining(null), Infinity);
  assert.equal(clock(1455), "24:15");
  assert.equal(clock(0), "00:00");
  assert.equal(clock(Infinity), "∞");
});
test("serialized state restores preferences and progress", () => {
  const saved = {
    ...complete(fresh()),
    onboarded: true,
    lang: "en",
    mix: [0.7, 0.3, 0, 0, .25, .15],
    seconds: 180,
    voice: false,
  };
  assert.deepEqual(load({ getItem: () => JSON.stringify(saved) }), saved);
});

test('story completion reveals mill immediately, with no calendar gate or duplicate reward',()=>{
 const now=new Date(2026,9,2);
 const first=complete(fresh(),now,0);
 assert.equal(first.currentDay,2);assert.deepEqual(first.unlocked,[0,1]);
 assert.equal(complete(first,now,0).currentDay,2);
 const second=complete(first,now,1);
 assert.equal(second.currentDay,3);assert.deepEqual(second.unlocked,[0,1,3]);
});
test('migration preserves old buildings and adds the current location',()=>{
 assert.deepEqual(normalize({level:4}).unlocked,[0,1,2,3]);
 assert.equal(normalize({level:4}).currentDay,4);
 assert.deepEqual(normalize({currentDay:2,unlocked:[0,3]}).unlocked,[0,3,1]);
 assert.equal(load({getItem:key=>key==='currentDay'?'2':null}).currentDay,2);
 assert.deepEqual(fresh().unlocked,[0]);
});
