import {pcm} from "./pcm.mjs";
import test from "node:test";
import assert from "node:assert/strict";

test("voiced journey: natural ends advance the day; missed speech and exit do not", async () => {
  // Exercise the application event handlers with a deterministic audio clock.
  // These are in-memory DOM/audio doubles; production has no debug shortcuts.
  const events = {},
    docEvents = {},
    values = new Map([["veska.v1", JSON.stringify({onboarded:true,currentDay:1,voice:true})]]);
  const sources=[];
  const element = {
    innerHTML: "",
    textContent: "",
    value: 0,
    focus() {},
    classList: { add() {}, remove() {} },
    addEventListener() {},
    showModal() {},
  };
  const app = {
    ...element,
    addEventListener: (type, fn) => (events[type] = fn),
    querySelector: () => element,
  };
  globalThis.document = {
    documentElement: { lang: "ru" },
    querySelector: (s) => (s === "#app" ? app : element),
    addEventListener: (type, fn) => (docEvents[type] = fn),
    hidden: false,
  };
  globalThis.localStorage = {
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => values.set(k, v),
  };
  let tick,
    context,
    wall = new Date(2027, 0, 15, 21, 0).getTime(); // a local evening, in any time zone
  globalThis.setInterval = (fn) => {
    tick = fn;
  };
  globalThis.setTimeout = () => 0;
  globalThis.clearTimeout = () => {};
  globalThis.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(4),
  });
  Date.now = () => wall;
  const param = () => ({
    value: 0,
    setTargetAtTime() {},
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  });
  const node = () => ({
    gain: param(),
    frequency: param(),
    Q: param(),
    connect() {},
    disconnect() {},
    start() {},
  });
  class FakeAudio {
    constructor() {
      context = this;
      this.currentTime = 0;
      this.sampleRate = 8;
      this.state = "running";
    }
    createGain() {
      return node();
    }
    createBuffer(channels, length, rate) {
      return pcm(channels, length, rate);
    }
    createBufferSource() {
      const source={...node(), stop(){this.onended?.();},disconnect(){},start(when,offset,duration){this.duration=duration;}};
      sources.push(source);return source;
    }
    createBiquadFilter() {
      return node();
    }
    createOscillator() {
      return node();
    }
    async resume() {
      this.state = "running";
    }
    async decodeAudioData() {
      return pcm(2, 2000, 10);
    }
  }
  globalThis.window = {
    AudioContext: FakeAudio,
    scrollTo() {},
    addEventListener() {},
  };
  await import("../src/app.js");
  const click = async (action, extra = {}) =>
    events.click({
      preventDefault() {},
      target: { closest: () => ({ dataset: { action, ...extra } }) },
    });
  const advance = (n) => {
    for (let i = 0; i < n; i++) {
      context.currentTime++;
      wall += 1000;
      tick();
    }
  };
  const saved = () => JSON.parse(values.get("veska.v1"));
  const {buildSessionPlan}=await import('../src/session-plan.js');
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  const finishCue=async()=>{await flush();const source=sources.at(-1);assert.ok(source.duration>0);source.onended();source.onended();};
  // A voiced evening counts at the end of the story phase, even if the listener fell asleep
  // and never heard the last phrase. The next building appears the following morning.
  await click('start');
  advance(539);
  assert.equal(saved().pending,null,'leaving before the story ends earns nothing');
  await click('exit');await click('leave');
  assert.equal(saved().currentDay,1);
  await click('start');
  advance(540);
  assert.equal(saved().pending.chapter,0);
  assert.equal(saved().currentDay,1,'no building in the middle of the night');
  await click('exit');await click('leave');
  assert.match(app.innerHTML,/Утром здесь появится Млын/);
  await click('start');advance(600);
  assert.equal(saved().currentDay,1,'a second evening the same night does not build twice');
  await click('exit');await click('leave');
  wall+=10*3600e3;
  await click('tab',{tab:'village'});
  assert.match(app.innerHTML,/За ночь твой хутор подрос/);
  assert.match(app.innerHTML,/Млын/);
  await click('mood',{mood:'3'});
  assert.deepEqual(saved().sleepLog.at(-1).mood,3);
  await click('morning-go');
  assert.equal(saved().currentDay,2);assert.equal(values.get('currentDay'),'2');
  assert.match(app.innerHTML,/День 2: Млын/);assert.match(app.innerHTML,/Начать сеанс: День 2/);
  await click('tab',{tab:'sounds'});assert.match(app.innerHTML,/Тихий скрип мельницы/);
  // Short evening: story at once, counted after seven minutes.
  await click('tab',{tab:'village'});await click('length',{length:'short'});
  assert.match(app.innerHTML,/role="radio" aria-checked="true" data-action="length" data-length="short"/);
  await click('start');
  assert.match(app.innerHTML,/phase-breathing/);
  assert.match(app.innerHTML,/10:00/);
  advance(420);
  assert.equal(saved().pending.chapter,1);
});
