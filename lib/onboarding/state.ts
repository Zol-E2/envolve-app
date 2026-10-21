/**
 * Onboarding progress: whether the user has seen the welcome screen and
 * which page tours they have finished or closed.
 *
 * Signed-in users: stored in Clerk `unsafeMetadata.onboarding`, so progress
 * follows the account to every device (and does not leak between students
 * sharing one school computer). Signed-out visitors: stored in localStorage.
 *
 * This file is imported by both server and client code, so it must not touch
 * `window` at import time.
 */

export const TOUR_IDS = [
  "home",
  "courses",
  "newCourse",
  "lesson",
  "profile",
  // "subscription": the plans page is not live yet; re-enable its tips
  // (here, in tours.ts and on the page) once billing launches
  "signIn",
  "notFound",
] as const;
export type TourId = (typeof TOUR_IDS)[number];

export interface OnboardingState {
  welcomeDone?: boolean;
  tours?: Partial<Record<TourId, boolean>>;
}

/** Reads the onboarding block from Clerk metadata, tolerating anything stored there. */
export const readOnboarding = (metadata: unknown): OnboardingState => {
  if (!metadata || typeof metadata !== "object") return {};
  const value = (metadata as Record<string, unknown>).onboarding;
  if (!value || typeof value !== "object") return {};

  const { welcomeDone, tours } = value as Record<string, unknown>;
  const seenTours: Partial<Record<TourId, boolean>> = {};
  if (tours && typeof tours === "object") {
    for (const id of TOUR_IDS) {
      if ((tours as Record<string, unknown>)[id] === true) seenTours[id] = true;
    }
  }
  return { ...(welcomeDone === true && { welcomeDone: true }), tours: seenTours };
};

/** Returns a copy of `metadata` with `patch` merged into its onboarding block. */
export const mergeOnboarding = (
  metadata: Record<string, unknown> | undefined,
  patch: OnboardingState
): Record<string, unknown> => {
  const current = readOnboarding(metadata);
  return {
    ...(metadata ?? {}),
    onboarding: {
      ...current,
      ...patch,
      tours: { ...current.tours, ...patch.tours },
    },
  };
};

const LOCAL_KEY = "envolve:onboarding";

/** Signed-out progress. Storage can be blocked (private mode), so failures read as "nothing seen". */
export const readLocalOnboarding = (): OnboardingState => {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? readOnboarding({ onboarding: JSON.parse(raw) }) : {};
  } catch {
    return {};
  }
};

export const writeLocalOnboarding = (patch: OnboardingState) => {
  try {
    const next = mergeOnboarding({ onboarding: readLocalOnboarding() }, patch);
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next.onboarding));
  } catch {
    // Storage unavailable: the tour simply shows again next time
  }
};
