import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * /robots.txt. Everything except the landing page (/hu, /en: what signed-out
 * visitors see there), the sign-in page, the privacy policy and the terms
 * needs an account, so search engines may only read those; the API and the
 * Sentry tunnel are off limits. "$" ends the address, so /hu is allowed but
 * /hu/courses is not.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/$",
          "/hu$",
          "/en$",
          "/hu/sign-in",
          "/en/sign-in",
          "/hu/privacy",
          "/en/privacy",
          "/hu/terms",
          "/en/terms",
        ],
        disallow: ["/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
