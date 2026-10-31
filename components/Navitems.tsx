"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { isActive, navFor } from "@/lib/navigation";
import { useRole } from "@/lib/useRole";

/** Desktop navigation in the header; phones use <MobileTabBar> instead. */
const NavItems = () => {
  // Locale-stripped pathname ("/courses" even on /hu/courses) so active-link matching keeps working
  const pathname = usePathname();
  const t = useTranslations("Navbar");
  const { isTeacher } = useRole();

  return (
    <nav className="nav-links" aria-label={t("mainNav")} data-tour="nav-menu">
      {navFor(isTeacher).map(({ key, href, icon: Icon }) => (
        <Link
          href={href}
          key={key}
          className="nav-link"
          data-tour={key === "classes" ? "nav-classes" : undefined}
          aria-current={isActive(href, pathname) ? "page" : undefined}
        >
          <Icon className="size-5" aria-hidden />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
};

export default NavItems;
