import type { Alignment, Side } from "driver.js";
import type { TourId } from "./state";

export interface TourStep {
  /** Message key under Tour.<tourId>.<key> (title + text) */
  key: string;
  /** Value of the element's data-tour attribute; omitted = centred bubble */
  target?: string;
  /**
   * When the target is missing, show the bubble centred instead of skipping
   * the step (for elements that load late)
   */
  centerIfMissing?: boolean;
  side?: Side;
  align?: Alignment;
}

/**
 * Tips for every page except the welcome screen, which explains itself.
 *
 * Rules for this project (AGENTS.md):
 * - Tips never open by themselves. They run when the user presses "Segítség"
 *   (Help). The only exception is one bubble on the home page, once per
 *   account, that points at the Help button (helpIntro / helpIntroAdult).
 * - Students: every part of a page they can see or use gets its own tip,
 *   in short, plain sentences. Our users are children with learning
 *   difficulties, so nothing should be left for them to guess.
 * - Teachers and admins: only what really needs explaining (statuses, what
 *   students see, privacy). Obvious buttons get no tip.
 * - The menu and the Help button are explained on the home page only.
 * - Every tip is recorded for read-aloud (npm run speech:generate).
 *
 * One control per step keeps each bubble small. Steps whose element is
 * missing or hidden (e.g. the desktop menu on a phone, or an empty list) are
 * skipped, so phone and desktop can each have their own step.
 */
export const TOUR_STEPS: Record<TourId, readonly TourStep[]> = {
  home: [
    { key: "intro" },
    { key: "task", target: "home-task" },
    { key: "continue", target: "home-continue" },
    { key: "recent", target: "home-recent" },
    { key: "week", target: "home-week" },
    { key: "create", target: "home-create" },
    { key: "classes", target: "home-classes" },
    { key: "join", target: "home-join" },
    { key: "howto", target: "home-howto" },
    { key: "popular", target: "home-popular", side: "top" },
    { key: "menu", target: "nav-menu", side: "bottom" },
    { key: "menuMobile", target: "nav-tabbar", side: "top" },
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
    { key: "intro" },
    { key: "reviewNote", target: "lesson-review-note" },
    { key: "tutor", target: "lesson-tutor" },
    { key: "status", target: "lesson-status" },
    { key: "timer", target: "lesson-timer" },
    { key: "start", target: "lesson-start", side: "top" },
    { key: "mute", target: "lesson-mute", side: "top" },
    { key: "stuck", target: "lesson-stuck" },
    { key: "transcript", target: "lesson-transcript", side: "top" },
    { key: "exit", target: "lesson-exit", side: "top" },
    { key: "rules", target: "lesson-rules" },
    { key: "report", target: "lesson-report", side: "top", align: "end" },
  ],
  profile: [
    { key: "intro" },
    { key: "stats", target: "profile-stats" },
    { key: "comfort", target: "profile-comfort" },
    { key: "size", target: "comfort-size" },
    { key: "reading", target: "comfort-reading" },
    { key: "read", target: "comfort-read" },
    { key: "motion", target: "comfort-motion" },
    { key: "sample", target: "comfort-sample" },
    { key: "reset", target: "comfort-reset", align: "end" },
    { key: "classes", target: "profile-classes" },
    { key: "bookmarks", target: "profile-bookmarks" },
    { key: "recent", target: "profile-recent" },
    { key: "courses", target: "profile-courses" },
    { key: "account", target: "nav-account", side: "bottom", align: "end" },
  ],
  // Plans page is not live yet. To enable: add "subscription" to TOUR_IDS,
  // uncomment this, and on the page render <PageTour id="subscription" />
  // with data-tour="subscription-plans" around <PricingTable />. The texts
  // already exist under Tour.subscription.
  // subscription: [
  //   { key: "intro" },
  //   { key: "plans", target: "subscription-plans", centerIfMissing: true, side: "top" },
  // ],
  notFound: [{ key: "home", target: "notfound-home" }],
  legal: [{ key: "intro" }],
  // Teacher pages: only what needs explaining
  classes: [{ key: "intro" }],
  classDetail: [
    { key: "code", target: "class-code" },
    { key: "link", target: "class-code-link", align: "end" },
    { key: "renew", target: "class-code-renew", align: "end" },
    { key: "status", target: "class-status", side: "top" },
    { key: "support", target: "class-support", align: "end" },
  ],
  assign: [{ key: "preview", target: "assign-preview" }],
  join: [
    { key: "intro" },
    { key: "code", target: "join-code" },
    { key: "classes", target: "join-classes", side: "top" },
  ],
  teacherHome: [
    { key: "alerts", target: "teacher-alerts" },
    { key: "stuck", target: "teacher-stuck" },
    { key: "classes", target: "teacher-classes" },
    { key: "menu", target: "nav-menu", side: "bottom" },
    { key: "menuMobile", target: "nav-tabbar", side: "top" },
    { key: "help", target: "nav-help", side: "bottom", align: "end" },
  ],
  library: [
    { key: "assign", target: "library-assign" },
    { key: "try", target: "library-try" },
  ],
  lessonPreview: [
    { key: "banner", target: "preview-banner" },
    { key: "reviewNote", target: "lesson-review-note" },
    { key: "report", target: "lesson-report", side: "top", align: "end" },
  ],
  teacherProfile: [
    { key: "name", target: "teacher-profile-name" },
    { key: "comfort", target: "profile-comfort" },
  ],
  newCourseTeacher: [{ key: "intro" }],
  // Admin pages: only what needs explaining
  adminHome: [
    { key: "attention", target: "admin-attention" },
    { key: "numbers", target: "admin-numbers" },
    { key: "menu", target: "nav-menu", side: "bottom" },
    { key: "menuMobile", target: "nav-tabbar", side: "top" },
    { key: "help", target: "nav-help", side: "bottom", align: "end" },
  ],
  adminUsers: [{ key: "role", target: "admin-user-role", align: "end" }],
  adminCourses: [
    { key: "intro" },
    { key: "reports", target: "admin-course-reports" },
    { key: "actions", target: "admin-course-actions", side: "top" },
  ],
  adminLog: [{ key: "intro" }],
  adminProfile: [{ key: "security", target: "admin-profile-2fa" }],
  adminPreview: [{ key: "bar", target: "admin-course-bar" }],
  adminSafety: [
    { key: "intro" },
    { key: "numbers", target: "admin-safety-numbers" },
    { key: "list", target: "admin-safety-list" },
  ],
  // The one bubble that opens by itself: on the home page, once per account
  helpIntro: [{ key: "help", target: "nav-help", side: "bottom", align: "end" }],
  helpIntroAdult: [{ key: "help", target: "nav-help", side: "bottom", align: "end" }],
};
