import type { routing } from "@/i18n/routing";
import type messages from "./messages/en.json";

/**
 * Makes next-intl's hooks and helpers type-safe:
 * - t('...') only accepts keys that exist in messages/en.json
 * - Locale is narrowed to "en" | "hu" instead of string
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
