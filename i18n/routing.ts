import { defineRouting } from "next-intl/routing";

/**
 * Single source of truth for every locale-related setting.
 * All other i18n files (request.ts, navigation.ts, middleware.ts) import from here,
 * so adding a new language is a one-line change.
 */
export const routing = defineRouting({
  locales: ["hu", "en"],
  defaultLocale: "hu",
});

/**
 * Hungarian is the primary language for now: visitors who have not picked a
 * language get Hungarian whatever their browser is set to. A language chosen
 * with the switcher is still remembered (NEXT_LOCALE cookie).
 * Set to true to greet new visitors in their browser's language instead.
 */
export const FOLLOW_BROWSER_LANGUAGE = false;
