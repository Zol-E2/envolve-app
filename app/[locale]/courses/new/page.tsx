import type { Metadata } from "next";
import CourseForm from "@/components/CourseForm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import PageTour from "@/components/onboarding/PageTour";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("newCourse") };
}

const NewCourse = async () => {
  const { userId } = await auth();
  const locale = await getLocale();
  if (!userId) {
    redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("CourseBuilder");

  return (
    <main className="max-w-3xl">
      <PageTour id="newCourse" />
      <h1>{t("title")}</h1>
      <CourseForm />
    </main>
  );
};

export default NewCourse;
