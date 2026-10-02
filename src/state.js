export const BUILD_ORDER = [0, 1, 3, 2];
export const nextChapter = state => BUILD_ORDER[Math.min(3, state.currentDay - 1)];
export const KEY = "veska.v1";
export const fresh = () => ({
  version: 3,
  onboarded: false,
  lang: "ru",
  obstacle: "stress",
  sound: "rain",
  level: 1,
  currentDay: 1,
  unlocked: [0],
  lastBuildDate: null,
  customMix: false,
  day2MixConfigured: false,
  mixEnabled: [true, false, false, false, false, false],
  seconds: 0,
  dates: [],
  mix: [0.25, 0.3, 0.4, 0.3, 0.25, 0.15],
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
  const day = Number(raw.currentDay ?? raw.level);
  s.currentDay = Number.isFinite(day) ? Math.max(1, Math.min(5, Math.floor(day))) : 1;
  s.level = s.currentDay;
  const legacy = Array.isArray(raw.unlocked)
    ? raw.unlocked.filter(i => Number.isInteger(i) && i >= 0 && i < 4)
    : [0,1,2,3].slice(0, Math.max(0, (Number(raw.level) || 1)-1));
  // Preserve all existing buildings while revealing the current day's location.
  s.unlocked = [...new Set([...legacy, ...BUILD_ORDER.slice(0, Math.min(4, s.currentDay))])];
  s.lastBuildDate = /^\d{4}-\d{2}-\d{2}$/.test(raw.lastBuildDate || '') ? raw.lastBuildDate : null;
  s.customMix = raw.customMix === true;
  s.day2MixConfigured = raw.day2MixConfigured === true;
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
    const saved = storage.getItem(KEY);
    return normalize(saved ? JSON.parse(saved) : {currentDay: storage.getItem("currentDay") ?? 1});
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
  const earned = state.currentDay < 5 && chapter === nextChapter(state);
  const currentDay = state.currentDay + (earned ? 1 : 0);
  for (const i of BUILD_ORDER.slice(0, Math.min(4, currentDay))) if (!unlocked.includes(i)) unlocked.push(i);
  return {
    ...state, unlocked, currentDay, level: currentDay,
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
