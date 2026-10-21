import CourseForm from "@/components/CourseForm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import PageTour from "@/components/onboarding/PageTour";

const NewCourse = async () => {
  const { userId } = await auth();
  const locale = await getLocale();
  if (!userId) {
    redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("CourseBuilder");

  return (
    <main className="lg:w-1/3 md:w-2/3 items-center justify-center">
      <PageTour id="newCourse" />
      <article className="w-full gap-4 flex flex-col">
        <h1>{t("title")}</h1>

        <CourseForm />
      </article>
    </main>
  );
};

export default NewCourse;
