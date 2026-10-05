import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

/**
 * Locale-aware drop-in replacements for next/link and next/navigation.
 * Write href="/courses" and the active locale prefix is added for you
 * (→ "/en/courses"). usePathname() returns the locale-stripped path.
 */
const navigation = createNavigation(routing);

export const { Link, usePathname, useRouter, getPathname } = navigation;

// Explicit annotation is required for TypeScript to honour the `never` return
// type in control-flow analysis, so `if (!user) redirect(...)` narrows `user`
// afterwards exactly like Next.js' own redirect().
export const redirect: typeof navigation.redirect = navigation.redirect;
