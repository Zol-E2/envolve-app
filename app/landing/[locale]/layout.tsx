import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import "../../globals.css";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing } from "@/i18n/routing";
import { COMFORT_BOOT_SCRIPT } from "@/lib/comfort";
import { SITE_URL } from "@/lib/site";

/*
 * The landing page's own root layout: signed-out visitors of /hu and /en see
 * this page (the proxy rewrites to it, lib/views.ts). It is built once at
 * deploy time and served from the CDN: no Clerk, no session, no menu, so it
 * loads fast for teachers and schools finding eNvolve for the first time.
 * Going to the sign-in page from here is a normal full page load.
 */

const heading = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const body = Atkinson_Hyperlegible_Next({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf6ee",
};

// Only these two pages exist, both prerendered
export const dynamicParams = false;
export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

type LandingLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({
  params,
}: Omit<LandingLayoutProps, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Landing" });

  return {
    metadataBase: new URL(SITE_URL),
    title: t("metaTitle"),
    description: t("metaDescription"),
    // The page is shown at /hu and /en, never at /landing/…
    alternates: {
      canonical: `/${locale}`,
      languages: { hu: "/hu", en: "/en", "x-default": "/hu" },
    },
    openGraph: {
      type: "website",
      url: `/${locale}`,
      siteName: "eNvolve",
      title: t("metaTitle"),
      description: t("metaDescription"),
      locale: locale === "hu" ? "hu_HU" : "en_GB",
      images: [{ url: `/images/landing/og-${locale}.png`, width: 1200, height: 630 }],
    },
    robots: { index: true, follow: true },
  };
}

export default async function LandingLayout({ children, params }: LandingLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* "Így kényelmes nekem" saved on this device (larger text, less motion) applies here too */}
        <script dangerouslySetInnerHTML={{ __html: COMFORT_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        {/* Anonymous page-view counts and loading-speed measurements, no cookies */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
