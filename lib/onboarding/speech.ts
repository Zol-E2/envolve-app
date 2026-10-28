import { useSyncExternalStore } from "react";
import manifest from "./speech-manifest.json";
import { speechId } from "./speechText.mjs";

/**
 * Read-aloud for tour bubbles and the welcome screen.
 *
 * Texts recorded with the tutor's ElevenLabs voice (npm run speech:generate,
 * files in public/speech/) play from those files. Anything without a
 * recording, e.g. a tip edited since the last recording, falls back to the
 * browser's built-in speech synthesis. When neither is available for the
 * current language the read-aloud button is hidden, instead of reading
 * Hungarian text with an English voice.
 */

const recordings = new Map<string, Set<string>>(
  Object.entries(manifest.files as Record<string, string[]>).map(([locale, ids]) => [
    locale,
    new Set(ids),
  ])
);

const recordingUrl = (text: string, locale: string) => {
  const id = speechId(text);
  return recordings.get(locale)?.has(id) ? `/speech/${locale}/${id}.mp3` : null;
};

const hasRecordings = (locale: string) => (recordings.get(locale)?.size ?? 0) > 0;

// --- browser speech synthesis (fallback) -----------------------------------

const isSupported = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

// Android reports "hu_HU", desktop browsers "hu-HU"
const normalize = (lang: string) => lang.toLowerCase().replace("_", "-");

const findVoice = (locale: string) =>
  isSupported()
    ? window.speechSynthesis
        .getVoices()
        .find((voice) => normalize(voice.lang).startsWith(locale))
    : undefined;

const speakWithBrowser = (text: string, locale: string) => {
  const voice = findVoice(locale);
  if (!voice) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  // Slightly slower than default for easier listening
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
};

// --- public API ------------------------------------------------------------

let player: HTMLAudioElement | null = null;

/**
 * True when `text` (or, without `text`, anything in `locale`) can be read
 * aloud: from a recording, or with a browser voice for that language.
 */
export const canSpeak = (locale: string, text?: string) =>
  (text ? recordingUrl(text, locale) !== null : hasRecordings(locale)) ||
  findVoice(locale) !== undefined;

/** Voices load asynchronously; `onChange` fires once they are available. */
export const subscribeToVoices = (onChange: () => void) => {
  if (!isSupported()) return () => {};
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () =>
    window.speechSynthesis.removeEventListener("voiceschanged", onChange);
};

export const stopSpeaking = () => {
  if (player) {
    player.pause();
    player = null;
  }
  if (isSupported()) window.speechSynthesis.cancel();
};

export const speak = (text: string, locale: string) => {
  stopSpeaking();
  const url = recordingUrl(text, locale);
  if (!url) {
    speakWithBrowser(text, locale);
    return;
  }
  const audio = new Audio(url);
  player = audio;
  // A file that fails to load or play (offline, blocked) still gets read
  audio.play().catch(() => {
    if (player === audio) speakWithBrowser(text, locale);
  });
};

/** True when the device can read text aloud in `locale`. */
export const useCanSpeak = (locale: string) =>
  useSyncExternalStore(
    subscribeToVoices,
    () => canSpeak(locale),
    () => false
  );
