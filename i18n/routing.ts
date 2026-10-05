import { defineRouting } from "next-intl/routing";

/**
 * Single source of truth for every locale-related setting.
 * All other i18n files (request.ts, navigation.ts, middleware.ts) import from here,
 * so adding a new language is a one-line change.
 */
export const routing = defineRouting({
  locales: ["en", "hu"],
  defaultLocale: "en",
});
