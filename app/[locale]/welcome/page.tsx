import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import WelcomeFlow from "@/components/onboarding/WelcomeFlow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Welcome");
  return { title: t("metaTitle") };
}

// First-visit introduction; the home page redirects here until it is finished
const WelcomePage = () => (
  <main className="items-center">
    <WelcomeFlow />
  </main>
);

export default WelcomePage;
