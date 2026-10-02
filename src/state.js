export const BUILD_ORDER = [0, 3, 1, 2];
export const nextChapter = state => BUILD_ORDER.find(i => !state.unlocked.includes(i)) ?? 0;
export const KEY = "veska.v1";
export const fresh = () => ({
  version: 2,
  onboarded: false,
  lang: "ru",
  obstacle: "stress",
  sound: "rain",
  level: 1,
  currentDay: 1,
  unlocked: [],
  lastBuildDate: null,
  customMix: false,
  mixEnabled: [true, false, false, false],
  seconds: 0,
  dates: [],
  mix: [0.25, 0.3, 0.4, 0.3],
  voice: true,
});
export function normalize(raw) {
  const s = fresh();
  if (!raw || typeof raw !== "object") return s;
  s.onboarded = raw.onboarded === true;
  s.lang = raw.lang === "en" ? "en" : "ru";
  s.obstacle = ["stress", "noise", "thoughts"].includes(raw.obstacle)
    ? raw.obstacle
    : s.obstacle;
  s.sound = ["rain", "forest", "fire"].includes(raw.sound)
    ? raw.sound
    : s.sound;
  s.level = Math.max(1, Math.min(5, Math.floor(Number(raw.level) || 1)));
  const legacyLevel = s.level;
  s.unlocked = Array.isArray(raw.unlocked)
    ? [...new Set(raw.unlocked.filter(i => Number.isInteger(i) && i >= 0 && i < 4))]
    : raw.currentDay !== undefined
      ? BUILD_ORDER.slice(0, Math.max(0, Math.min(4, Math.floor(Number(raw.currentDay) || 1)-1)))
      : [0,1,2,3].slice(0, legacyLevel-1);
  s.currentDay = s.unlocked.length + 1;
  s.level = s.currentDay;
  s.lastBuildDate = /^\d{4}-\d{2}-\d{2}$/.test(raw.lastBuildDate || '') ? raw.lastBuildDate : null;
  s.customMix = raw.customMix === true;
  s.mixEnabled = s.mixEnabled.map((v,i)=>typeof raw.mixEnabled?.[i] === 'boolean' ? raw.mixEnabled[i] : v);
  s.seconds = Math.max(0, Number.isFinite(raw.seconds) ? raw.seconds : 0);
  s.dates = Array.isArray(raw.dates)
    ? [
        ...new Set(raw.dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))),
      ].sort()
    : [];
  s.mix = s.mix.map((v, i) =>
    Number.isFinite(raw.mix?.[i]) ? Math.min(1, Math.max(0, raw.mix[i])) : v,
  );
  s.voice = raw.voice !== false;
  return s;
}
export function load(storage) {
  try {
    return normalize(JSON.parse(storage.getItem(KEY)));
  } catch {
    return fresh();
  }
}
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function streak(dates, now = new Date()) {
  const set = new Set(dates);
  const cursor = new Date(now);
  let count = 0;
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(dayKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
export function complete(state, now = new Date(), chapter = nextChapter(state)) {
  const today = dayKey(now);
  const unlocked = [...state.unlocked];
  const earned = state.lastBuildDate !== today && chapter === nextChapter(state) && !unlocked.includes(chapter);
  if (earned) unlocked.push(chapter);
  return {
    ...state, unlocked, currentDay: unlocked.length + 1, level: unlocked.length + 1,
    lastBuildDate: earned ? today : state.lastBuildDate,
    dates: [...new Set([...state.dates, today])].sort(),
  };
}
export function remaining(deadline, now = Date.now()) {
  return deadline === null ? Infinity : Math.max(0, (deadline - now) / 1000);
}
export function clock(seconds) {
  if (!Number.isFinite(seconds)) return "∞";
  const n = Math.ceil(Math.max(0, seconds));
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
