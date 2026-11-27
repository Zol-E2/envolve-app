import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { QrCode } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("signIn") };
}

interface SignInPageProps {
  params: Promise<{ locale: string }>;
}

export default async function Page({ params }: SignInPageProps) {
  const { locale } = await params;
  const t = await getTranslations("CardSignIn");

  return (
    <main className="flex items-center justify-center">
      {/* Students with a login card from their teacher: one big button, no
          typing. Everyone else (and the card's username and password) uses
          the Clerk box below. No tips on this page (AGENTS.md). */}
      <div className="sign-in-card-choice">
        {/* A full page load (not <Link>): the card page's own permission
            policy lets it use the camera (next.config.ts) */}
        <a href={`/${locale}/sign-in/card`} className="btn-primary sign-in-card-button">
          <QrCode className="size-7" aria-hidden />
          {t("button")}
        </a>
        <p className="text-center text-base text-muted-foreground">{t("orBelow")}</p>
      </div>
      {/* Clerk uses path-based routing for its multi-step flow (/sign-in/factor-one, ...),
          so it must know the locale-prefixed path this page is mounted on. */}
      {/* Holds the sign-in box's place while Clerk loads it, so the footer
          does not jump down when it appears (layout shift) */}
      <div className="sign-in-slot">
        <SignIn path={`/${locale}/sign-in`} />
      </div>
    </main>
  );
}
