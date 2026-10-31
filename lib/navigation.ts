import { BookOpen, CirclePlus, House, UserRound, UsersRound, type LucideIcon } from "lucide-react";

/** Main navigation, shared by the desktop header and the mobile tab bar. */
export const mainNav: readonly {
  /** Translation key in the "Navbar" namespace */
  key: "home" | "classes" | "courses" | "newCourse" | "profile";
  href: "/" | "/classes" | "/courses" | "/courses/new" | "/my-profile";
  icon: LucideIcon;
  /** Only shown to teachers (the pages check the role again) */
  teacherOnly?: boolean;
}[] = [
  { key: "home", href: "/", icon: House },
  { key: "classes", href: "/classes", icon: UsersRound, teacherOnly: true },
  { key: "courses", href: "/courses", icon: BookOpen },
  { key: "newCourse", href: "/courses/new", icon: CirclePlus },
  { key: "profile", href: "/my-profile", icon: UserRound },
];

/** The menu items this user sees */
export const navFor = (isTeacher: boolean) => mainNav.filter((item) => isTeacher || !item.teacherOnly);

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
