import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("signIn") };
}

interface SignInPageProps {
  params: Promise<{ locale: string }>;
}

export default async function Page({ params }: SignInPageProps) {
  const { locale } = await params;

  return (
    <main className="flex items-center justify-center">
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
