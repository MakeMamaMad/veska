import { stories } from './content.js';

// Stories without a recording yet are shown as text at a calm reading pace.
// The shape matches voice-cues.js (url: null means "nothing to play"), so the
// session timeline treats written and recorded stories the same way.
const CHARS_PER_SECOND = { ru: 9.5, en: 12 };
export function textCues(lang, chapter) {
  const paragraphs = stories[lang]?.[chapter];
  if (!paragraphs) return null;
  return paragraphs.map((paragraph) => {
    const sentences = paragraph.match(/[^.!?…]+[.!?…]+/g).map((text) => text.trim());
    let at = 0;
    const out = sentences.map((text) => {
      const duration = Math.max(1.6, text.length / CHARS_PER_SECOND[lang]);
      const cue = { text, offset: +at.toFixed(3), duration: +duration.toFixed(3) };
      at += duration + 0.5;
      return cue;
    });
    return { url: null, duration: +at.toFixed(3), sentences: out };
  });
}
