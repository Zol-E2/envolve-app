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
 *
 * Rule for this project: every part of a page a student can see or use gets
 * its own tip, written in short, plain sentences, and recorded for read-aloud
 * (npm run speech:generate). Our users are children with learning
 * difficulties, so nothing should be left for them to guess.
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
    { key: "howto", target: "home-howto" },
    { key: "classes", target: "home-classes" },
    { key: "join", target: "home-join" },
    { key: "create", target: "home-create" },
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
    { key: "tutor", target: "lesson-tutor" },
    { key: "status", target: "lesson-status" },
    { key: "timer", target: "lesson-timer" },
    { key: "start", target: "lesson-start", side: "top" },
    { key: "mute", target: "lesson-mute", side: "top" },
    { key: "stuck", target: "lesson-stuck" },
    { key: "transcript", target: "lesson-transcript", side: "top" },
    { key: "exit", target: "lesson-exit", side: "top" },
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
  classes: [
    { key: "intro" },
    { key: "new", target: "classes-new" },
    { key: "list", target: "classes-list" },
    { key: "menu", target: "nav-classes", side: "bottom" },
    { key: "menuMobile", target: "tab-classes", side: "top" },
  ],
  // One tour for all three tabs: steps for the other tabs are skipped
  classDetail: [
    { key: "intro" },
    { key: "code", target: "class-code" },
    { key: "link", target: "class-code-link", align: "end" },
    { key: "renew", target: "class-code-renew", align: "end" },
    { key: "assign", target: "class-assign", align: "end" },
    { key: "tabs", target: "class-tabs" },
    { key: "picker", target: "class-picker" },
    { key: "stuck", target: "class-stuck" },
    { key: "status", target: "class-status", side: "top" },
    { key: "students", target: "class-students" },
    { key: "support", target: "class-support", align: "end" },
    { key: "assignments", target: "class-assignments" },
  ],
  assign: [
    { key: "intro" },
    { key: "course", target: "assign-course" },
    { key: "who", target: "assign-who" },
    { key: "due", target: "assign-due" },
    { key: "message", target: "assign-message" },
    { key: "preview", target: "assign-preview" },
    { key: "submit", target: "assign-submit", side: "top", align: "end" },
  ],
  join: [
    { key: "intro" },
    { key: "code", target: "join-code" },
    { key: "classes", target: "join-classes", side: "top" },
  ],
  // Teacher view: short, adult wording (lib/views.ts)
  teacherHome: [
    { key: "intro" },
    { key: "actions", target: "teacher-actions" },
    { key: "stuck", target: "teacher-stuck" },
    { key: "deadlines", target: "teacher-deadlines" },
    { key: "classes", target: "teacher-classes" },
    { key: "menu", target: "nav-menu", side: "bottom" },
    { key: "menuMobile", target: "nav-tabbar", side: "top" },
    { key: "help", target: "nav-help", side: "bottom", align: "end" },
  ],
  library: [
    { key: "intro" },
    { key: "new", target: "library-new", align: "end" },
    { key: "search", target: "library-search" },
    { key: "own", target: "library-own" },
    { key: "assign", target: "library-assign" },
    { key: "try", target: "library-try" },
  ],
  lessonPreview: [
    { key: "intro" },
    { key: "banner", target: "preview-banner" },
    { key: "assign", target: "preview-assign", align: "end" },
    { key: "start", target: "lesson-start", side: "top" },
    { key: "exit", target: "lesson-exit", side: "top" },
  ],
  teacherProfile: [
    { key: "intro" },
    { key: "name", target: "teacher-profile-name" },
    { key: "account", target: "teacher-profile-account" },
    { key: "comfort", target: "profile-comfort" },
  ],
  newCourseTeacher: [
    { key: "intro" },
    { key: "steps", target: "course-steps" },
    { key: "read", target: "course-read", side: "top" },
    { key: "next", target: "course-next", side: "top", align: "end" },
  ],
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
  classes: true,
  classDetail: true,
  assign: true,
  join: true,
  teacherHome: true,
  library: true,
  lessonPreview: true,
  teacherProfile: true,
  newCourseTeacher: true,
};
