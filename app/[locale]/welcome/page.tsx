import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import WelcomeFlow from "@/components/onboarding/WelcomeFlow";
import TeacherWelcome from "@/components/onboarding/TeacherWelcome";
import { isTeacher } from "@/lib/roles.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Welcome");
  return { title: t("metaTitle") };
}

// First-visit introduction; the home page redirects here until it is finished.
// Teachers get their own short version (lib/views.ts).
const WelcomePage = async () => (
  <main className="items-center">{(await isTeacher()) ? <TeacherWelcome /> : <WelcomeFlow />}</main>
);

export default WelcomePage;
