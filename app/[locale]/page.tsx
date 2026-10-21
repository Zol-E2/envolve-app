// Auth-dependent data fetching means this page must be server-rendered on every request
export const dynamic = "force-dynamic";

import CourseCard from "@/components/CourseCard";
import CourseList from "@/components/CourseList";
import CTA from "@/components/CTA";
import { getAllCourses, getRecentSessions } from "@/lib/actions/course.actions";
import { getSubjectColor } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/navigation";
import { readOnboarding } from "@/lib/onboarding/state";
import PageTour from "@/components/onboarding/PageTour";

const Page = async () => {
  // Independent queries run in parallel instead of one after another
  const [t, courses, recentSessionsCourses, user, locale] = await Promise.all([
    getTranslations("Home"),
    getAllCourses({ limit: 3 }),
    getRecentSessions(10),
    currentUser(),
    getLocale(),
  ]);

  // New users see the short welcome introduction once before the home page
  if (user && !readOnboarding(user.unsafeMetadata).welcomeDone) {
    redirect({ href: "/welcome", locale });
  }

  return (
    <main>
      <PageTour id="home" />
      <h1>{t("popularCourses")}</h1>

      <section className="home-section" data-tour="home-popular">
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
          tour="home-recent"
          emptyMessage={t("recentEmpty")}
          emptyAction={{ href: "/courses", label: t("browseCourses") }}
        />
        <CTA />
      </section>
    </main>
  );
};

export default Page;
