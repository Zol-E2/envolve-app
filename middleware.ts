import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { withPrimaryLanguage } from "@/i18n/primaryLanguage";

const intlMiddleware = createMiddleware(routing);

// Routes that must never be locale-prefixed: API handlers and the Sentry
// tunnel (`tunnelRoute: "/monitoring"` in next.config.ts). Clerk still runs
// on them so auth() keeps working inside route handlers.
const skipIntl = createRouteMatcher(["/api(.*)", "/trpc(.*)", "/monitoring(.*)"]);

/**
 * Middleware chain: Clerk wraps next-intl.
 *
 * 1. clerkMiddleware refreshes the auth session and exposes auth() downstream.
 * 2. Inside its handler we return the next-intl response (locale detection,
 *    redirect to /{locale}/..., NEXT_LOCALE cookie). Clerk merges its own
 *    headers into that response, so locale redirects are never clobbered.
 *    withPrimaryLanguage() keeps Hungarian as the default for new visitors
 *    (see FOLLOW_BROWSER_LANGUAGE in i18n/routing.ts).
 */
export default clerkMiddleware((_auth, request) => {
  if (skipIntl(request)) return;
  return intlMiddleware(withPrimaryLanguage(request));
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|mp3|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
