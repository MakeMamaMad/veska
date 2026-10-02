import test from "node:test";
import assert from "node:assert/strict";
import {
  fresh,
  load,
  normalize,
  complete,
  earn,
  reveal,
  revealDue,
  logSleep,
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
  assert.equal(s.level, 10);
  assert.equal(s.lang, "ru");
  assert.equal(s.seconds, 0);
  assert.deepEqual(s.mix, [1, 0, 0.4, 0.6, .25, .15]);
  assert.deepEqual(s.dates, ["2026-10-01"]);
});
test("each completed session unlocks exactly one place and caps after the autumn season", () => {
  let s = fresh();
  for (let i = 0; i < 12; i++) {
    s = complete(s, new Date(2026, 9, 2+i));
    assert.equal(s.level, Math.min(i + 2, 10));
    assert.equal(s.unlocked.length, Math.min(i + 2, 9));
  }
  assert.equal(s.dates.length, 12);
});
test("players who finished the first four stories continue into autumn", () => {
  const old = normalize({ currentDay: 5, unlocked: [0, 1, 2, 3] });
  assert.equal(old.currentDay, 5);
  assert.deepEqual(old.unlocked, [0, 1, 2, 3, 4]);
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
 assert.equal(second.currentDay,3);assert.deepEqual(second.unlocked,[0,1,2]);
});
test('migration preserves old buildings and adds the current location',()=>{
 assert.deepEqual(normalize({level:4}).unlocked,[0,1,2,3]);
 assert.equal(normalize({level:4}).currentDay,4);
 assert.deepEqual(normalize({currentDay:2,unlocked:[0,3]}).unlocked,[0,3,1]);
 assert.equal(load({getItem:key=>key==='currentDay'?'2':null}).currentDay,2);
 assert.deepEqual(fresh().unlocked,[0]);
});

test('an evening counts tonight and its building appears in the morning',()=>{
 const evening=new Date(2026,9,2,22,40);
 const earned=earn(fresh(),evening,0);
 assert.deepEqual(earned.unlocked,[0]);
 assert.equal(earned.currentDay,1);
 assert.deepEqual(earned.dates,['2026-10-02']);
 assert.equal(earned.pending.chapter,0);
 assert.equal(revealDue(earned,new Date(2026,9,2,23,30)),false,'not the same night');
 assert.equal(revealDue(earned,new Date(2026,9,3,4,0)),false,'not in the middle of the night');
 assert.equal(revealDue(earned,new Date(2026,9,3,7,0)),true,'next morning');
 const morning=reveal(earned);
 assert.equal(morning.pending,null);
 assert.equal(morning.currentDay,2);
 assert.deepEqual(morning.unlocked,[0,1]);
 assert.equal(morning.lastBuildDate,'2026-10-02');
 assert.deepEqual(morning.dates,['2026-10-02'],'the morning visit is not another evening');
});
test('night owls: an evening after midnight reveals four hours later',()=>{
 const late=earn(fresh(),new Date(2026,9,3,1,30),0);
 assert.equal(revealDue(late,new Date(2026,9,3,5,0)),false);
 assert.equal(revealDue(late,new Date(2026,9,3,5,31)),true);
});
test('a second evening before the morning does not build twice',()=>{
 const night=new Date(2026,9,2,22);
 const twice=earn(earn(fresh(),night,0),new Date(2026,9,2,23),0);
 assert.equal(twice.pending.at,night.getTime());
 assert.equal(reveal(reveal(twice)).currentDay,2);
});
test('pending evening, sleep log and length survive storage',()=>{
 let s=earn({...fresh(),length:'short'},new Date(2026,9,2,22),0);
 s=logSleep(s,3,new Date(2026,9,3,8));
 s=logSleep(s,2,new Date(2026,9,3,9));
 assert.deepEqual(s.sleepLog,[{date:'2026-10-03',mood:2}]);
 assert.deepEqual(load({getItem:()=>JSON.stringify(s)}),s);
 assert.equal(normalize({pending:{chapter:9,at:1}}).pending,null);
 assert.equal(normalize({length:'weird'}).length,'full');
});
test('evening counter only grows and reads naturally in both languages', async () => {
  const { plural } = await import('../src/state.js');
  const ru = ['вечер', 'вечера', 'вечеров'], en = ['evening', 'evenings'];
  assert.deepEqual([0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map((n) => plural(n, ru)),
    ['вечеров', 'вечер', 'вечера', 'вечера', 'вечеров', 'вечеров', 'вечеров', 'вечеров', 'вечер', 'вечера', 'вечеров', 'вечер', 'вечеров']);
  assert.deepEqual([0, 1, 2].map((n) => plural(n, en)), ['evenings', 'evening', 'evenings']);
});
