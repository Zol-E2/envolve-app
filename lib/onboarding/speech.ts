import { useSyncExternalStore } from "react";

/**
 * Read-aloud for tour bubbles and the welcome screen, using the browser's
 * built-in speech synthesis (free, works offline). Most Windows, macOS and
 * Android devices ship a Hungarian voice, but not all: when the device has no
 * voice for the current language the read-aloud button is simply hidden,
 * instead of reading Hungarian text with an English voice.
 */

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

export const canSpeak = (locale: string) => findVoice(locale) !== undefined;

/** Voices load asynchronously; `onChange` fires once they are available. */
export const subscribeToVoices = (onChange: () => void) => {
  if (!isSupported()) return () => {};
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () =>
    window.speechSynthesis.removeEventListener("voiceschanged", onChange);
};

export const speak = (text: string, locale: string) => {
  const voice = findVoice(locale);
  if (!voice) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  // Slightly slower than default for easier listening
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
  if (isSupported()) window.speechSynthesis.cancel();
};

/** True when the device can read text aloud in `locale`. */
export const useCanSpeak = (locale: string) =>
  useSyncExternalStore(
    subscribeToVoices,
    () => canSpeak(locale),
    () => false
  );
