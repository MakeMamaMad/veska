import {
  load,
  fresh,
  KEY,
  complete,
  streak,
  remaining,
  clock,
} from "./state.js";
import { Soundscape } from "./audio.js";
import {
  Narrator,
  RECORDINGS,
  hasNarration,
  hasAnyNarration,
} from "./narration.js";
import { icon, landscape } from "./art.js";
import { copy, stories } from "./content.js";

let state;
try {
  state = load(localStorage);
} catch {
  state = fresh();
}
const app = document.querySelector("#app"),
  audio = new Soundscape();
audio.volume = [...state.mix];
const narrator = new Narrator();
let audioBusy = false;
let audioGeneration = 0;
const preferredSound = () => ({ rain: 0, fire: 1, forest: 2 })[state.sound];
let screen = state.onboarded ? "village" : "onboarding",
  onboarding = 0,
  session = null,
  sleep = null,
  replay = 0,
  storageWarned = false,
  lastAudioTime = 0,
  lastSave = 0;
const t = () => copy[state.lang];
const soundIcons = ["rain", "fire", "forest", "wind"];
const objectSounds = [0, 3, 2, 1];
const button = (label, action, cls = "primary", attrs = "") =>
  `<button class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
function toast(message) {
  const n = document.querySelector("#notice");
  n.textContent = message;
  n.classList.add("visible");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => n.classList.remove("visible"), 5000);
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    if (!storageWarned) {
      toast(t().storageError);
      storageWarned = true;
    }
  }
}
function brand() {
  return '<a class="brand" href="#" data-action="home" aria-label="Vёska">V<span>ё</span>ska<span class="brand-dot">.</span></a>';
}
function header() {
  return `<header>${brand()}<span class="header-note">${t().tag}</span><button class="language-pill" data-action="language" aria-label="${t().langLabel}">${state.lang.toUpperCase()} <span>⌄</span></button></header>`;
}
function nav() {
  return `<nav class="bottom-nav" aria-label="${state.lang === "ru" ? "Главная навигация" : "Main navigation"}">${[
    ["village", "home", t().village],
    ["sounds", "sound", t().soundTab],
    ["profile", "moon", t().profile],
  ]
    .map(
      ([id, ico, title]) =>
        `<button data-action="tab" data-tab="${id}" class="${screen === id ? "selected" : ""}" ${screen === id ? 'aria-current="page"' : ""}>${icon(ico)}<span>${title}</span></button>`,
    )
    .join("")}</nav>`;
}
function onBoard() {
  const c = t();
  return `<div class="onboarding"><section class="onboard-art">${landscape(2)}<div class="art-caption"><span>53° N · 28° E</span><span>VЁSKA · BELARUS</span></div></section><section class="onboard-content">${brand()}<div class="step-dots" aria-label="${onboarding + 1} / 3">${[0, 1, 2].map((i) => `<i class="${onboarding === i ? "on" : ""}"></i>`).join("")}</div>${onboarding === 0 ? `<p class="eyebrow">${c.readiness}</p><h1>${c.welcome}</h1><p class="tagline">${c.tag}</p><p class="muted intro">${c.intro}</p>${button(c.enter, "onboard-next")}<span class="privacy">${icon("leaf")}${c.privacy}</span>` : onboarding === 1 ? `<h1>${c.language}</h1><p class="muted">${c.languageNote}</p><div class="language-choices">${["ru", "en"].map((l) => button(`<span>${l === "ru" ? "🇷🇺 Русский" : "🇬🇧 English"}</span>${state.lang === l ? icon("check") : ""}`, "choose-language", `choice ${state.lang === l ? "chosen" : ""}`, `data-lang="${l}" aria-pressed="${state.lang === l}"`)).join("")}</div>${button(c.next, "onboard-next")}${button(c.back, "onboard-back", "text-button")}` : `<h1>${c.setup}</h1><p class="muted">${c.setupNote}</p><fieldset><legend>${c.q1}</legend><div class="chips">${["stress", "noise", "thoughts"].map((v, i) => button(c.obstacles[i], "obstacle", `chip ${state.obstacle === v ? "chosen" : ""}`, `data-value="${v}" aria-pressed="${state.obstacle === v}"`)).join("")}</div></fieldset><fieldset><legend>${c.q2}</legend><div class="chips">${["rain", "forest", "fire"].map((v, i) => button(c.sounds[i], "preference", `chip ${state.sound === v ? "chosen" : ""}`, `data-value="${v}" aria-pressed="${state.sound === v}"`)).join("")}</div></fieldset>${button(c.finish, "finish-onboarding")}${button(c.back, "onboard-back", "text-button")}`}</section></div>`;
}
function village() {
  const c = t(),
    chapter = state.level === 5 ? replay : state.level - 1;
  return `<div class="page village-page"><div class="page-heading"><div><p class="eyebrow">${c.evening}</p><h1>${c.greeting}</h1><p class="muted">${c.villageNote}</p></div><div class="level-badge">${icon("leaf")}<span>${c.level} ${state.level}<small>${state.level - 1} / 4 ${c.unlocked}</small></span></div></div><section class="village-map">${landscape(state.level)}<div class="map-top"><span>VЁSKA</span><span>${icon("moon")} ${state.lang === "ru" ? "Тихий вечер" : "A quiet evening"}</span></div>${[
    0, 1, 2, 3,
  ]
    .filter((i) => state.level > i + 1)
    .map(
      (i) =>
        `<button class="map-object object-${i} ${audio.active[objectSounds[i]] ? "playing" : ""}" data-action="object" data-index="${i}" aria-label="${c.objects[i]} · ${c.objectNotes[i]}" aria-pressed="${audio.active[objectSounds[i]]}">${icon(audio.active[objectSounds[i]] ? "sound" : "play")}<span>${c.objects[i]}</span></button>`,
    )
    .join(
      "",
    )}<p class="map-caption">${state.level === 1 ? c.mapEmpty : c.mapHint}</p></section><div class="village-bottom"><section class="story-card"><div class="story-mark">${icon("moon")}</div><div class="story-copy"><p class="eyebrow">${c.chapter} · 0${chapter + 1}</p><h2>${c.chapters[chapter]}</h2><p class="muted">${c.chapterNotes[chapter]}</p><span class="duration">${c.duration} <span>·</span> ${c.headphones}</span>${state.level === 5 ? `<label class="replay-label">${c.replay}<select id="replay">${c.chapters.map((v, i) => `<option value="${i}" ${replay === i ? "selected" : ""}>${v}</option>`).join("")}</select></label>` : ""}</div>${button(`${icon("play")}${c.start}`, "start", "primary start-button")}</section><div class="village-progress">${c.objects.map((name, i) => `<div class="progress-place ${state.level > i + 1 ? "unlocked" : ""}"><span>${icon(state.level > i + 1 ? "check" : "lock")}</span><small>${name}</small></div>`).join("")}</div></div></div>`;
}
function sounds() {
  const c = t();
  return `<div class="page sounds-page"><p class="eyebrow">${c.soundTab} / SOUNDSCAPES</p><h1>${c.mixTitle}</h1><p class="muted">${c.mixNote}</p><div class="sound-grid">${c.soundNames.map((name, i) => `<article class="sound-card sound-${i} ${audio.active[i] ? "enabled" : ""}"><div class="sound-card-top"><div class="sound-art">${icon(soundIcons[i])}</div><button class="switch" role="switch" aria-checked="${audio.active[i]}" aria-label="${name}" data-action="sound" data-index="${i}"><span></span></button></div><h2>${name}</h2><p class="muted">${c.soundNotes[i]}</p><div class="range-row">${icon("volume")}<input type="range" min="0" max="100" value="${Math.round(state.mix[i] * 100)}" data-volume="${i}" aria-label="${name} · ${state.lang === "ru" ? "Громкость" : "Volume"}"><output id="volume-${i}">${Math.round(state.mix[i] * 100)}%</output></div></article>`).join("")}</div><div class="mix-footer"><span class="muted">${audio.active.filter(Boolean).length} / 4 ${c.active}</span>${button(`${icon("moon")}${c.mixSleep}`, "mix-sleep")}${button(c.stop, "stop", "text-button")}</div><p class="footnote">${c.synthetic} ${c.sleepLimit} <a href="./audio-credits.html" target="_blank" rel="noopener noreferrer">${c.soundCredits}</a></p></div>`;
}
function profile() {
  const c = t();
  return `<div class="page profile-page"><p class="eyebrow">${c.profile} / YOUR PEACE</p><h1>${c.profileTitle}</h1><p class="muted">${c.profileNote}</p><div class="stats"><div>${icon("sun")}<strong>${streak(state.dates)}</strong><span>${c.streak}</span></div><div>${icon("moon")}<strong>${Math.floor(state.seconds / 60)}</strong><span>${c.minutes}</span></div></div><h2>${c.achievements}</h2><div class="achievements">${c.objects.map((v, i) => `<div class="achievement ${state.level > i + 1 ? "earned" : ""}">${icon(state.level > i + 1 ? ["home", "wind", "forest", "fire"][i] : "lock")}<div><strong>${v}</strong><small>${state.level > i + 1 ? c.objectNotes[i] : `${c.locked} ${i + 1}`}</small></div>${state.level > i + 1 ? icon("check") : ""}</div>`).join("")}</div><h2>${c.settings}</h2><section class="settings"><label>${c.langLabel}<select id="language"><option value="ru" ${state.lang === "ru" ? "selected" : ""}>Русский</option><option value="en" ${state.lang === "en" ? "selected" : ""}>English</option></select></label><div><span>${c.voice}<small>${hasAnyNarration(state.lang) ? c.voiceNote : c.voiceUnavailable}</small></span><button class="switch" role="switch" aria-checked="${Boolean(state.voice && hasAnyNarration(state.lang))}" aria-label="${c.voice}" data-action="voice" ${hasAnyNarration(state.lang) ? "" : "disabled"}><span></span></button></div><div><span>${c.subscription}</span><span class="muted">${c.soon}</span></div><a href="https://github.com/MakeMamaMad/veska/issues/new" target="_blank" rel="noopener noreferrer">${c.feedback}<span>↗</span></a></section><p class="footnote">${icon("lock")}${c.local}</p></div>`;
}
function sessionView() {
  const c = t();
  return `<section class="session-screen">${landscape(Math.max(2, session.chapter + 2))}<div class="session-shade"></div><button class="close-button" data-action="exit" aria-label="${c.exit}">${icon("close")}</button><div class="session-top"><p class="eyebrow">${c.session}</p><span>${c.chapters[session.chapter]} · elevenlabs.io</span></div><div class="session-content"><div class="breathing-orb ${session.paused ? "paused" : ""}">${icon(session.lit ? "sun" : "leaf")}</div><p class="eyebrow">${c.breathe}</p>${hasNarration(state.lang, session.chapter) ? "" : `<p class="narration-note">${c.narrationPending}</p>`}<p class="story-text">${stories[state.lang][session.chapter][session.stage]}</p>${session.stage === 1 ? button(session.lit ? c.lightDone : `${icon("sun")}${c.light}`, "light", "lantern", session.lit ? "disabled" : "") : ""}</div><div class="session-controls"><div class="session-time"><span id="session-time">${clock(session.elapsed)}</span><span>03:00</span></div><progress id="session-progress" max="180" value="${session.elapsed}" aria-label="${c.session}"></progress>${button(`${icon(session.paused ? "play" : "pause")}${session.paused ? c.resume : c.pause}`, "pause", "quiet-button")}</div><dialog id="exit-dialog"><h2>${c.exit}?</h2><p class="muted">${c.exitNote}</p><div class="dialog-buttons">${button(c.stay, "stay")}${button(c.leave, "leave", "quiet-button")}</div></dialog></section>`;
}
function completedView() {
  const c = t();
  return `<section class="completed-screen">${landscape(state.level)}<div class="completion-card"><div class="complete-check">${icon("check")}</div><p class="eyebrow">${c.objects[session.chapter]}</p><h1>${c.completed}</h1><p class="muted">${c.completedNote}</p>${button(`${icon("moon")}${c.sleep}`, "sleep")}${button(c.home, "home", "text-button")}</div></section>`;
}
function sleepView() {
  const c = t();
  return `<section class="sleep-screen"><button class="close-button" data-action="sleep-exit" aria-label="${c.return}">${icon("close")}</button><div class="sleep-house">${icon("home")}<i></i></div><p class="eyebrow">${sleep.finished ? c.sleepEndNote : c.sleepSub}</p><h1>${sleep.finished ? c.sleepEnd : c.sleepTitle}</h1><div class="sleep-time" id="sleep-time" role="timer" aria-label="${c.timer}">${clock(sleep.finished ? 0 : remaining(sleep.deadline))}</div><p class="timer-label">${c.timer}</p><div class="timer-options">${[15, 30, 45, 0].map((v) => button(v === 0 ? "∞" : `${v} ${c.min}`, "timer", `timer-option ${sleep.minutes === v ? "chosen" : ""}`, `data-minutes="${v}" aria-label="${v === 0 ? c.infinity : `${v} ${c.min}`}" aria-pressed="${sleep.minutes === v}"`)).join("")}</div>${button(`${icon(sleep.paused ? "play" : "pause")}${sleep.paused ? c.resume : c.pause}`, "sleep-pause", "sleep-pause", sleep.finished ? "disabled" : "")}<span class="sleep-brand">Vёska</span></section>`;
}
function render(focus = false) {
  document.documentElement.lang = state.lang;
  document.title = `Vёska — ${t().tag} · elevenlabs.io`;
  app.innerHTML =
    screen === "onboarding"
      ? onBoard()
      : screen === "session"
        ? sessionView()
        : screen === "completed"
          ? completedView()
          : screen === "sleep"
            ? sleepView()
            : `<div class="shell">${header()}${screen === "village" ? village() : screen === "sounds" ? sounds() : profile()}${nav()}</div>`;
  if (focus) {
    const title = app.querySelector("h1,.session-top");
    if (title) {
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }
}
function cancelVoice() {
  narrator.stop();
}
function narrate() {
  cancelVoice();
  if (
    !state.voice ||
    !session ||
    session.paused ||
    !hasNarration(state.lang, session.chapter)
  )
    return;
  narrator
    .play(audio.ctx, RECORDINGS[state.lang][session.chapter][session.stage])
    .catch(() => toast(t().narrationMissing));
}
async function ensureAudio(
  indices = audio.active.flatMap((on, i) => (on ? [i] : [])),
) {
  if (audioBusy) return false;
  audioBusy = true;
  const generation = audioGeneration;
  const loading = indices.some((i) => !audio.channels[i]?.ready);
  if (loading) toast(t().loadingAudio);
  try {
    await audio.init(indices);
    if (generation !== audioGeneration) return false;
    lastAudioTime = audio.ctx.currentTime;
    if (loading) document.querySelector("#notice").classList.remove("visible");
    return true;
  } catch {
    toast(t().audioError);
    return false;
  } finally {
    audioBusy = false;
  }
}
function setPreferred() {
  audio.active.fill(false);
  audio.active[{ rain: 0, fire: 1, forest: 2 }[state.sound]] = true;
  audio.paused = false;
  audio.setMaster();
  audio.apply();
}
async function fullScreen() {
  try {
    await document.documentElement.requestFullscreen?.();
  } catch {
    /* Fullscreen is optional on iOS and embedded browsers. */
  }
}
function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}
function endAudio() {
  audioGeneration++;
  cancelVoice();
  audio.stop();
  save();
}
async function startSession() {
  if (!(await ensureAudio([preferredSound()]))) return;
  session = {
    chapter: state.level === 5 ? replay : state.level - 1,
    stage: 0,
    elapsed: 0,
    stageElapsed: 0,
    paused: false,
    lit: false,
  };
  setPreferred();
  screen = "session";
  render(true);
  fullScreen();
  narrate();
}
function startSleep() {
  cancelVoice();
  sleep = {
    minutes: 30,
    deadline: Date.now() + 30 * 60000,
    finished: false,
    paused: false,
    left: 1800,
  };
  audio.paused = false;
  audio.scheduleSleep(1800);
  audio.apply();
  screen = "sleep";
  render(true);
  fullScreen();
}
function togglePause() {
  session.paused = !session.paused;
  audio.paused = session.paused;
  audio.apply();
  if (session.paused) narrator.pause();
  else narrator.resume();
  render();
}
app.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  e.preventDefault();
  const action = b.dataset.action,
    c = t();
  if (action === "onboard-next") {
    onboarding++;
    render(true);
  } else if (action === "onboard-back") {
    onboarding--;
    render(true);
  } else if (action === "choose-language") {
    state.lang = b.dataset.lang;
    save();
    render();
  } else if (action === "obstacle" || action === "preference") {
    state[action === "obstacle" ? "obstacle" : "sound"] = b.dataset.value;
    render();
  } else if (action === "finish-onboarding") {
    state.onboarded = true;
    save();
    screen = "village";
    render(true);
  } else if (action === "language") {
    state.lang = state.lang === "ru" ? "en" : "ru";
    save();
    render();
  } else if (action === "tab") {
    screen = b.dataset.tab;
    render(true);
  } else if (action === "home") {
    if (screen === "onboarding") return;
    endAudio();
    exitFullscreen();
    screen = "village";
    session = null;
    render(true);
  } else if (action === "start") {
    await startSession();
  } else if (action === "sound" || action === "object") {
    const i =
      action === "object"
        ? objectSounds[Number(b.dataset.index)]
        : Number(b.dataset.index);
    if (!(await ensureAudio([i]))) return;
    audio.active[i] = !audio.active[i];
    audio.paused = false;
    audio.setMaster();
    audio.apply();
    render();
  } else if (action === "stop") {
    endAudio();
    render();
  } else if (action === "mix-sleep") {
    if (!audio.active.some((on, i) => on && audio.volume[i] > 0)) {
      toast(c.noSound);
      return;
    }
    if (await ensureAudio()) startSleep();
  } else if (action === "voice") {
    if (!hasAnyNarration(state.lang)) return;
    state.voice = !state.voice;
    save();
    render();
  } else if (action === "pause") {
    if (session.paused && !(await ensureAudio())) return;
    togglePause();
  } else if (action === "light") {
    session.lit = true;
    render();
  } else if (action === "exit") {
    session.wasPaused = session.paused;
    session.paused = true;
    audio.paused = true;
    audio.apply();
    narrator.pause();
    render();
    const d = document.querySelector("#exit-dialog");
    d.showModal();
    d.addEventListener(
      "cancel",
      (ev) => {
        ev.preventDefault();
        restoreSession();
      },
      { once: true },
    );
  } else if (action === "stay") {
    restoreSession();
  } else if (action === "leave") {
    endAudio();
    session = null;
    screen = "village";
    exitFullscreen();
    render(true);
  } else if (action === "sleep") {
    if (await ensureAudio()) startSleep();
  } else if (action === "sleep-exit") {
    endAudio();
    sleep = null;
    session = null;
    screen = "village";
    exitFullscreen();
    render(true);
  } else if (action === "timer") {
    if (!(await ensureAudio(sleep.finished ? [preferredSound()] : undefined)))
      return;
    const minutes = Number(b.dataset.minutes);
    if (sleep.finished) setPreferred();
    sleep.minutes = minutes;
    sleep.finished = false;
    sleep.paused = false;
    sleep.left = minutes ? minutes * 60 : Infinity;
    sleep.deadline = minutes ? Date.now() + minutes * 60000 : null;
    audio.paused = false;
    audio.scheduleSleep(sleep.left);
    audio.apply();
    render();
  } else if (action === "sleep-pause") {
    if (sleep.paused) {
      if (!(await ensureAudio())) return;
      sleep.deadline = Number.isFinite(sleep.left)
        ? Date.now() + sleep.left * 1000
        : null;
      sleep.paused = false;
      audio.paused = false;
      audio.scheduleSleep(sleep.left);
    } else {
      sleep.left = remaining(sleep.deadline);
      sleep.paused = true;
      audio.paused = true;
      audio.setMaster();
    }
    audio.apply();
    render();
  }
});
function restoreSession() {
  session.paused = session.wasPaused;
  audio.paused = session.paused;
  audio.apply();
  render();
  if (!session.paused) narrator.resume();
}
app.addEventListener("input", (e) => {
  if (e.target.matches("[data-volume]")) {
    const i = Number(e.target.dataset.volume);
    state.mix[i] = Number(e.target.value) / 100;
    audio.volume[i] = state.mix[i];
    audio.apply();
    document.querySelector(`#volume-${i}`).textContent = `${e.target.value}%`;
    save();
  }
});
app.addEventListener("change", (e) => {
  if (e.target.id === "language") {
    state.lang = e.target.value;
    save();
    render();
  }
  if (e.target.id === "replay") {
    replay = Number(e.target.value);
    render();
  }
});
setInterval(() => {
  const now = Date.now(),
    audioTime = audio.ctx?.currentTime || 0,
    dt = Math.max(0, audioTime - lastAudioTime);
  lastAudioTime = audioTime;
  const audible = audio.playing;
  if (audible) {
    let credit = dt;
    if (screen === "sleep" && !sleep.paused && sleep.deadline !== null)
      credit = Math.min(
        dt,
        Math.max(0, (sleep.deadline - (now - dt * 1000)) / 1000),
      );
    state.seconds += credit;
  }
  if (
    screen === "session" &&
    !session.paused &&
    audio.ctx?.state === "running"
  ) {
    session.stageElapsed += Math.min(dt, 1);
    session.elapsed = session.stage * 45 + Math.min(45, session.stageElapsed);
    const segmentDone = session.stageElapsed >= 45 && !narrator.busy;
    if (session.stage === 3 && segmentDone) {
      state = complete(state);
      save();
      cancelVoice();
      screen = "completed";
      render(true);
    } else if (segmentDone) {
      session.stage++;
      session.stageElapsed = 0;
      render();
      narrate();
    } else {
      const p = document.querySelector("#session-progress");
      if (p) p.value = session.elapsed;
      const time = document.querySelector("#session-time");
      if (time) time.textContent = clock(session.elapsed);
    }
  }
  if (screen === "sleep" && !sleep.paused && !sleep.finished) {
    const left = remaining(sleep.deadline);
    if (left <= 0) {
      sleep.finished = true;
      endAudio();
      render();
    } else document.querySelector("#sleep-time").textContent = clock(left);
  }
  if (audible && now - lastSave > 5000) {
    save();
    lastSave = now;
  }
}, 250);
document.addEventListener("visibilitychange", () => {
  save();
  if (document.hidden && screen === "session" && !session.paused) {
    session.paused = true;
    audio.paused = true;
    audio.apply();
    narrator.pause();
    render();
  }
});
window.addEventListener("pagehide", save);
render();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
