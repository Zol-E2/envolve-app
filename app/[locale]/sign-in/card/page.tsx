import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CardSignIn from "@/components/auth/CardSignIn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CardSignIn");
  return { title: t("title") };
}

// Signing in with a login card (QR code). A static route, so it wins over
// Clerk's [[...sign-in]] catch-all next to it; public in proxy.ts
const CardSignInPage = () => (
  <main className="items-center">
    <CardSignIn />
  </main>
);

export default CardSignInPage;
