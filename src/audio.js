import { seamlessLoop } from "./loop-buffer.js";
export const AMBIENCE = ["rain", "fire", "forest", "wind-owls"].map(
  (name) => new URL(`../assets/audio/${name}.mp3`, import.meta.url).href,
);
export const interfaceClickUrl = new URL(
  "../assets/audio/interface-click.mp3",
  import.meta.url,
).href;
export const fogWaterUrl = new URL(
  "../assets/audio/fog-water.mp3",
  import.meta.url,
).href;

// Recorded MP3 files decoded once into gapless PCM loops. No noise synthesis.
export class Soundscape {
  constructor() {
    this.ctx = null;
    this.channels = [];
    this.active = [false, false, false, false];
    this.volume = [0.25, 0.3, 0.4, 0.3];
    this.paused = false;
    this.revision = 0;
    this.channelRevision = [0, 0, 0, 0];
    this.effects = new Map();
    this.sessionMode = false;
    this.sessionLevels = [0,0,0,0];
  }
  async setChannel(index, enabled, {preservePause = false} = {}) {
    if (!Number.isInteger(index) || index < 0 || index >= AMBIENCE.length)
      return;
    if (enabled && this.fading) this.stop();
    const revision = this.revision;
    const request = ++this.channelRevision[index];
    this.active[index] = enabled;
    if (!enabled) {
      this.apply();
      return;
    }
    if (!preservePause) this.paused = false;
    try {
      await this.init([index]);
      if (revision !== this.revision || request !== this.channelRevision[index])
        return;
      this.apply();
    } catch (error) {
      if (revision !== this.revision || request !== this.channelRevision[index])
        return;
      this.active[index] = false;
      this.apply();
      throw error;
    }
  }
  async init(indices = []) {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Audio unsupported");
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.output = this.ctx.createGain();
      this.output.gain.value = 1;
      this.master.connect(this.output);
      this.output.connect(this.ctx.destination);
      this.channels = AMBIENCE.map(() => {
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.connect(this.master);
        return { gain, source: null, ready: false, pending: null };
      });
    }
    await this.ctx.resume();
    if (this.ctx.state !== "running") throw new Error("Audio suspended");
    await Promise.all(indices.map((index) => this.load(index)));
  }
  async load(index) {
    const channel = this.channels[index];
    if (channel.ready) return;
    if (channel.pending) return channel.pending;
    channel.pending = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(AMBIENCE[index], {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(`Recording unavailable: ${response.status}`);
        const buffer = await this.ctx.decodeAudioData(
          await response.arrayBuffer(),
        );
        const source = this.ctx.createBufferSource();
        source.buffer = seamlessLoop(this.ctx, buffer);
        source.loop = true;
        source.connect(channel.gain);
        source.start();
        channel.source = source;
        channel.ready = true;
      } finally {
        clearTimeout(timeout);
      }
    })();
    try {
      await channel.pending;
    } finally {
      channel.pending = null;
    }
  }
  apply() {
    if (!this.ctx) return;
    const sum = this.active.reduce(
      (total, on, i) => total + (on ? this.volume[i] : 0),
      0,
    );
    this.master.gain.setTargetAtTime(
      this.sessionMode ? 1 : 1 / Math.max(1, sum),
      this.ctx.currentTime,
      0.45,
    );
    this.channels.forEach((channel, index) => {
      const gain = channel.gain.gain;
      if (gain.cancelAndHoldAtTime)
        gain.cancelAndHoldAtTime(this.ctx.currentTime);
      else {
        const value = gain.value;
        gain.cancelScheduledValues(this.ctx.currentTime);
        gain.setValueAtTime(value, this.ctx.currentTime);
      }
      channel.gain.gain.setTargetAtTime(
        this.active[index] && !this.paused
          ? this.sessionMode
            ? this.sessionLevels[index]
            : this.volume[index]
          : 0,
        this.ctx.currentTime,
        0.45,
      );
    });
  }
  setMaster(value = 1) {
    if (!this.ctx) return;
    this.output.gain.cancelScheduledValues(this.ctx.currentTime);
    this.output.gain.setTargetAtTime(value, this.ctx.currentTime, 0.15);
  }
  scheduleSleep(seconds) {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    this.output.gain.cancelScheduledValues(time);
    this.output.gain.setValueAtTime(1, time);
    if (Number.isFinite(seconds)) {
      this.output.gain.setValueAtTime(1, time + Math.max(0, seconds - 8));
      this.output.gain.linearRampToValueAtTime(0, time + seconds);
    }
  }
  stop() {
    this.revision++;
    this.fading = false;
    this.sessionMode = false;
    this.active.fill(false);
    this.paused = false;
    if (this.ctx)
      this.channels.forEach((c) => {
        c.gain.gain.cancelScheduledValues(this.ctx.currentTime);
        c.gain.gain.setValueAtTime(0, this.ctx.currentTime);
      });
    this.setMaster();
  }
  startBedtime(index) {
    this.stop();
    this.sessionMode = true;
    this.active[index] = true;
    this.sessionLevels = [0,0,0,0];
    this.sessionLevels[index] = .25;
    const time = this.ctx.currentTime;
    this.output.gain.cancelScheduledValues(time);
    this.output.gain.setValueAtTime(1, time);
    this.master.gain.cancelScheduledValues(time);
    this.master.gain.setValueAtTime(1, time);
    const gain = this.channels[index].gain.gain;
    gain.setValueAtTime(0, time);
    gain.linearRampToValueAtTime(0.25, time + 4);
  }
  transitionBedtime(levels, seconds) {
    this.sessionMode=true;
    this.sessionLevels=[...levels];
    const time=this.ctx.currentTime;
    this.channels.forEach((channel,i)=>{
      this.active[i]=levels[i]>0;
      const gain=channel.gain.gain;
      if(gain.cancelAndHoldAtTime)gain.cancelAndHoldAtTime(time);
      else{const value=gain.value;gain.cancelScheduledValues(time);gain.setValueAtTime(value,time);}
      gain.linearRampToValueAtTime(levels[i],time+seconds);
    });
  }
  fadeOut(seconds = 8) {
    this.revision++;
    this.active.fill(false);
    this.fading = true;
    if (!this.ctx) return;
    const time = this.ctx.currentTime,
      gain = this.output.gain;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(time);
    else {
      const value = gain.value;
      gain.cancelScheduledValues(time);
      gain.setValueAtTime(value, time);
    }
    gain.linearRampToValueAtTime(0, time + seconds);
  }
  async preloadEffect(url) {
    if (!this.effects.has(url)) {
      const pending = (async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Effect unavailable");
        return this.ctx.decodeAudioData(await response.arrayBuffer());
      })();
      this.effects.set(url, pending);
      pending.catch(() => this.effects.delete(url));
    }
    return this.effects.get(url);
  }
  async playEffect(url, volume) {
    const revision = this.revision;
    try {
      const buffer = await this.preloadEffect(url);
      if (revision !== this.revision || this.paused || this.fading) return;
      const source = this.ctx.createBufferSource(),
        gain = this.ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(this.output);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start();
    } catch {
      /* Optional tactile sounds must never interrupt a bedtime story. */
    }
  }
  get playing() {
    return (
      this.ctx?.state === "running" &&
      !this.paused &&
      this.active.some(
        (on, index) =>
          on && this.channels[index]?.ready && (this.sessionMode ? this.sessionLevels[index] : this.volume[index]) > 0,
      )
    );
  }
}
