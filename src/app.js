import {MILL_LEVELS, driftLevels} from './day2.js';
import {
  BUILD_ORDER, nextChapter,
  load,
  fresh,
  KEY,
  earn,
  reveal,
  revealDue,
  logSleep,
  streak,
  remaining,
  clock,
} from "./state.js";
import { Soundscape, interfaceClickUrl, fogWaterUrl } from "./audio.js";
import {
  Narrator,
  hasNarration,
  hasAnyNarration,
} from "./narration.js";
import { icon, landscape } from "./art.js";
import { buildSessionPlan, phaseAt, stageAt, takeDueCue, timeline, driftStart, guidedEnd, earnAt } from "./session-plan.js";
import { breathFor, breathPattern, bedtimeLevels, OBSTACLES } from "./tuning.js";
import { startMedia, setMediaPlaying, stopMedia, holdWake, releaseWake } from "./media-session.js";
import { copy } from "./content.js";

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
let renderedView = "";
let lastUnlocked = null;
const mixerSheet = document.querySelector("#mix-sheet");
const sceneObserver = window.IntersectionObserver ? new window.IntersectionObserver(entries => {
  for (const entry of entries) entry.target.classList.toggle('scene-idle', !entry.isIntersecting);
}, {threshold: 0}) : null;
let audioBusy = false;
let audioGeneration = 0;
const preferredSound = () => ({ rain: 0, fire: 1, forest: 2 })[state.sound];
let screen = !state.onboarded ? "onboarding" : revealDue(state, new Date(Date.now())) ? "morning" : "village",
  onboarding = 0,
  session = null,
  sleep = null,
  replay = 0,
  storageWarned = false,
  lastAudioTime = 0,
  lastSave = 0,
  moodSaved = false;
const fill = (text, place) => text.replace("{place}", place);
const t = () => copy[state.lang];
const soundIcons = ["rain", "fire", "forest", "wind", "wind", "home"];
const objectSounds = [0, 4, 2, 1];
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
    localStorage.setItem("currentDay", String(state.currentDay));
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
  return `<div class="onboarding"><section class="onboard-art">${landscape(2)}<div class="art-caption"><span>${c.coords}</span><span>${c.artCaption}</span></div></section><section class="onboard-content">${brand()}<div class="step-dots" aria-label="${onboarding + 1} / 3">${[0, 1, 2].map((i) => `<i class="${onboarding === i ? "on" : ""}"></i>`).join("")}</div>${onboarding === 0 ? `<p class="eyebrow">${c.readiness}</p><h1>${c.welcome}</h1><p class="tagline">${c.tag}</p><p class="muted intro">${c.intro}</p>${button(c.enter, "onboard-next")}<span class="privacy">${icon("leaf")}${c.privacy}</span>` : onboarding === 1 ? `<h1>${c.language}</h1><p class="muted">${c.languageNote}</p><div class="language-choices">${["ru", "en"].map((l) => button(`<span>${l === "ru" ? "Русский" : "English"}</span>${state.lang === l ? icon("check") : ""}`, "choose-language", `choice ${state.lang === l ? "chosen" : ""}`, `data-lang="${l}" aria-pressed="${state.lang === l}"`)).join("")}</div>${button(c.next, "onboard-next")}${button(c.back, "onboard-back", "text-button")}` : `<h1>${c.setup}</h1><p class="muted">${c.setupNote}</p><fieldset><legend>${c.q1}</legend><div class="chips">${["stress", "noise", "thoughts"].map((v, i) => button(c.obstacles[i], "obstacle", `chip ${state.obstacle === v ? "chosen" : ""}`, `data-value="${v}" aria-pressed="${state.obstacle === v}"`)).join("")}</div></fieldset><fieldset><legend>${c.q2}</legend><div class="chips">${["rain", "forest", "fire"].map((v, i) => button(c.sounds[i], "preference", `chip ${state.sound === v ? "chosen" : ""}`, `data-value="${v}" aria-pressed="${state.sound === v}"`)).join("")}</div></fieldset>${button(c.finish, "finish-onboarding")}${button(c.back, "onboard-back", "text-button")}`}</section></div>`;
}
function startLabel(c, chapter) {
  return `${icon("play")}${c.start}: ${c.level} ${state.currentDay >= 5 ? BUILD_ORDER.indexOf(chapter)+1 : state.currentDay}`;
}
function lengthPicker(c) {
  return `<div class="length-picker" role="radiogroup" aria-label="${c.lengthLabel}">${["full", "short"].map((m) => `<button class="length-option ${state.length === m ? "chosen" : ""}" role="radio" aria-checked="${state.length === m}" data-action="length" data-length="${m}"><strong>${c.lengths[m]}</strong><small>${c.lengthHints[m]}</small></button>`).join("")}</div>`;
}
function village() {
  const c = t(),
    chapter = state.currentDay >= 5 ? replay : nextChapter(state),
    upcoming = BUILD_ORDER[state.currentDay],
    pendingPlace = state.pending ? (upcoming === undefined ? null : c.objects[upcoming]) : null;
  return `<div class="page village-page"><div class="page-heading"><div><p class="eyebrow">${c.evening}</p><h1>${c.greeting}</h1><p class="muted">${c.villageNote}</p></div><div class="level-badge">${icon("leaf")}<span>${c.level} ${Math.min(4,state.currentDay)}: ${c.objects[chapter]}<small>${pendingPlace ? fill(c.pendingBadge, pendingPlace) : `${state.unlocked.length} / 4 ${c.unlocked}`}</small></span></div></div><section class="village-map day-${state.currentDay} grow-${lastUnlocked}">${landscape(state.currentDay, state.unlocked)}<div class="map-mist" style="opacity:${Math.max(0,.65-state.unlocked.length*.16)}" aria-hidden="true"></div><div class="map-top"><span>VЁSKA</span><span>${icon("moon")} ${state.lang === "ru" ? "Тихий вечер" : "A quiet evening"}</span></div>${[
    0, 1, 2, 3,
  ]
    .filter((i) => state.unlocked.includes(i))
    .map(
      (i) =>
        `<button class="map-object object-${i} ${audio.active[objectSounds[i]] ? "playing" : ""}" data-action="object" data-index="${i}" aria-label="${c.objects[i]} · ${c.objectNotes[i]}" aria-pressed="${audio.active[objectSounds[i]]}">${icon(audio.active[objectSounds[i]] ? "sound" : "play")}<span>${c.objects[i]}</span></button>`,
    )
    .join(
      "",
    )}<p class="map-caption">${pendingPlace ? fill(c.pendingCaption, pendingPlace) : state.pending ? c.earnedNote : state.level === 1 ? c.mapEmpty : c.mapHint}</p></section><div class="village-bottom"><section class="story-card"><div class="story-mark">${icon("moon")}</div><div class="story-copy"><p class="eyebrow">${c.chapter} · 0${Math.min(4,state.currentDay)}</p><h2>${c.chapters[chapter]}</h2><p class="muted">${c.chapterNotes[chapter]}</p><p class="tonight">${icon("leaf")}${c.tonight[state.obstacle]}</p>${lengthPicker(c)}<span class="duration">${c.headphones}</span>${state.level === 5 ? `<label class="replay-label">${c.replay}<select id="replay">${c.chapters.map((v, i) => `<option value="${i}" ${replay === i ? "selected" : ""}>${v}</option>`).join("")}</select></label>` : ""}</div>${button(startLabel(c, chapter), "start", "primary start-button")}</section><div class="village-progress">${BUILD_ORDER.map(i => {const name=c.objects[i]; return `<div class="progress-place ${state.unlocked.includes(i) ? "unlocked" : state.pending && upcoming === i ? "pending" : ""}"><span>${icon(state.unlocked.includes(i) ? "check" : "lock")}</span><small>${name}</small></div>`;}).join("")}</div></div><div class="start-dock">${button(startLabel(c, chapter), "start", "primary")}</div></div>`;
}
function sounds() {
  const c = t();
  return `<div class="page sounds-page"><p class="eyebrow">${c.soundsEyebrow}</p><h1>${c.mixTitle}</h1><p class="muted">${c.mixNote}</p><div class="sound-grid">${c.soundNames.slice(0, state.currentDay >= 2 ? 6 : 4).map((name, i) => `<article class="sound-card sound-${i} ${audio.active[i] ? "enabled" : ""}"><div class="sound-card-top"><div class="sound-art">${icon(soundIcons[i])}</div><button class="switch" role="switch" aria-checked="${audio.active[i]}" aria-label="${name}" data-action="sound" data-index="${i}"><span></span></button></div><h2>${name}</h2><p class="muted">${c.soundNotes[i]}</p><div class="range-row">${icon("volume")}<input type="range" min="0" max="100" value="${Math.round(state.mix[i] * 100)}" data-volume="${i}" aria-label="${name} · ${state.lang === "ru" ? "Громкость" : "Volume"}"><output id="volume-${i}" data-output="${i}">${Math.round(state.mix[i] * 100)}%</output></div></article>`).join("")}</div><div class="mix-footer"><span class="muted">${audio.active.filter(Boolean).length} / ${state.currentDay >= 2 ? 6 : 4} ${c.active}</span>${button(`${icon("moon")}${c.mixSleep}`, "mix-sleep")}${button(c.stop, "stop", "text-button")}</div><p class="footnote">${c.synthetic} ${c.sleepLimit} <a href="./audio-credits.html" target="_blank" rel="noopener noreferrer">${c.soundCredits}</a></p></div>`;
}
function profile() {
  const c = t();
  return `<div class="page profile-page"><p class="eyebrow">${c.profileEyebrow}</p><h1>${c.profileTitle}</h1><p class="muted">${c.profileNote}</p><div class="stats"><div>${icon("sun")}<strong>${streak(state.dates)}</strong><span>${c.streak}</span></div><div>${icon("moon")}<strong>${Math.floor(state.seconds / 60)}</strong><span>${c.minutes}</span></div></div><h2>${c.achievements}</h2><div class="achievements">${BUILD_ORDER.map((i) => [c.objects[i], i]).map(([v, i]) => `<div class="achievement ${state.unlocked.includes(i) ? "earned" : ""}">${icon(state.unlocked.includes(i) ? ["home", "wind", "forest", "fire"][i] : "lock")}<div><strong>${v}</strong><small>${state.unlocked.includes(i) ? c.objectNotes[i] : `${c.locked} ${BUILD_ORDER.indexOf(i) + 1}`}</small></div>${state.unlocked.includes(i) ? icon("check") : ""}</div>`).join("")}</div><h2>${c.settings}</h2><section class="settings"><label>${c.obstacleLabel}<select id="obstacle">${OBSTACLES.map((v, i) => `<option value="${v}" ${state.obstacle === v ? "selected" : ""}>${c.obstacles[i]}</option>`).join("")}</select></label><label>${c.langLabel}<select id="language"><option value="ru" ${state.lang === "ru" ? "selected" : ""}>Русский</option><option value="en" ${state.lang === "en" ? "selected" : ""}>English</option></select></label><div><span>${c.voice}<small>${hasAnyNarration(state.lang) ? c.voiceNote : c.voiceUnavailable}</small></span><button class="switch" role="switch" aria-checked="${Boolean(state.voice && hasAnyNarration(state.lang))}" aria-label="${c.voice}" data-action="voice" ${hasAnyNarration(state.lang) ? "" : "disabled"}><span></span></button></div><div><span>${c.subscription}</span><span class="muted">${c.soon}</span></div><a href="https://github.com/MakeMamaMad/veska/issues/new" target="_blank" rel="noopener noreferrer">${c.feedback}<span>↗</span></a></section><p class="footnote">${icon("lock")}${c.local}</p></div>`;
}
function personalizeMix() {
  if (audio.sessionMode) {
    audio.volume = [...audio.sessionLevels];
    state.mix = [...audio.volume];
  }
  audio.sessionMode = false;
  state.customMix = true;
  if (session?.chapter === 1 || (!session && state.currentDay >= 2)) state.day2MixConfigured = true;
  if (session) session.manualMix = true;
  state.mixEnabled = [...audio.active];
}
function mixerView() {
  const c=t();
  return `<div class="sheet-handle" aria-hidden="true"></div><div class="sheet-heading"><h2 id="mix-title">${state.lang==='ru'?'Атмосфера вечера':'Your evening atmosphere'}</h2>${button(icon('close'),'close-mixer','sheet-close',`aria-label="${state.lang==='ru'?'Закрыть микшер':'Close mixer'}"`)}</div><p class="muted">${c.mixNote}</p><div class="sheet-tracks">${c.soundNames.slice(0, state.currentDay >= 2 ? 6 : 4).map((name,i)=>`<div class="sheet-track"><div class="sheet-track-heading"><span>${icon(soundIcons[i])}${name}</span><button class="switch" role="switch" aria-checked="${audio.active[i]}" aria-label="${name}" data-action="sheet-sound" data-index="${i}"><span></span></button></div><div class="range-row"><input type="range" min="0" max="100" value="${Math.round((audio.sessionMode?audio.sessionLevels[i]:state.mix[i])*100)}" data-volume="${i}" aria-label="${name} · ${state.lang==='ru'?'Громкость':'Volume'}"><output data-output="${i}">${Math.round((audio.sessionMode?audio.sessionLevels[i]:state.mix[i])*100)}%</output></div></div>`).join('')}</div>`;
}
function breathingView() {
  const c=t(), breath=breathFor(session.elapsed, breathPattern(state.obstacle)), labels=t().breathLabels;
  return `<section class="session-screen phase-prelude"><button class="close-button" data-action="exit" aria-label="${c.exit}">${icon('close')}</button><div class="session-top"><p class="eyebrow">${state.lang==='ru'?'ДВЕ МИНУТЫ ДЛЯ СЕБЯ':'TWO MINUTES FOR YOU'}</p><span>${state.lang==='ru'?'Перед историей — немного тишины':'A little quiet before the story'}</span></div><div class="session-content"><div class="breath-stage"><div class="breathing-orb guided-orb" style="transform:scale(${breath.scale})">${icon('leaf')}</div></div><h1 id="breath-label">${labels[breath.name]}</h1><p id="breath-count" class="breath-count">${breath.remaining}</p><p class="muted">${state.lang==='ru'?'Дыши в удобном для тебя ритме. Голос начнётся после практики.':'Breathe at a pace that feels comfortable. The story begins after the practice.'}</p></div><div class="session-controls"><div class="session-time"><span id="session-time">${clock(session.elapsed)}</span><span>02:00</span></div><progress id="session-progress" max="120" value="${session.elapsed}" aria-label="${c.breathe}"></progress><div class="session-buttons">${button(`${icon(session.paused?'play':'pause')}${session.paused?c.resume:c.pause}`,'pause','quiet-button')}${button(c.skipBreath,'skip-breath','text-button')}</div></div><dialog id="exit-dialog"><h2>${c.exit}?</h2><p class="muted">${c.exitNote}</p><div class="dialog-buttons">${button(c.stay,'stay')}${button(c.leave,'leave','quiet-button')}</div></dialog></section>`;
}
function updateBreath() {
  const breath=breathFor(session.elapsed, breathPattern(state.obstacle)), labels=t().breathLabels;
  const orb=document.querySelector('.guided-orb'), label=document.querySelector('#breath-label'), count=document.querySelector('#breath-count');
  if(orb?.style) orb.style.transform=`scale(${breath.scale})`;
  if(label) label.textContent=labels[breath.name];
  if(count) count.textContent=breath.remaining;
}
function sessionView() {
  const c = t();
  if (session.phase === "prelude") return breathingView();
  return `<section class="session-screen phase-${session.phase} details-${session.details}">${landscape(state.currentDay, [...new Set([...state.unlocked, session.chapter])])}<div class="session-shade"></div>${session.stage === 0 ? `<div class="fog-veil ${session.fogCleared ? "cleared" : ""}" aria-hidden="true"></div>` : ""}<button class="close-button" data-action="exit" aria-label="${c.exit}">${icon("close")}</button><div class="session-top"><p class="eyebrow">${c.session}</p><span>${c.chapters[session.chapter]} · elevenlabs.io</span></div><div class="session-content"><div class="breathing-orb ${session.paused ? "paused" : ""}">${icon(session.lit ? "sun" : "leaf")}</div><p class="eyebrow">${session.phase === "breathing" ? c.breathe : session.phase === "story" ? (state.lang === "ru" ? "История · неспешно" : "Story · unhurried") : (state.lang === "ru" ? "Можно просто отдыхать" : "Just rest")}</p>${hasNarration(state.lang, session.chapter) ? "" : `<p class="narration-note">${c.narrationPending}</p>`}<p class="story-text">${session.text || ""}</p>${session.stage === 0 ? button(session.fogCleared ? c.fogDone : c.fog, "fog", "fog-swipe quiet-button", `aria-label="${c.fog}"`) : ""}${session.stage === 1 ? button(session.lit ? c.lightDone : `${icon("sun")}${c.light}`, "light", "lantern", session.lit ? "disabled" : "") : ""}${session.phase === "story" ? `<div class="story-details" aria-hidden="true">${session.details ? (state.lang === "ru" ? ["Тёплые окна", "Лунная тропинка", "Светлячки"] : ["Warm windows", "Moonlit path", "Fireflies"])[session.details - 1] : ""}</div>${button(state.lang === "ru" ? "Открыть тихую деталь" : "Reveal a quiet detail", "detail", "quiet-button", session.details >= 3 ? "disabled" : "")}` : ""}</div><div class="session-controls"><div class="session-time"><span id="session-time">${clock(session.elapsed)}</span><span>${clock(session.tl.total)}</span></div><progress id="session-progress" max="${session.tl.total}" value="${session.elapsed}" aria-label="${c.session}"></progress>${button(`${icon(session.paused ? "play" : "pause")}${session.paused ? c.resume : c.pause}`, "pause", "quiet-button")}</div><dialog id="exit-dialog"><h2>${c.exit}?</h2><p class="muted">${c.exitNote}</p><div class="dialog-buttons">${button(c.stay, "stay")}${button(c.leave, "leave", "quiet-button")}</div></dialog></section>`;
}
function completedView() {
  const c = t();
  return `<section class="completed-screen">${landscape(state.currentDay, state.unlocked)}<div class="completion-card"><div class="complete-check">${icon("check")}</div><p class="eyebrow">${c.objects[session.chapter]}</p><h1>${c.completed}</h1><p class="muted">${c.completedNote}</p>${button(`${icon("moon")}${c.sleep}`, "sleep")}${button(c.home, "home", "text-button")}</div></section>`;
}
function morningView() {
  const c = t(), place = BUILD_ORDER[state.currentDay];
  const scene = place === undefined ? state.unlocked : [...new Set([...state.unlocked, place])];
  return `<section class="morning-screen">${landscape(Math.min(5, state.currentDay + 1), scene)}<div class="morning-light" aria-hidden="true"></div><div class="morning-card"><p class="eyebrow">${c.morningEyebrow}</p><h1>${place === undefined ? c.all : c.morningTitle}</h1>${place === undefined ? "" : `<p class="muted">${fill(c.morningNote, `<strong>${c.objects[place]}</strong>`)}</p>`}<fieldset class="mood"><legend>${c.sleepQuestion}</legend><div class="chips">${c.moods.map((m, i) => button(m, "mood", `chip ${moodSaved === i + 1 ? "chosen" : ""}`, `data-mood="${i + 1}" aria-pressed="${moodSaved === i + 1}"`)).join("")}</div>${moodSaved ? `<p class="mood-thanks">${c.moodThanks}</p>` : ""}</fieldset>${button(c.morningGo, "morning-go")}</div></section>`;
}
function sleepView() {
  const c = t();
  return `<section class="sleep-screen"><button class="close-button" data-action="sleep-exit" aria-label="${c.return}">${icon("close")}</button><div class="sleep-house">${icon("home")}<i></i></div><p class="eyebrow">${sleep.finished ? c.sleepEndNote : c.sleepSub}</p>${session?.completed && !sleep.finished ? `<p class="earned-note">${icon("leaf")}${c.earnedNote}</p>` : ""}<h1>${sleep.finished ? c.sleepEnd : c.sleepTitle}</h1><div class="sleep-time" id="sleep-time" role="timer" aria-label="${c.timer}">${clock(sleep.finished ? 0 : remaining(sleep.deadline))}</div><p class="timer-label">${c.timer}</p><div class="timer-options">${[15, 30, 45, 0].map((v) => button(v === 0 ? "∞" : `${v} ${c.min}`, "timer", `timer-option ${sleep.minutes === v ? "chosen" : ""}`, `data-minutes="${v}" aria-label="${v === 0 ? c.infinity : `${v} ${c.min}`}" aria-pressed="${sleep.minutes === v}"`)).join("")}</div>${button(`${icon(sleep.paused ? "play" : "pause")}${sleep.paused ? c.resume : c.pause}`, "sleep-pause", "sleep-pause", sleep.finished ? "disabled" : "")}<span class="sleep-brand">Vёska</span></section>`;
}
function render(focus = false) {
  sceneObserver?.disconnect();
  const view = screen === "onboarding" ? `${screen}-${onboarding}` : screen;
  if (view !== renderedView) {
    app.classList.remove("screen-enter");
    window.requestAnimationFrame?.(() => app.classList.add("screen-enter"));
    renderedView = view;
  }
  document.documentElement.lang = state.lang;
  document.title = `Vёska — ${t().tag} · elevenlabs.io`;
  app.innerHTML =
    screen === "onboarding"
      ? onBoard()
      : screen === "session"
        ? sessionView()
        : screen === "completed"
          ? completedView()
          : screen === "morning"
          ? morningView()
          : screen === "sleep"
            ? sleepView()
            : `<div class="shell">${header()}${screen === "village" ? village() : screen === "sounds" ? sounds() : profile()}${nav()}</div>`;
  if (screen === "session" || screen === "sleep") app.insertAdjacentHTML?.('beforeend', button(icon('music'), 'open-mixer', 'mixer-fab', `aria-label="${state.lang === 'ru' ? 'Настроить атмосферу' : 'Adjust atmosphere'}" ${screen === 'sleep' && sleep.finished ? 'disabled' : ''}`));
  if (screen === "village") lastUnlocked = null;
  if (sceneObserver) app.querySelectorAll(".landscape").forEach(scene => sceneObserver.observe(scene));
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
  const due = takeDueCue(session.plan, session.nextCue, session.elapsed, session.tl);
  session.nextCue = due.next;
  if (!due.cue) return false;
  session.text = due.cue.text;
  const cue = due.cue;
  if (state.voice && !session.paused)
    narrator.play(audio.ctx, cue.url, audio.output, {...cue, expiresAt: audio.ctx.currentTime + 3})
      .catch(() => toast(t().narrationMissing));
  return true;
}
// The evening counts once the story phase is over, whether or not the listener was
// still awake for the last phrase. The building itself appears in the morning.
function rewardSession() {
  if (session.completed) return;
  session.completed = true;
  state = earn(state, new Date(Date.now()), session.chapter);
  save();
}
function showMorning() {
  if (!state.onboarded || !revealDue(state, new Date(Date.now())) || !["village", "sounds", "profile"].includes(screen)) return false;
  moodSaved = false;
  screen = "morning";
  render(true);
  return true;
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
  const chapter = session?.chapter ?? nextChapter(state);
  audio.startBedtime(preferredSound(), chapter === 1 ? MILL_LEVELS : bedtimeLevels(state.obstacle, preferredSound()));
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
  stopMedia();
  narrator.finishAfter(8);
  audio.fadeOut(8);
  save();
}
async function startSession() {
  const chapter = state.currentDay >= 5 ? replay : nextChapter(state);
  if (!(await ensureAudio([...new Set([...(chapter === 1 ? [4,5] : [preferredSound(),0,2]), ...state.mixEnabled.flatMap((on,i)=>state.customMix && on ? [i] : [])])]))) return;
  cancelVoice();
  const tl = timeline(state.length);
  session = {
    tl,
    chapter: state.currentDay >= 5 ? replay : nextChapter(state),
    stage: stageAt(0, tl),
    elapsed: 0,
    phase: phaseAt(0, tl),
    nextCue: 0,
    completed: false,
    manualMix: state.customMix && (chapter !== 1 || state.day2MixConfigured),
    details: 0,
    text: "",
    paused: false,
    lit: false,
    fogCleared: false,
  };
  session.plan = buildSessionPlan(state.lang, session.chapter, tl);
  startMedia({
    title: t().chapters[session.chapter],
    onPlay: () => mediaPlay(true),
    onPause: () => mediaPlay(false),
    onStop: () => mediaPlay(false),
  });
  holdWake();
  narrate();
  setPreferred();
  if (session.manualMix) {
    audio.sessionMode = false;
    audio.active = [...state.mixEnabled];
    audio.apply();
  }
  audio.preloadEffect(interfaceClickUrl).catch(() => {});
  audio.preloadEffect(fogWaterUrl).catch(() => {});
  screen = "session";
  render(true);
  fullScreen();
}
function startSleep(seconds = 1800) {
  cancelVoice();
  if (audio.fading) setPreferred();
  sleep = {
    minutes: seconds / 60,
    deadline: Date.now() + seconds * 1000,
    finished: false,
    paused: false,
    left: seconds,
  };
  audio.paused = false;
  audio.scheduleSleep(seconds);
  audio.apply();
  screen = "sleep";
  render(true);
  fullScreen();
}
// Lock-screen play/pause reuses the on-screen buttons, so both paths behave the same.
const runAction = (action) => handleAction({ target: { closest: () => ({ dataset: { action } }) }, preventDefault() {} });
function mediaPlay(play) {
  if (screen === "session" && session && session.paused === play) runAction("pause");
  else if (screen === "sleep" && sleep && !sleep.finished && sleep.paused === play) runAction("sleep-pause");
}
function togglePause() {
  session.paused = !session.paused;
  audio.paused = session.paused;
  setMediaPlaying(!session.paused);
  if (session.phase === "drifting" && !session.manualMix) {
    const fraction = Math.min(1, (session.elapsed - driftStart(session.tl)) / session.tl.drift);
    audio.sessionLevels = session.driftFrom.map((v,i)=>v + (driftLevels(session.chapter)[i]-v)*fraction);
    audio.active = audio.sessionLevels.map(v=>v>0);
  }
  audio.apply();
  if (!session.paused && session.phase === "drifting" && !session.manualMix)
    audio.transitionBedtime(driftLevels(session.chapter), Math.max(0,guidedEnd(session.tl)-session.elapsed));
  if (session.paused) narrator.pause();
  else narrator.resume();
  render();
}
async function handleAction(e) {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  e.preventDefault();
  const action = b.dataset.action,
    c = t();
  if (action === "length") {
    state.length = b.dataset.length === "short" ? "short" : "full";
    save();
    render();
    return;
  } else if (action === "skip-breath") {
    if (!session || session.phase !== "prelude") return;
    session.elapsed = session.tl.prelude;
    return;
  } else if (action === "mood") {
    moodSaved = Number(b.dataset.mood);
    state = logSleep(state, moodSaved, new Date(Date.now()));
    save();
    render();
    return;
  } else if (action === "morning-go") {
    const before = state.unlocked;
    state = reveal(state);
    lastUnlocked = state.unlocked.find((i) => !before.includes(i)) ?? null;
    save();
    screen = "village";
    render(true);
    return;
  }
  if (action === "open-mixer") {
    mixerSheet.innerHTML = mixerView();
    mixerSheet.showModal();
  } else if (action === "close-mixer") {
    mixerSheet.close();
    document.querySelector(".mixer-fab")?.focus();
  } else if (action === "sheet-sound") {
    const i=Number(b.dataset.index), enabled=!audio.active[i];
    personalizeMix();
    const pending=audio.setChannel(i,enabled,{preservePause:true});
    b.setAttribute('aria-checked',String(enabled));
    state.mixEnabled=[...audio.active]; save();
    try { await pending; } catch { toast(c.audioError); }
    audio.apply();
    state.mixEnabled=[...audio.active];save();
    b.setAttribute('aria-checked',String(audio.active[i]));
  } else if (action === "onboard-next") {
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
    if (!showMorning()) render(true);
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
    personalizeMix();
    const enabled = !audio.active[i];
    if (audio.fading) cancelVoice();
    const pending = audio.setChannel(i, enabled);
    state.mixEnabled=[...audio.active];save();
    render();
    try {
      await pending;
    } catch {
      toast(c.audioError);
    }
    state.mixEnabled=[...audio.active];save();
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
    if (!session || session.paused || session.lit || session.stage !== 1)
      return;
    session.lit = true;
    audio.playEffect(interfaceClickUrl, 0.4);
    render();
  } else if (action === "detail") {
    if (session?.phase !== "story" || session.paused || session.details >= 3) return;
    session.details++;
    const scene = document.querySelector('.session-screen');
    scene?.classList.add(`details-${session.details}`);
    const detail = document.querySelector('.story-details');
    if (detail) detail.textContent = (state.lang === 'ru' ? ['Тёплые окна', 'Лунная тропинка', 'Светлячки'] : ['Warm windows', 'Moonlit path', 'Fireflies'])[session.details - 1];
    if(session.details >= 3) b.disabled = true;
    audio.playEffect(fogWaterUrl, .04);
  } else if (action === "fog") {
    disperseFog();
  } else if (action === "exit") {
    session.wasPaused = session.paused;
    session.paused = true;
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
      setMediaPlaying(true);
      audio.scheduleSleep(sleep.left);
    } else {
      sleep.left = remaining(sleep.deadline);
      sleep.paused = true;
      audio.paused = true;
      setMediaPlaying(false);
      audio.setMaster();
    }
    audio.apply();
    render();
  }
}
app.addEventListener("click", handleAction);
mixerSheet.addEventListener("click", handleAction);
function restoreSession() {
  session.paused = session.wasPaused;
  render();
}
function disperseFog() {
  if (
    !session ||
    screen !== "session" ||
    session.stage !== 0 ||
    session.paused ||
    session.fogCleared
  )
    return;
  session.fogCleared = true;
  document.querySelector(".fog-veil")?.classList.add("cleared");
  const control = document.querySelector(".fog-swipe");
  if (control) control.textContent = t().fogDone;
  audio.playEffect(fogWaterUrl, 0.08);
}
let fogPointer = null;
app.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".fog-swipe"))
    fogPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
app.addEventListener("pointerup", (e) => {
  const start = fogPointer;
  fogPointer = null;
  if (
    start &&
    start.id === e.pointerId &&
    Math.abs(e.clientX - start.x) >= 44 &&
    Math.abs(e.clientY - start.y) < 60
  )
    disperseFog();
});
app.addEventListener("pointercancel", () => {
  fogPointer = null;
});
function onVolume(e) {
  if (e.target.matches("[data-volume]")) {
    const i = Number(e.target.dataset.volume);
    personalizeMix();
    state.mix[i] = Number(e.target.value) / 100;
    audio.volume[i] = state.mix[i];
    audio.apply();
    document.querySelectorAll?.(`[data-output="${i}"]`).forEach(out=>out.textContent=`${e.target.value}%`);
    document.querySelectorAll?.(`[data-volume="${i}"]`).forEach(input=>{if(input!==e.target) input.value=e.target.value;});
    save();
  }
}
app.addEventListener("input", onVolume);
mixerSheet.addEventListener("input", onVolume);
app.addEventListener("change", (e) => {
  if (e.target.id === "language") {
    state.lang = e.target.value;
    save();
    render();
  }
  if (e.target.id === "obstacle" && OBSTACLES.includes(e.target.value)) {
    state.obstacle = e.target.value;
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
    session.elapsed += dt;
    const phase = phaseAt(session.elapsed, session.tl), stage = stageAt(session.elapsed, session.tl);
    if (session.elapsed >= earnAt(session.tl)) rewardSession();
    const changed = phase !== session.phase || stage !== session.stage;
    if (phase === "ambience") {
      cancelVoice();
      rewardSession();
      releaseWake();
      if (!session.manualMix) audio.transitionBedtime(driftLevels(session.chapter), 2);
      startSleep(Math.max(60, session.tl.total - session.elapsed));
    } else {
      if (phase === "drifting" && session.phase !== phase) {
        releaseWake();
        if (!session.manualMix) {
          session.driftFrom = [...audio.sessionLevels];
          audio.transitionBedtime(driftLevels(session.chapter), Math.max(0, guidedEnd(session.tl) - session.elapsed));
        }
      }
      session.phase = phase;
      session.stage = stage;
      const spoke = narrate();
      if (phase === "prelude") updateBreath();
      if (changed) render();
      else if (spoke) {
        const text = document.querySelector('.story-text');
        if (text) text.textContent = session.text;
      }
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
      mixerSheet.close?.();
      stopMedia();
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
  document.documentElement.classList.toggle('page-hidden', document.hidden);
  save();
  if (!document.hidden) showMorning();
  if (document.hidden && screen === "session" && session.elapsed < driftStart(session.tl) && !session.paused) {
    session.paused = true;
    audio.paused = true;
    setMediaPlaying(false);
    audio.apply();
    narrator.pause();
    render();
  }
});
window.addEventListener("pagehide", save);
render();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
