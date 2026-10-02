// Procedural soundscapes: no remote audio requests, licenses or downloads.
export class Soundscape {
  constructor() {
    this.ctx = null;
    this.channels = [];
    this.active = [false, false, false, false];
    this.volume = [0.7, 0.3, 0.4, 0.3];
    this.paused = false;
  }
  async init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Audio unsupported");
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      const length = this.ctx.sampleRate * 8;
      for (let kind = 0; kind < 4; kind++) {
        const buf = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const data = buf.getChannelData(c);
          let brown = 0;
          for (let n = 0; n < length; n++) {
            const white = Math.random() * 2 - 1;
            brown = (brown + 0.02 * white) / 1.02;
            if (kind === 0) data[n] = white * 0.25 + brown * 1.1;
            if (kind === 1)
              data[n] = brown * 2 + (Math.random() < 0.0012 ? white * 0.65 : 0);
            if (kind === 2)
              data[n] =
                brown * 0.8 +
                Math.sin(n * 0.71) *
                  Math.pow(
                    Math.max(0, Math.sin((n / this.ctx.sampleRate) * 2.3)),
                    20,
                  ) *
                  0.022;
            if (kind === 3) data[n] = brown * 2.3;
          }
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buf;
        source.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = kind === 2 ? "highpass" : "lowpass";
        filter.frequency.value = [3600, 1500, 700, 550][kind];
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        source.start();
        const lfo = this.ctx.createOscillator(),
          depth = this.ctx.createGain();
        lfo.frequency.value = [0.08, 0.16, 0.11, 0.065][kind];
        depth.gain.value = [180, 250, 80, 260][kind];
        lfo.connect(depth);
        depth.connect(filter.frequency);
        lfo.start();
        this.channels.push({ gain, source, lfo });
      }
    }
    await this.ctx.resume();
    if (this.ctx.state !== "running") throw new Error("Audio suspended");
  }
  apply() {
    if (!this.ctx) return;
    this.channels.forEach((c, i) =>
      c.gain.gain.setTargetAtTime(
        this.active[i] && !this.paused ? this.volume[i] : 0,
        this.ctx.currentTime,
        0.2,
      ),
    );
  }
  setMaster(value = 0.55) {
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
  }
  scheduleSleep(seconds) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(0.55, t);
    if (Number.isFinite(seconds)) {
      this.master.gain.setValueAtTime(0.55, t + Math.max(0, seconds - 10));
      this.master.gain.linearRampToValueAtTime(0, t + seconds);
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
      this.active.some((on, i) => on && this.volume[i] > 0)
    );
  }
}
