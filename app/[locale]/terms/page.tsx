import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalPage from "@/components/LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal");
  return { title: t("terms") };
}

const Page = () => <LegalPage doc="terms" />;

export default Page;
