export const KEY = "veska.v1";
export const fresh = () => ({
  version: 1,
  onboarded: false,
  lang: "ru",
  obstacle: "stress",
  sound: "rain",
  level: 1,
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
export function complete(state, now = new Date()) {
  return {
    ...state,
    level: Math.min(5, state.level + 1),
    dates: [...new Set([...state.dates, dayKey(now)])].sort(),
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
