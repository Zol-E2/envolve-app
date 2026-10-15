import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS, huHU } from "@clerk/localizations";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  // latin-ext carries the Hungarian ő and ű glyphs
  subsets: ["latin", "latin-ext"],
});

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
    title: t("title"),
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
        className={`${bricolage.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <NextIntlClientProvider messages={messages}>
          <ClerkProvider
            appearance={{ variables: { colorPrimary: "#fe5933" } }}
            // Clerk's own UI (sign-in, user menu, pricing) in the active language
            localization={locale === "hu" ? huHU : enUS}
            // Keep Clerk redirects (SignInButton, sign-out) inside the active locale
            signInUrl={`/${locale}/sign-in`}
            afterSignOutUrl={`/${locale}`}
          >
            <Navbar />
            {children}
          </ClerkProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
