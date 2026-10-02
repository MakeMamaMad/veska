// Lock-screen controls and screen wake lock for evening sessions.
//
// Web Audio alone is invisible to the OS: Chrome on Android shows no media notification
// and iOS treats it as "ambient" audio (muted by the silent switch, stopped on lock).
// A near-silent looping <audio> element, started from the same tap that starts the
// session, marks the page as a media player. That enables lock-screen controls and
// switches iOS to the playback audio session, so Web Audio keeps sounding with the
// silent switch on. Native background playback still needs a store wrapper.

function silentWav(seconds = 2, rate = 8000) {
  const samples = seconds * rate, buffer = new ArrayBuffer(44 + samples), v = new DataView(buffer);
  const text = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  text(0, 'RIFF'); v.setUint32(4, 36 + samples, true); text(8, 'WAVE'); text(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  text(36, 'data'); v.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

let keepAlive = null;
let wakeLock = null;
let wantWake = false;

export function startMedia({ title, artist = 'Vёska', onPlay, onPause, onStop }) {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* Safari 17+ only */ }
  try {
    if (!keepAlive && typeof Audio !== 'undefined') {
      keepAlive = new Audio(silentWav());
      keepAlive.loop = true;
      keepAlive.volume = 0.01;
      keepAlive.setAttribute?.('playsinline', '');
    }
    keepAlive?.play?.()?.catch?.(() => {});
  } catch { /* Media element is optional. */ }
  const ms = navigator.mediaSession;
  if (!ms) return;
  try {
    if (typeof MediaMetadata !== 'undefined')
      ms.metadata = new MediaMetadata({ title, artist, album: 'Vёska', artwork: [{ src: new URL('../icon.svg', import.meta.url).href, sizes: '512x512', type: 'image/svg+xml' }] });
    const set = (action, fn) => { try { ms.setActionHandler(action, fn || null); } catch { /* unsupported action */ } };
    set('play', onPlay); set('pause', onPause); set('stop', onStop);
    for (const a of ['seekbackward', 'seekforward', 'previoustrack', 'nexttrack']) set(a, null);
    ms.playbackState = 'playing';
  } catch { /* Media Session is progressive enhancement. */ }
}
export function setMediaPlaying(playing) {
  try {
    if (playing) keepAlive?.play?.()?.catch?.(() => {}); else keepAlive?.pause?.();
    if (navigator.mediaSession) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  } catch { /* ignore */ }
}
export function stopMedia() {
  try { keepAlive?.pause?.(); } catch { /* ignore */ }
  try {
    if (navigator.mediaSession) { navigator.mediaSession.playbackState = 'none'; navigator.mediaSession.metadata = null; }
  } catch { /* ignore */ }
  releaseWake();
}

// Keep the screen on while the story still needs the page (the session pauses if the
// page is hidden before the drift phase). Re-acquired when the page becomes visible.
export async function holdWake() {
  wantWake = true;
  if (wakeLock || !navigator.wakeLock || document.hidden) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener?.('release', () => { wakeLock = null; });
  } catch { wakeLock = null; }
}
export function releaseWake() {
  wantWake = false;
  try { wakeLock?.release?.(); } catch { /* ignore */ }
  wakeLock = null;
}
if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => { if (!document.hidden && wantWake) holdWake(); });
