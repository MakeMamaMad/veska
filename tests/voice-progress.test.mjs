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
    wall = 1800000000000;
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
  await click('start');
  const firstPlan=buildSessionPlan('ru',0);let elapsed=0;
  for(const cue of firstPlan){advance(Math.ceil(cue.at)-elapsed);elapsed=Math.ceil(cue.at);await finishCue();}
  assert.equal(saved().currentDay,2);assert.equal(values.get('currentDay'),'2');
  await click('exit');await click('leave');
  assert.match(app.innerHTML,/День 2: Млын/);assert.match(app.innerHTML,/Начать сеанс: День 2/);
  await click('tab',{tab:'sounds'});assert.match(app.innerHTML,/Тихий скрип мельницы/);
  await click('tab',{tab:'village'});await click('start');
  const secondPlan=buildSessionPlan('ru',1);elapsed=0;
  for(const [i,cue] of secondPlan.entries()){
    advance(Math.ceil(cue.at)-elapsed);elapsed=Math.ceil(cue.at);
    if(i===0)await flush();else await finishCue();
  }
  advance(840-elapsed);assert.equal(saved().currentDay,2,'timeline alone must not reward a voiced session');
  await click('sleep-exit');await click('start');elapsed=0;
  for(const cue of secondPlan){advance(Math.ceil(cue.at)-elapsed);elapsed=Math.ceil(cue.at);await finishCue();}
  assert.equal(saved().currentDay,3);assert.equal(values.get('currentDay'),'3');
});
