import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS, huHU } from "@clerk/localizations";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import TourProvider from "@/components/onboarding/TourProvider";

// Headings: the eNvolve brand face
const heading = Bricolage_Grotesque({
  variable: "--font-heading",
  // latin-ext carries the Hungarian ő and ű glyphs
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Running text: designed by the Braille Institute for low-vision readers,
// with clearly different shapes for easily confused letters (I l 1, b d)
const body = Atkinson_Hyperlegible_Next({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the tab bar and header reach under the iPhone notch and home bar;
  // the CSS keeps content clear of them with env(safe-area-inset-*)
  viewportFit: "cover",
  themeColor: "#ffffff",
};

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({
  params,
}: Omit<LocaleLayoutProps, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    // Pages set only their own name; the template adds " · eNvolve"
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Guard: reject unknown locales (e.g. /xx/...) with a 404
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Messages resolved server-side by i18n/request.ts, handed to client components via context
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${heading.variable} ${body.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <NextIntlClientProvider messages={messages}>
          <ClerkProvider
            appearance={{
              variables: {
                colorPrimary: "#c7461a",
                colorText: "#1e2b3a",
                colorBackground: "#ffffff",
                borderRadius: "14px",
                fontFamily: "var(--font-body), system-ui, sans-serif",
                fontSize: "17px",
              },
            }}
            // Clerk's own UI (sign-in, user menu, pricing) in the active language
            localization={locale === "hu" ? huHU : enUS}
            // Keep Clerk redirects (SignInButton, sign-out) inside the active locale
            signInUrl={`/${locale}/sign-in`}
            afterSignOutUrl={`/${locale}`}
          >
            {/* Page tours need the signed-in user, so they live inside Clerk */}
            <TourProvider>
              <Navbar />
              {children}
              <Footer />
              <MobileTabBar />
            </TourProvider>
          </ClerkProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
