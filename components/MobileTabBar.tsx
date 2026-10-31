"use client";
import { SignedIn } from "@clerk/nextjs";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { isActive, isLessonPath, navFor } from "@/lib/navigation";
import { useRole } from "@/lib/useRole";

/**
 * Bottom navigation on phones, within thumb reach. Hidden during a lesson
 * and on the welcome screen, where it would only distract, and for visitors
 * who are not signed in (they can only reach the sign-in and legal pages).
 */
const MobileTabBar = () => {
  const pathname = usePathname();
  const t = useTranslations("Navbar");
  const { isTeacher } = useRole();
  const items = navFor(isTeacher);

  if (pathname === "/welcome" || isLessonPath(pathname)) return null;

  return (
    <SignedIn>
      <div className="tabbar-spacer" aria-hidden />
      <nav
        className="tabbar"
        aria-label={t("mainNav")}
        data-tour="nav-tabbar"
        // Four tabs for students, five for teachers
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ key, href, icon: Icon }) => (
          <Link
            href={href}
            key={key}
            className="tab"
            data-tour={key === "classes" ? "tab-classes" : undefined}
            aria-current={isActive(href, pathname) ? "page" : undefined}
          >
            <Icon className="size-[26px]" aria-hidden />
            {t(key)}
          </Link>
        ))}
      </nav>
    </SignedIn>
  );
};

export default MobileTabBar;
