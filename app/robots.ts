import type { MetadataRoute } from "next";

/**
 * /robots.txt. Everything except the sign-in page, the privacy policy and
 * the terms needs an account, so search engines may only read those; the
 * API and the Sentry tunnel are off limits. Without this file bots were sent
 * to the sign-in page for /robots.txt.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/hu/sign-in", "/en/sign-in", "/hu/privacy", "/en/privacy", "/hu/terms", "/en/terms"],
        disallow: ["/"],
      },
    ],
  };
}
