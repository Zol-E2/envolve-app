"use client";
import { SignedIn } from "@clerk/nextjs";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { isActive, isLessonPath, mainNav } from "@/lib/navigation";

/**
 * Bottom navigation on phones, within thumb reach. Hidden during a lesson
 * and on the welcome screen, where it would only distract, and for visitors
 * who are not signed in (they can only reach the sign-in and legal pages).
 */
const MobileTabBar = () => {
  const pathname = usePathname();
  const t = useTranslations("Navbar");

  if (pathname === "/welcome" || isLessonPath(pathname)) return null;

  return (
    <SignedIn>
      <div className="tabbar-spacer" aria-hidden />
      <nav className="tabbar" aria-label={t("mainNav")}>
        {mainNav.map(({ key, href, icon: Icon }) => (
          <Link
            href={href}
            key={key}
            className="tab"
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
