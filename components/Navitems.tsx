"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { isActive, mainNav } from "@/lib/navigation";

/** Desktop navigation in the header; phones use <MobileTabBar> instead. */
const NavItems = () => {
  // Locale-stripped pathname ("/courses" even on /hu/courses) so active-link matching keeps working
  const pathname = usePathname();
  const t = useTranslations("Navbar");

  return (
    <nav className="nav-links" aria-label={t("mainNav")}>
      {mainNav.map(({ key, href, icon: Icon }) => (
        <Link
          href={href}
          key={key}
          className="nav-link"
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
