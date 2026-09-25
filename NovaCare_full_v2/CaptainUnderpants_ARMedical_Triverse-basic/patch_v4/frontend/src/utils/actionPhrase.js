// src/utils/actionPhrase.js
// Turns a full step title (e.g. "Position mouthpiece", "Create a complete
// seal", "Bring the strip to the sample") into a short, camera-overlay-sized
// imperative phrase (2-3 words). Used everywhere an AR anchor needs to show
// "what to do here" instead of just an object/body-part name — shared by
// RealPerceptionService (Level B) and AnchoredGuideService (Level C) so both
// perception paths label their overlay the same way.
const STOPWORDS = new Set(['the', 'a', 'an', 'your', 'to', 'at', 'on', 'in', 'of', 'for']);

export function shortActionPhrase(title, maxWords = 3) {
  if (!title) return '';
  const words = title.trim().split(/\s+/);
  const kept = [];
  for (const w of words) {
    if (kept.length >= maxWords) break;
    if (kept.length > 0 && STOPWORDS.has(w.toLowerCase())) continue; // keep a leading stopword-ish verb if that's genuinely the first word
    kept.push(w);
  }
  return kept.join(' ');
}
