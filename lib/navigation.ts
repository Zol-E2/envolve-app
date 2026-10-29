import { BookOpen, CirclePlus, House, UserRound, type LucideIcon } from "lucide-react";

/** Main navigation, shared by the desktop header and the mobile tab bar. */
export const mainNav: readonly {
  /** Translation key in the "Navbar" namespace */
  key: "home" | "courses" | "newCourse" | "profile";
  href: "/" | "/courses" | "/courses/new" | "/my-profile";
  icon: LucideIcon;
}[] = [
  { key: "home", href: "/", icon: House },
  { key: "courses", href: "/courses", icon: BookOpen },
  { key: "newCourse", href: "/courses/new", icon: CirclePlus },
  { key: "profile", href: "/my-profile", icon: UserRound },
];

/**
 * Whether `href` is the section the user is in. `pathname` is locale-stripped
 * (usePathname from @/i18n/navigation). A lesson (/courses/<id>) belongs to
 * "Courses", but the course builder has its own tab.
 */
export const isActive = (href: string, pathname: string) => {
  if (href === "/") return pathname === "/";
  if (href === "/courses") {
    return pathname === "/courses" || (pathname.startsWith("/courses/") && pathname !== "/courses/new");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

/** A lesson in progress: the page hides the tab bar so nothing distracts. */
export const isLessonPath = (pathname: string) =>
  /^\/courses\/[^/]+$/.test(pathname) && pathname !== "/courses/new";
