/**
 * The host of Clerk's Frontend API (where clerk-js and the sign-in data come
 * from), read from the publishable key: "pk_test_" or "pk_live_" followed by
 * base64 of "<host>$". The root layout preconnects to it so the sign-in box
 * starts loading while the page's own files are still downloading. Works the
 * same for the development and the production instance.
 */
export function clerkFrontendHost(publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY): string | null {
  const match = publishableKey?.match(/^pk_(?:test|live)_(.+)$/);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const host = decoded.endsWith("$") ? decoded.slice(0, -1) : "";
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}
