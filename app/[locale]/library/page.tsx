import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";
import { Plus } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { getAllCourses, getUserCourses } from "@/lib/actions/course.actions";
import { getTeacherClasses } from "@/lib/actions/teacher.actions";
import { isTeacher } from "@/lib/roles.server";
import SearchInput from "@/components/Searchinput";
import SubjectFilter from "@/components/SubjectFilter";
import LibraryCourseCard from "@/components/teacher/LibraryCourseCard";
import PageTour from "@/components/onboarding/PageTour";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Library");
  return { title: t("title") };
}

/**
 * The teacher's Kurzustár: every course with "Kiosztom" and "Kipróbálom",
 * the teacher's own courses first. Replaces the student library for teachers.
 */
const LibraryPage = async ({ searchParams }: SearchParams) => {
  const { userId } = await auth();
  const locale = await getLocale();
  if (!userId || !(await isTeacher())) redirect({ href: "/", locale });

  const filters = await searchParams;
  const subject = typeof filters.subject === "string" ? filters.subject : "";
  const topic = typeof filters.topic === "string" ? filters.topic : "";
  const searching = !!(subject || topic);

  const [t, courses, own, classes] = await Promise.all([
    getTranslations("Library"),
    getAllCourses({ subject, topic, limit: 30 }),
    searching ? Promise.resolve([]) : getUserCourses(userId!),
    getTeacherClasses().catch(() => []),
  ]);
  const picker = classes.map((c) => ({ id: c.id, name: c.name }));
  const ownIds = new Set(own.map((c) => c.id));
  const others = courses.filter((c) => !ownIds.has(c.id));

  return (
    <main>
      <PageTour id="library" />
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1>{t("title")}</h1>
            <p className="text-lg text-muted-foreground max-sm:text-base">{t("lead")}</p>
          </div>
          <Link href="/courses/new" className="btn-primary" data-tour="library-new">
            <Plus className="size-5" aria-hidden />
            {t("newCourse")}
          </Link>
        </div>
        <div className="flex gap-3 max-sm:flex-col" data-tour="library-search">
          <div className="flex-1">
            <SearchInput />
          </div>
          <div className="sm:w-64">
            <SubjectFilter />
          </div>
        </div>
      </section>

      {own.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="own-title" data-tour="library-own">
          <h2 id="own-title" className="text-2xl font-bold max-sm:text-xl">{t("ownTitle")}</h2>
          <div className="courses-grid">
            {own.map((course) => (
              <LibraryCourseCard key={course.id} course={course} classes={picker} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="all-title">
        <h2 id="all-title" className="text-2xl font-bold max-sm:text-xl">
          {searching ? t("resultsTitle") : t("allTitle")}
        </h2>
        {others.length === 0 ? (
          <p className="list-empty">{searching ? t("emptySearch") : t("emptyAll")}</p>
        ) : (
          <div className="courses-grid">
            {others.map((course, index) => (
              <LibraryCourseCard key={course.id} course={course} classes={picker} first={index === 0} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default LibraryPage;
