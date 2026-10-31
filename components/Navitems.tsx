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
  const { view } = useRole();

  return (
    <nav className="nav-links" aria-label={t("mainNav")} data-tour="nav-menu">
      {navFor(view).map((item) => (
        <Link
          href={item.href}
          key={item.key}
          className="nav-link"
          data-tour={item.key === "classes" ? "nav-classes" : undefined}
          aria-current={isActive(item, pathname) ? "page" : undefined}
        >
          <item.icon className="size-5" aria-hidden />
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
};

export default NavItems;
