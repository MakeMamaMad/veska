// Only local, reviewed recordings belong here. Never put API credentials in the app.
// Each completed chapter must contain four URLs, one per story paragraph.
export const RECORDINGS = Object.fromEntries(
  ["ru", "en"].map((lang) => [
    lang,
    Array.from({ length: 4 }, (_, chapter) =>
      Array.from(
        { length: 4 },
        (_, stage) =>
          `../assets/narration/${lang}-${chapter + 1}-${stage + 1}-warm.mp3`,
      ),
    ),
  ]),
);
export const hasNarration = (lang, chapter) =>
  RECORDINGS[lang]?.[chapter]?.length === 4;
export const hasAnyNarration = (lang) =>
  RECORDINGS[lang]?.some((_, i) => hasNarration(lang, i));

export class Narrator {
  constructor() {
    this.source = null;
    this.buffer = null;
    this.offset = 0;
    this.started = 0;
    this.token = 0;
    this.busy = false;
    this.paused = false;
    this.cache = new Map();
  }
  async play(ctx, url, destination = ctx.destination, options = {}) {
    this.stop();
    if (!url) return;
    this.ctx = ctx;
    this.destination = destination;
    this.volume = options.gain ?? .9;
    this.soft = Boolean(options.soft);
    this.offset = options.offset ?? 0;
    const token = this.token;
    this.busy = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      let buffer = this.cache.get(url);
      if (!buffer) {
        const response = await fetch(new URL(url, import.meta.url), {signal:controller.signal});
        if (!response.ok) throw new Error("Narration unavailable");
        buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        this.cache.set(url,buffer);
      }
      if (token !== this.token) return;
      if (ctx.currentTime > (options.expiresAt ?? Infinity)) { this.busy = false; return; }
      this.buffer = buffer;
      this.end = Math.min(buffer.duration,this.offset+(options.duration ?? buffer.duration));
      if (!this.paused) this.resume();
    } catch (error) {
      if (token === this.token) {
        this.busy = false;
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  resume() {
    this.paused = false;
    if (!this.buffer || this.source) return;
    if (this.offset >= (this.end ?? this.buffer.duration)) {
      this.busy = false;
      return;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = this.volume ?? .9;
    source.connect(gain);
    let filter;
    if (this.soft) {
      filter = this.ctx.createBiquadFilter(); filter.type='lowpass';filter.frequency.value=4200;filter.Q.value=.5;
      gain.connect(filter);filter.connect(this.destination || this.ctx.destination);
    } else gain.connect(this.destination || this.ctx.destination);
    source.onended = () => {
      gain.disconnect();
      filter?.disconnect();
      if (this.source === source) {
        this.source = null;
        this.offset = this.end ?? this.buffer.duration;
        this.busy = false;
      }
    };
    this.source = source;
    this.started = this.ctx.currentTime;
    this.busy = true;
    source.start(0, this.offset, (this.end ?? this.buffer.duration)-this.offset);
  }
  pause() {
    this.paused = true;
    if (!this.source) return;
    this.offset += this.ctx.currentTime - this.started;
    const source = this.source;
    this.source = null;
    source.stop();
  }
  stop() {
    this.token++;
    const source = this.source;
    this.source = null;
    if (source) source.stop();
    this.buffer = null;
    this.offset = 0;
    this.busy = false;
    this.paused = false;
  }
  finishAfter(seconds = 8) {
    this.token++;
    this.busy = false;
    if (this.source) this.source.stop(this.ctx.currentTime + seconds);
  }
}
