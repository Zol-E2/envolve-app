export const dynamic = "force-dynamic";

import { getAllCourses } from "@/lib/actions/course.actions";
import CourseCard from "@/components/CourseCard";
import { getSubjectColor } from "@/lib/utils";
import SearchInput from "@/components/Searchinput";
import SubjectFilter from "@/components/SubjectFilter";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageTour from "@/components/onboarding/PageTour";

const Courses = async ({ searchParams }: SearchParams) => {
  const t = await getTranslations("Courses");
  const filters = await searchParams;
  const subject = filters.subject ? filters.subject : "";
  const topic = filters.topic ? filters.topic : "";

  const courses = await getAllCourses({ subject, topic });

  return (
    <main>
      <PageTour id="courses" />
      <section className="flex justify-between gap-4 max-sm:flex-col">
        <h1>{t("title")}</h1>
        <div className="flex gap-4">
          <SearchInput />
          <SubjectFilter />
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
