import type { Alignment, Side } from "driver.js";
import type { TourId } from "./state";

export interface TourStep {
  /** Message key under Tour.<tourId>.<key> (title + text) */
  key: string;
  /** Value of the element's data-tour attribute; omitted = centred bubble */
  target?: string;
  /**
   * When the target is missing, show the bubble centred instead of skipping
   * the step (for elements that load late, e.g. Clerk's sign-in box)
   */
  centerIfMissing?: boolean;
  side?: Side;
  align?: Alignment;
}

/**
 * Tips for every page except the welcome screen, which explains itself.
 * Kept short on purpose (at most five steps, one control per step) so they
 * stay manageable for students with ADHD or autism. Steps whose element is
 * missing or hidden (e.g. on mobile, or an empty list) are skipped.
 */
export const TOUR_STEPS: Record<TourId, readonly TourStep[]> = {
  home: [
    { key: "intro" },
    { key: "popular", target: "home-popular" },
    { key: "create", target: "home-create" },
    { key: "recent", target: "home-recent" },
    { key: "help", target: "nav-help", side: "bottom", align: "end" },
  ],
  courses: [
    { key: "search", target: "courses-search" },
    { key: "filter", target: "courses-filter" },
    { key: "language", target: "card-language" },
    { key: "bookmark", target: "card-bookmark" },
    { key: "launch", target: "card-launch" },
  ],
  newCourse: [
    { key: "intro" },
    { key: "steps", target: "course-steps" },
    { key: "read", target: "course-read", side: "top" },
    { key: "next", target: "course-next", side: "top", align: "end" },
  ],
  lesson: [
    { key: "tutor", target: "lesson-tutor" },
    { key: "start", target: "lesson-start" },
    { key: "status", target: "lesson-status" },
    { key: "mute", target: "lesson-mute" },
    { key: "transcript", target: "lesson-transcript", side: "top" },
  ],
  profile: [
    { key: "stats", target: "profile-stats" },
    { key: "bookmarks", target: "profile-bookmarks" },
    { key: "recent", target: "profile-recent" },
    { key: "courses", target: "profile-courses" },
    { key: "account", target: "nav-account", side: "bottom", align: "end" },
  ],
  // Plans page is not live yet. To enable: add "subscription" to TOUR_IDS,
  // uncomment this and the TOUR_AUTO_START entry, and on the page render
  // <PageTour id="subscription" /> with data-tour="subscription-plans"
  // around <PricingTable />. The texts already exist under Tour.subscription.
  // subscription: [
  //   { key: "intro" },
  //   { key: "plans", target: "subscription-plans", centerIfMissing: true, side: "top" },
  // ],
  signIn: [
    { key: "box", target: "signin-box", centerIfMissing: true },
    { key: "language", target: "nav-language", side: "bottom", align: "end" },
  ],
  notFound: [{ key: "home", target: "notfound-home" }],
  legal: [{ key: "intro" }],
};

/**
 * Whether the page's tips open by themselves on the first visit. A missing
 * page should just get the student back on track, so its tip waits for "?".
 */
export const TOUR_AUTO_START: Record<TourId, boolean> = {
  home: true,
  courses: true,
  newCourse: true,
  lesson: true,
  profile: true,
  // subscription: true,
  signIn: true,
  notFound: false,
  // Legal pages are read on purpose; the tip only explains where to get help
  legal: false,
};
