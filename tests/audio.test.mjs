import {pcm} from "./pcm.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { Soundscape, interfaceClickUrl, fogWaterUrl } from "../src/audio.js";
function parameter() {
  return {
    value: 0,
    events: [],
    setTargetAtTime(...args) {
      this.events.push(["target", ...args]);
    },
    setValueAtTime(...args) {
      this.events.push(["value", ...args]);
    },
    linearRampToValueAtTime(...args) {
      this.events.push(["ramp", ...args]);
    },
    cancelScheduledValues(...args) {
      this.events.push(["cancel", ...args]);
    },
  };
}
function engine() {
  const a = new Soundscape();
  a.ctx = { currentTime: 100, state: "running" };
  a.master = { gain: parameter() };
  a.output = { gain: parameter() };
  a.channels = Array.from({ length: 4 }, () => ({
    gain: { gain: parameter() },
    ready: true,
  }));
  return a;
}
test("mixer keeps rain 70% and fire 30% independent", () => {
  const a = engine();
  a.active = [true, true, false, false];
  a.volume = [0.7, 0.3, 0.4, 0.3];
  a.apply();
  assert.equal(a.channels[0].gain.gain.events.at(-1)[1], 0.7);
  assert.equal(a.channels[1].gain.gain.events.at(-1)[1], 0.3);
  assert.equal(a.channels[2].gain.gain.events.at(-1)[1], 0);
  assert.equal(a.playing, true);
});
test("recordings load lazily, deduplicate requests and retry failures", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0,
    fail = true;
  globalThis.fetch = async () => {
    calls++;
    if (fail) return { ok: false, status: 503 };
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
  };
  const a = engine();
  a.ctx.resume = async () => {};
  a.ctx.decodeAudioData = async () => pcm(2, 10000, 1000);
  a.ctx.createBuffer = pcm;
  a.ctx.createBufferSource = () => ({ connect() {}, start() {} });
  a.channels.forEach((c) => {
    c.ready = false;
    c.pending = null;
  });
  try {
    await assert.rejects(a.init([0]), /Recording unavailable/);
    assert.equal(a.channels[0].ready, false);
    fail = false;
    await Promise.all([a.init([0]), a.init([0])]);
    assert.equal(calls, 2);
    assert.equal(a.channels[0].ready, true);
    assert.equal(a.channels[1].ready, false);
    await a.init([0]);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("paused and zero-volume channels do not count as listening", () => {
  const a = engine();
  a.active[0] = true;
  a.paused = true;
  a.apply();
  assert.equal(a.playing, false);
  assert.equal(a.channels[0].gain.gain.events.at(-1)[1], 0);
  a.paused = false;
  a.volume[0] = 0;
  assert.equal(a.playing, false);
  a.volume[0] = 0.5;
  a.ctx.state = "suspended";
  assert.equal(a.playing, false);
});

test("independent channel requests survive reversed downloads and rapid cancellation", async () => {
  const a = engine();
  const pending = new Map();
  a.init = ([index]) => new Promise((resolve) => pending.set(index, resolve));
  const rain = a.setChannel(0, true);
  const fire = a.setChannel(1, true);
  assert.deepEqual(a.active, [true, true, false, false]);
  await a.setChannel(0, false);
  pending.get(1)();
  await fire;
  pending.get(0)();
  await rain;
  assert.deepEqual(a.active, [false, true, false, false]);
  assert.equal(a.channels[0].gain.gain.events.at(-1)[1], 0);
  assert.equal(a.channels[1].gain.gain.events.at(-1)[1], 0.3);
  const forest = a.setChannel(2, true);
  a.stop();
  pending.get(2)();
  await forest;
  assert.deepEqual(a.active, [false, false, false, false]);
});

test("failed channel download leaves the other channels playing", async () => {
  const a = engine();
  a.active[0] = true;
  a.init = async () => {
    throw new Error("offline");
  };
  await assert.rejects(a.setChannel(1, true), /offline/);
  assert.deepEqual(a.active, [true, false, false, false]);
  assert.equal(a.playing, true);
});
test("sleep fade is scheduled on audio clock exactly 8 seconds before deadline", () => {
  const a = engine();
  a.scheduleSleep(900);
  assert.deepEqual(a.output.gain.events, [
    ["cancel", 100],
    ["value", 1, 100],
    ["value", 1, 992],
    ["ramp", 0, 1000],
  ]);
});
test("infinite timer removes scheduled fade and keeps master volume", () => {
  const a = engine();
  a.scheduleSleep(Infinity);
  assert.deepEqual(a.output.gain.events, [
    ["cancel", 100],
    ["value", 1, 100],
  ]);
});
test("stop clears all layers and paused state", () => {
  const a = engine();
  a.active.fill(true);
  a.paused = true;
  a.stop();
  assert.deepEqual(a.active, [false, false, false, false]);
  assert.equal(a.paused, false);
  assert.equal(a.playing, false);
});

test("bedtime rain rises from zero to 25 percent in exactly four seconds", () => {
  const a = engine();
  a.startBedtime(0);
  assert.deepEqual(a.active, [true, false, false, false]);
  assert.deepEqual(a.channels[0].gain.gain.events.slice(-2), [
    ["value", 0, 100],
    ["ramp", 0.25, 104],
  ]);
});

test("exit fades the shared voice, ambience and interface bus to zero over eight seconds", () => {
  const a = engine();
  a.active[0] = true;
  a.output.gain.value = 1;
  a.fadeOut();
  assert.deepEqual(a.output.gain.events, [
    ["cancel", 100],
    ["value", 1, 100],
    ["ramp", 0, 108],
  ]);
  assert.equal(a.fading, true);
  assert.deepEqual(a.active, [false, false, false, false]);
});

test("a new mix cancels the old fade and preserves the requested channel", async () => {
  const a = engine();
  a.fadeOut();
  a.init = async () => {};
  await a.setChannel(1, true);
  assert.equal(a.fading, false);
  assert.equal(a.active[1], true);
  assert.equal(a.channels[1].gain.gain.events.at(-1)[1], 0.3);
});

test("all four channels retain headroom at maximum mixer volume", () => {
  const a = engine();
  a.active.fill(true);
  a.volume.fill(1);
  a.apply();
  assert.equal(a.master.gain.events.at(-1)[1], 0.25);
});

test("interface ASMR uses 40 percent click and 8 percent water through the common output", async () => {
  const a = engine(),
    nodes = [];
  a.preloadEffect = async () => ({ duration: 1 });
  a.ctx.createBufferSource = () => ({
    connect() {},
    start() {},
    disconnect() {},
  });
  a.ctx.createGain = () => {
    const node = {
      gain: { value: 0 },
      connect(destination) {
        this.destination = destination;
      },
      disconnect() {},
    };
    nodes.push(node);
    return node;
  };
  await a.playEffect(interfaceClickUrl, 0.4);
  await a.playEffect(fogWaterUrl, 0.08);
  assert.deepEqual(
    nodes.map((n) => n.gain.value),
    [0.4, 0.08],
  );
  assert.ok(nodes.every((n) => n.destination === a.output));
});

test('opening a channel from the sheet preserves a paused session',async()=>{
 const a=engine();a.paused=true;a.init=async()=>{};
 await a.setChannel(1,true,{preservePause:true});
 assert.equal(a.paused,true);assert.equal(a.active[1],true);
 assert.equal(a.channels[1].gain.gain.events.at(-1)[1],0);
});
