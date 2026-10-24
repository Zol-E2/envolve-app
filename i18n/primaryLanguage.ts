import { NextRequest } from "next/server";
import { FOLLOW_BROWSER_LANGUAGE, routing } from "@/i18n/routing";

/**
 * Makes the next-intl middleware ignore the browser's Accept-Language header
 * while FOLLOW_BROWSER_LANGUAGE is off. The locale is then taken from the URL,
 * then from the saved choice (cookie), and otherwise falls back to Hungarian.
 */
export const withPrimaryLanguage = (request: NextRequest): NextRequest => {
  if (FOLLOW_BROWSER_LANGUAGE) return request;

  const headers = new Headers(request.headers);
  headers.set("accept-language", routing.defaultLocale);
  return new NextRequest(request, { headers });
};
