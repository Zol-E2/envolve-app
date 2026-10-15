// Auth-dependent data fetching means this page must be server-rendered on every request
export const dynamic = "force-dynamic";

import CourseCard from "@/components/CourseCard";
import CourseList from "@/components/CourseList";
import CTA from "@/components/CTA";
import { getAllCourses, getRecentSessions } from "@/lib/actions/course.actions";
import { getSubjectColor } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

const Page = async () => {
  const t = await getTranslations("Home");
  const courses = await getAllCourses({ limit: 3 });
  const recentSessionsCourses = await getRecentSessions(10);

  return (
    <main>
      <h1>{t("popularCourses")}</h1>

      <section className="home-section">
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

      <section className="home-section">
        <CourseList
          title={t("recentCourses")}
          courses={recentSessionsCourses}
          classNames="w-2/3 max-lg:w-full"
        />
        <CTA />
      </section>
    </main>
  );
};

export default Page;
