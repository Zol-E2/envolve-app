import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** /sitemap.xml: the public pages, each with its other language */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}/hu${path}`,
    changeFrequency: "monthly",
    priority,
    alternates: { languages: { hu: `${SITE_URL}/hu${path}`, en: `${SITE_URL}/en${path}` } },
  });
  return [page("", 1), page("/privacy", 0.3), page("/terms", 0.3)];
}
