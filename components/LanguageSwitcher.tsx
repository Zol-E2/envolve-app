"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition } from "react";

// Each language named in itself, so a student who cannot read the current
// interface language still recognises their own
const AUTONYMS: Record<string, string> = { hu: "Magyar", en: "English" };

/**
 * Two buttons (HU | EN) instead of a dropdown: one tap, both choices always
 * visible, and the same look on every device.
 *
 * Swaps the locale prefix of the current URL in place (/en/courses → /hu/courses).
 * usePathname() from @/i18n/navigation is already locale-stripped, so we can
 * hand it straight back to router.replace() together with the new locale.
 */
const LanguageSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("LanguageSwitcher");
  const [isPending, startTransition] = useTransition();

  const switchTo = (nextLocale: (typeof routing.locales)[number]) => {
    if (nextLocale === locale) return;
    // Keep the query string (?subject=…&topic=…) so search filters survive the switch
    const search = window.location.search;
    startTransition(() => {
      router.replace(`${pathname}${search}`, { locale: nextLocale });
    });
  };

  return (
    <div className="lang-toggle" role="group" aria-label={t("label")} data-tour="nav-language">
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={code === locale}
          disabled={isPending}
          onClick={() => switchTo(code)}
          title={AUTONYMS[code]}
        >
          {t(code)}
          <span className="sr-only"> ({AUTONYMS[code]})</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
