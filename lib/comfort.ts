/**
 * "Így kényelmes nekem" (Make it comfortable): the student's own display
 * settings, chosen on the profile page.
 *
 * Signed-in students: stored in Clerk `unsafeMetadata.comfort`, so the
 * settings follow the account to every device and never carry over to the
 * next student on a shared school computer. Every device also keeps a copy
 * in localStorage, which a tiny script in the page <head> applies before the
 * first paint (COMFORT_BOOT_SCRIPT), so a page never flashes in small text
 * first. Signed-out visitors only have the local copy.
 *
 * Imported by server and client code: must not touch `window` at import time.
 */

export const TEXT_SIZES = ["normal", "large", "larger"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export interface ComfortSettings {
  /** normal = 18px running text, large = 112.5%, larger = 125% */
  textSize: TextSize;
  /** Wider letter and word spacing, and the reading face for headings too */
  readingFont: boolean;
  /** Read tips and step explanations aloud as soon as they appear */
  autoRead: boolean;
  /** Switch animations off (on top of the device's own setting) */
  lessMotion: boolean;
}

export const DEFAULT_COMFORT: ComfortSettings = {
  textSize: "normal",
  readingFont: false,
  autoRead: false,
  lessMotion: false,
};

/** Reads settings from anything stored (Clerk metadata, localStorage), falling back to the defaults. */
export const readComfort = (value: unknown): ComfortSettings => {
  if (!value || typeof value !== "object") return { ...DEFAULT_COMFORT };
  const stored = value as Record<string, unknown>;
  return {
    textSize: (TEXT_SIZES as readonly unknown[]).includes(stored.textSize)
      ? (stored.textSize as TextSize)
      : DEFAULT_COMFORT.textSize,
    readingFont: stored.readingFont === true,
    autoRead: stored.autoRead === true,
    lessMotion: stored.lessMotion === true,
  };
};

/** The comfort block inside Clerk metadata, or null when the student never saved one. */
export const readAccountComfort = (metadata: unknown): ComfortSettings | null => {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).comfort;
  return value && typeof value === "object" ? readComfort(value) : null;
};

export const COMFORT_STORAGE_KEY = "envolve:comfort";

export const readLocalComfort = (): ComfortSettings => {
  try {
    return readComfort(JSON.parse(window.localStorage.getItem(COMFORT_STORAGE_KEY) ?? "null"));
  } catch {
    return { ...DEFAULT_COMFORT };
  }
};

export const writeLocalComfort = (settings: ComfortSettings) => {
  try {
    window.localStorage.setItem(COMFORT_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage blocked (private mode): the settings last until the tab closes
  }
};

/** Puts the settings on <html> as data attributes; globals.css does the rest. */
export const applyComfort = (settings: ComfortSettings) => {
  const root = document.documentElement;
  if (settings.textSize === "normal") delete root.dataset.textSize;
  else root.dataset.textSize = settings.textSize;
  if (settings.readingFont) root.dataset.readingFont = "on";
  else delete root.dataset.readingFont;
  if (settings.lessMotion) root.dataset.motion = "reduce";
  else delete root.dataset.motion;
};

/** True when the student or their device asked for less motion. */
export const prefersLessMotion = () =>
  document.documentElement.dataset.motion === "reduce" ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Runs in <head> before the page paints: the same as applyComfort(), from
 * the local copy. Plain ES5 on purpose, and it never throws.
 */
export const COMFORT_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  COMFORT_STORAGE_KEY
)})||"null");if(!s)return;var d=document.documentElement;if(s.textSize==="large"||s.textSize==="larger")d.setAttribute("data-text-size",s.textSize);if(s.readingFont===true)d.setAttribute("data-reading-font","on");if(s.lessMotion===true)d.setAttribute("data-motion","reduce")}catch(e){}})();`;
