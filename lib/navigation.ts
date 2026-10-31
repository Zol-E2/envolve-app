import {
  BookOpen,
  CirclePlus,
  House,
  LayoutDashboard,
  Library,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { NAV, type NavItem, type NavKey, type View } from "./views";

/** Menu icons; which items each view gets is decided in lib/views.ts */
export const NAV_ICONS: Record<NavKey, LucideIcon> = {
  home: House,
  overview: LayoutDashboard,
  classes: UsersRound,
  library: Library,
  courses: BookOpen,
  newCourse: CirclePlus,
  profile: UserRound,
};

/** The menu items of a view, shared by the desktop header and the mobile tab bar */
export const navFor = (view: View) =>
  NAV[view].map((item) => ({ ...item, icon: NAV_ICONS[item.key] }));

/** Whether `item` is the section the user is in (`pathname` is locale-stripped) */
export const isActive = (item: NavItem, pathname: string) => item.match.test(pathname);

/** A lesson in progress: the page hides the tab bar so nothing distracts. */
export const isLessonPath = (pathname: string) =>
  /^\/courses\/[^/]+$/.test(pathname) && pathname !== "/courses/new";
