import { Link } from "@/i18n/navigation";
import Image from "next/image";
import NavItems from "./Navitems";
import LanguageSwitcher from "./LanguageSwitcher";
import NavAuth from "./NavAuth";
import HelpButton from "./onboarding/HelpButton";
import { useTranslations } from "next-intl";

/**
 * Same layout on every page (logo, menu, help, language, account), so
 * nothing moves around between pages. On phones the menu moves to the
 * bottom tab bar and only the logo and the buttons stay up here.
 */
const Navbar = () => {
  // useTranslations also works in (non-async) Server Components
  const t = useTranslations("Navbar");

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label={t("home")}>
          {/* PNG instead of the original SVG (which wraps two large PNGs):
              next/image can then serve a small, sized WebP/AVIF */}
          <Image
            src="/images/logo.png"
            alt={t("logoAlt")}
            width={480}
            height={92}
            priority
            sizes="120px"
            className="h-auto w-[120px] max-sm:w-[96px]"
          />
        </Link>
        <NavItems />
        <div className="header-actions">
          <HelpButton />
          <LanguageSwitcher />
          <NavAuth />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
