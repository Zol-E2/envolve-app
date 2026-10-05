import { SignIn } from "@clerk/nextjs";

interface SignInPageProps {
  params: Promise<{ locale: string }>;
}

export default async function Page({ params }: SignInPageProps) {
  const { locale } = await params;

  return (
    <main className="flex items-center justify-center">
      {/* Clerk uses path-based routing for its multi-step flow (/sign-in/factor-one, ...),
          so it must know the locale-prefixed path this page is mounted on. */}
      <SignIn path={`/${locale}/sign-in`} />
    </main>
  );
}
