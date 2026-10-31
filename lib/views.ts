import { canTeach, type AppRole } from "./roles";

/**
 * Who sees what: the one place that describes each view of the app.
 *
 * Rule for this project (see AGENTS.md): every role sees only what it needs
 * for its own job. Where two roles do different things on a page, each gets
 * its own version instead of one page with parts hidden. The menu, the
 * proxy (proxy.ts) and the pages all read this file, so adding a page or a role
 * (a school admin may come later) means extending it here first.
 *
 * Imported by proxy.ts: keep it free of React and icons.
 */

export type View = "student" | "teacher" | "admin";

/** Admins (the people running eNvolve) have their own view, not the teacher's */
export const viewFor = (role: AppRole | null): View =>
  role === "admin" ? "admin" : canTeach(role) ? "teacher" : "student";

export type NavKey =
  | "home"
  | "overview"
  | "classes"
  | "library"
  | "courses"
  | "newCourse"
  | "profile"
  | "users"
  | "moderation";

export interface NavItem {
  /** Translation key in the "Navbar" namespace, and the icon in lib/navigation.ts */
  key: NavKey;
  href: "/" | "/classes" | "/library" | "/courses" | "/courses/new" | "/my-profile" | "/admin/users" | "/admin/courses";
  /** Locale-stripped paths where this item is the current section */
  match: RegExp;
}

export const NAV: Record<View, readonly NavItem[]> = {
  student: [
    { key: "home", href: "/", match: /^\/$/ },
    // A lesson (/courses/<id>) belongs to Courses; the builder has its own tab
    { key: "courses", href: "/courses", match: /^\/courses(\/(?!new$)[^/]+)?$/ },
    { key: "newCourse", href: "/courses/new", match: /^\/courses\/new$/ },
    { key: "profile", href: "/my-profile", match: /^\/my-profile/ },
  ],
  teacher: [
    { key: "overview", href: "/", match: /^\/$/ },
    { key: "classes", href: "/classes", match: /^\/classes/ },
    // Previews (/courses/<id>) and building a course for a class live here too
    { key: "library", href: "/library", match: /^\/(library|courses)(\/|$)/ },
    { key: "profile", href: "/my-profile", match: /^\/my-profile/ },
  ],
  admin: [
    // The full admin log opens from the overview
    { key: "overview", href: "/", match: /^\/(admin\/log)?$/ },
    { key: "users", href: "/admin/users", match: /^\/admin\/users/ },
    // Course previews (/courses/<id>) belong to the course check
    { key: "moderation", href: "/admin/courses", match: /^\/(admin\/courses|courses\/[^/]+)/ },
    { key: "profile", href: "/my-profile", match: /^\/my-profile/ },
  ],
};

/**
 * Pages that belong to another view, and where to send someone who opens
 * them anyway (an old link, a typed address). Paths are locale-stripped.
 */
const REDIRECTS: Record<View, readonly { from: RegExp; to: string }[]> = {
  student: [
    { from: /^\/classes(\/|$)/, to: "/" },
    { from: /^\/library(\/|$)/, to: "/courses" },
    { from: /^\/admin(\/|$)/, to: "/" },
  ],
  teacher: [
    // The student library becomes the teacher's Kurzustár
    { from: /^\/courses\/?$/, to: "/library" },
    // Joining classes is for students
    { from: /^\/join(\/|$)/, to: "/classes" },
    { from: /^\/admin(\/|$)/, to: "/" },
  ],
  admin: [
    // Admins run eNvolve: no classes, no student pages, no welcome screen.
    // They see any course through the course check and its preview
    { from: /^\/admin\/?$/, to: "/" },
    { from: /^\/(classes|library|join|welcome)(\/|$)/, to: "/" },
    { from: /^\/courses(\/new)?\/?$/, to: "/admin/courses" },
  ],
};

/** Where this view should go instead of `path`, or null when the page is theirs */
export const redirectFor = (view: View, path: string) =>
  REDIRECTS[view].find((rule) => rule.from.test(path))?.to ?? null;
