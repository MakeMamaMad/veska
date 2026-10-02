// Day 2: reviewed recordings. Replace these URLs with your own licensed MP3s.
// Calm story about the old mill, its miller and the gentle night wind.
export const voiceDay2Url = '../assets/narration/ru-day2-mill.mp3';
export const day2VoiceUrls = {ru: voiceDay2Url, en: '../assets/narration/en-day2-mill.mp3'};
// Soft countryside wind, without owls.
export const ambientWindUrl = new URL('../assets/audio/wind.mp3', import.meta.url).href;
// Quiet rhythmic wooden creak; source and processing are in audio-credits.html.
export const ambientMillUrl = new URL('../assets/audio/mill-creak.mp3', import.meta.url).href;
export const MILL_LEVELS = [0, 0, 0, 0, .25, .15];
export const driftLevels = chapter => chapter === 1 ? [0, 0, 0, 0, .38, .15] : [.38, 0, .14, 0, 0, 0];
