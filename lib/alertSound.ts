"use client";

/**
 * A short, soft two-note chime for new lesson alerts, made with the Web
 * Audio API (no sound file to load). Browsers only allow sound after the
 * user has interacted with the page; until then it stays silent.
 */
const KEY = "envolve:alertSound";

export const alertSoundOn = () => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
};

export const setAlertSound = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // private window: the choice lasts for this page only
  }
};

let context: AudioContext | null = null;

export const playAlertChime = () => {
  if (!alertSoundOn()) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    context ??= new Ctx();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    [660, 880].forEach((frequency, i) => {
      const osc = context!.createOscillator();
      const gain = context!.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      const start = now + i * 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain).connect(context!.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  } catch {
    // no sound is better than a broken page
  }
};
