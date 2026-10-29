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
          <Image
            src="/images/logo.svg"
            alt={t("logoAlt")}
            width={110}
            height={77}
            priority
            className="h-auto w-[110px] max-sm:w-[84px]"
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
