import {pcm} from "./pcm.mjs";
import test from "node:test";
import assert from "node:assert/strict";

test("full app journey: pause, early exit, four unlocks, persistence and timer expiry", async () => {
  // Exercise the application event handlers with a deterministic audio clock.
  // These are in-memory DOM/audio doubles; production has no debug shortcuts.
  const events = {},
    docEvents = {},
    values = new Map();
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
    connect() {},
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
      return node();
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
      return pcm(2, 425, 10);
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
  assert.match(app.innerHTML, /Место, где можно выдохнуть/);
  await click("onboard-next");
  await click("onboard-next");
  await click("finish-onboarding");
  assert.equal(saved().level, 1);
  assert.equal(saved().onboarded, true);
  // This journey exercises the supported text-only mode; narrator timing is tested separately.
  await click("voice");
  await click("start");
  advance(10);
  await click("pause");
  advance(200);
  assert.match(app.innerHTML, /Продолжить/);
  assert.equal(saved().level, 1);
  await click("pause");
  await click("exit");
  await click("leave");
  assert.equal(saved().level, 1);
  for (let level = 2; level <= 5; level++) {
    await click("start");
    advance(119);
    assert.match(app.innerHTML, /phase-prelude/);
    advance(1);
    assert.match(app.innerHTML, /phase-breathing/);
    advance(90);
    assert.match(app.innerHTML, /Зажечь фонарь/);
    await click("light");
    assert.match(app.innerHTML, /Фонарь освещает/);
    advance(90);
    assert.match(app.innerHTML, /data-action="detail"/);
    await click("detail");
    advance(240);
    assert.match(app.innerHTML, /phase-drifting/);
    assert.doesNotMatch(app.innerHTML, /data-action="detail"|data-action="fog"|data-action="light"/);
    advance(299);
    assert.equal(saved().level, level - 1);
    advance(1);
    assert.equal(saved().level, level);
    assert.match(app.innerHTML, /sleep-screen/);
    advance(479);
    assert.doesNotMatch(app.innerHTML, /Звуки плавно затихли/);
    advance(1);
    assert.match(app.innerHTML, /Звуки плавно затихли/);
    await click("sleep-exit");
    wall += 86400000;
  }
  assert.equal(saved().dates.length, 4);
  assert.ok(saved().seconds >= 730);
  await click("tab", { tab: "sounds" });
  await click("sound", { index: "0" });
  await click("mix-sleep");
  await click("timer", { minutes: "15" });
  advance(100);
  await click("sleep-pause");
  advance(1000);
  assert.match(app.innerHTML, /Продолжить/);
  await click("sleep-pause");
  advance(799);
  assert.match(app.innerHTML, /Пусть всё подождёт/);
  advance(1);
  assert.match(app.innerHTML, /Тихой ночи/);
  assert.match(app.innerHTML, /Звуки плавно затихли/);
  assert.equal(saved().level, 5);
});
