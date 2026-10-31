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

/**
 * Extra claims in the Clerk session token (Clerk dashboard → Sessions →
 * Customize session token): {"app_role": "{{user.public_metadata.role}}"}.
 * Read by the middleware, server code and the Supabase policies. Named
 * app_role because "role" is already used by Supabase.
 */
declare global {
  interface CustomJwtSessionClaims {
    app_role?: string | null;
  }
}
