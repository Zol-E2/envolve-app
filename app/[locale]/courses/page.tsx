import type { Metadata } from "next";
export const dynamic = "force-dynamic";

import { getAllCourses } from "@/lib/actions/course.actions";
import CourseCard from "@/components/CourseCard";
import { getSubjectColor } from "@/lib/utils";
import SearchInput from "@/components/Searchinput";
import SubjectFilter from "@/components/SubjectFilter";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageTour from "@/components/onboarding/PageTour";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("courses") };
}

const Courses = async ({ searchParams }: SearchParams) => {
  // The library is only for signed-in students (the database allows nothing else)
  const { userId } = await auth();
  if (!userId) redirect({ href: "/sign-in", locale: await getLocale() });

  const t = await getTranslations("Courses");
  const filters = await searchParams;
  const subject = filters.subject ? filters.subject : "";
  const topic = filters.topic ? filters.topic : "";

  const courses = await getAllCourses({ subject, topic });

  return (
    <main>
      <PageTour id="courses" />
      <section className="flex flex-col gap-4">
        <h1>{t("title")}</h1>
        <div className="flex gap-3 max-sm:flex-col">
          <div className="flex-1">
            <SearchInput />
          </div>
          <div className="sm:w-72">
            <SubjectFilter />
          </div>
        </div>
      </section>
      {courses.length === 0 && (
        <div className="list-empty">
          <p>{subject || topic ? t("emptySearch") : t("emptyAll")}</p>
          <Link href="/courses/new" className="btn-primary w-fit">
            {t("createFirst")}
          </Link>
        </div>
      )}
      <section className="courses-grid">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            id={course.id}
            name={course.name}
            topic={course.topic}
            subject={course.subject}
            duration={course.duration}
            bookmarked={course.bookmarked}
            language={course.language}
            color={getSubjectColor(course.subject)}
          />
        ))}
      </section>
    </main>
  );
};

export default Courses;
