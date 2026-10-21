"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition, type ChangeEvent } from "react";

/**
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

  const onSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value as typeof locale;
    // Keep the query string (?subject=…&topic=…) so search filters survive the switch
    const search = window.location.search;
    startTransition(() => {
      router.replace(`${pathname}${search}`, { locale: nextLocale });
    });
  };

  return (
    <select
      data-tour="nav-language"
      aria-label={t("label")}
      value={locale}
      onChange={onSelectChange}
      disabled={isPending}
      className="border border-black rounded-4xl px-3 py-2 text-sm font-semibold bg-white cursor-pointer disabled:opacity-50"
    >
      {routing.locales.map((code) => (
        <option key={code} value={code}>
          {t(code)}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
