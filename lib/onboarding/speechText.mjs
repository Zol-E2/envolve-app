/**
 * Read-aloud texts, shared by the app (lib/onboarding/speech.ts) and the
 * recording script (scripts/generate-speech.mjs), so both build exactly the
 * same sentence and the same file name for it.
 * Plain JavaScript on purpose: the script runs with plain Node.
 */

/** Which Welcome texts each welcome card reads aloud, in this order */
export const WELCOME_SPEECH = {
  intro: ["title", "text", "point1", "point2", "point3"],
  lesson: ["title", "step1", "step2", "step3", "note"],
  mic: ["title", "text"],
  ready: ["title", "text"],
};

/** Which TeacherWelcome texts each card of the teacher's welcome reads aloud */
export const TEACHER_WELCOME_SPEECH = {
  intro: ["title", "text"],
  steps: ["title", "step1", "step2", "step3"],
  ready: ["title", "text"],
};

/** What "Read aloud" reads on each step of the course builder (CourseForm keys) */
export const COURSE_FORM_SPEECH = {
  subject: ["subjectQuestion", "subjectHint"],
  topic: ["topicQuestion", "topicHint"],
  voice: ["voiceQuestion", "voiceHint"],
  length: ["lengthQuestion", "lengthHint"],
};

/**
 * Joins a title and its sentences into one text to read, adding a full stop
 * where a part has no closing punctuation, so the voice pauses between them.
 * @param {readonly string[]} parts
 * @returns {string}
 */
export const joinForSpeech = (parts) => {
  const clean = parts.map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
  return clean
    .map((part, i) =>
      i < clean.length - 1 && !/[.!?:…]$/.test(part) ? `${part}.` : part
    )
    .join(" ");
};

// cyrb53: small, fast, stable string hash (the same in Node and browsers)
const hash = (text) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/**
 * File name (without .mp3) of a recorded text. It changes whenever the text
 * changes, so an edited tip never plays an outdated recording.
 * @param {string} text
 * @returns {string}
 */
export const speechId = (text) =>
  hash(text.replace(/\s+/g, " ").trim()).toString(36);
