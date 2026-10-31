import type { Metadata } from "next";
import CourseForm from "@/components/CourseForm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import PageTour from "@/components/onboarding/PageTour";
import { isTeacher } from "@/lib/roles.server";

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

  // Teachers build courses for their classes, in their own wording; after
  // saving they land on the preview, with "Kiosztom" right there
  if (await isTeacher()) {
    return (
      <main className="max-w-3xl">
        <PageTour id="newCourseTeacher" />
        <section className="flex flex-col gap-1">
          <h1>{t("teacherTitle")}</h1>
          <p className="text-lg text-muted-foreground max-sm:text-base">{t("teacherLead")}</p>
        </section>
        <CourseForm audience="teacher" />
      </main>
    );
  }

  return (
    <main className="max-w-3xl">
      <PageTour id="newCourse" />
      <h1>{t("title")}</h1>
      <CourseForm />
    </main>
  );
};

export default NewCourse;
