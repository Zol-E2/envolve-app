import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import TrackedLink from "./TrackedLink";

const AUTONYMS: Record<string, string> = { hu: "Magyar", en: "English" };

/**
 * The landing page's header: logo, the page's sections (wide screens only),
 * the language links and Sign in. Plain links, no JavaScript: switching the
 * language opens the other prerendered page.
 */
const LandingHeader = async () => {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Landing.nav")]);

  return (
    <header className="site-header landing-header">
      <div className="site-header-inner">
        <a href={`/${locale}`} className="brand" aria-label={t("home")}>
          <Image
            src="/images/logo.png"
            alt={t("logoAlt")}
            width={480}
            height={92}
            priority
            sizes="120px"
            className="h-auto w-[120px] max-sm:w-[96px] max-[380px]:w-[80px]"
          />
        </a>
        <nav aria-label={t("label")} className="nav-links">
          <a href="#how" className="nav-link">{t("how")}</a>
          <a href="#teachers" className="nav-link">{t("teachers")}</a>
          <a href="#safety" className="nav-link">{t("safety")}</a>
          <a href="#faq" className="nav-link">{t("faq")}</a>
        </nav>
        <div className="header-actions">
          <nav className="lang-toggle" aria-label={t("language")}>
            {routing.locales.map((code) => (
              <a
                key={code}
                href={`/${code}`}
                hrefLang={code}
                lang={code}
                aria-current={code === locale ? "page" : undefined}
                title={AUTONYMS[code]}
              >
                {code.toUpperCase()}
                <span className="sr-only"> ({AUTONYMS[code]})</span>
              </a>
            ))}
          </nav>
          <TrackedLink href={`/${locale}/sign-in`} className="btn-signin" event="landing_sign_in" place="header">
            {t("signIn")}
          </TrackedLink>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
