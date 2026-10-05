"use client";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

// `key` doubles as the translation key inside the "Navbar" namespace
const navItems = [
  { key: "home", link: "/" },
  { key: "courses", link: "/courses" },
  { key: "profile", link: "/my-profile" },
] as const;

const NavItems = () => {
  // Locale-stripped pathname ("/courses" even on /hu/courses) so active-link matching keeps working
  const pathname = usePathname();
  const t = useTranslations("Navbar");

  return (
    <nav className="flex items-center gap-4">
      {navItems.map(({ key, link }) => (
        <Link
          href={link}
          key={key}
          className={cn(pathname === link && "text-primary font-semibold")}
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  );
};

export default NavItems;
