export const AMBIENCE = ["rain", "fire", "forest", "wind"].map(
  (name) => new URL(`../assets/audio/${name}.wav`, import.meta.url).href,
);

// Real recordings, prepared as seamless PCM loops. No generated noise fallback.
export class Soundscape {
  constructor() {
    this.ctx = null;
    this.channels = [];
    this.active = [false, false, false, false];
    this.volume = [0.7, 0.3, 0.4, 0.3];
    this.paused = false;
  }
  async init(indices = []) {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Audio unsupported");
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
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
        source.buffer = buffer;
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
    this.channels.forEach((channel, index) =>
      channel.gain.gain.setTargetAtTime(
        this.active[index] && !this.paused ? this.volume[index] : 0,
        this.ctx.currentTime,
        0.45,
      ),
    );
  }
  setMaster(value = 0.55) {
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.15);
  }
  scheduleSleep(seconds) {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(time);
    this.master.gain.setValueAtTime(0.55, time);
    if (Number.isFinite(seconds)) {
      this.master.gain.setValueAtTime(0.55, time + Math.max(0, seconds - 10));
      this.master.gain.linearRampToValueAtTime(0, time + seconds);
    }
  }
  stop() {
    this.active.fill(false);
    this.paused = false;
    this.apply();
    this.setMaster();
  }
  get playing() {
    return (
      this.ctx?.state === "running" &&
      !this.paused &&
      this.active.some(
        (on, index) =>
          on && this.channels[index]?.ready && this.volume[index] > 0,
      )
    );
  }
}
