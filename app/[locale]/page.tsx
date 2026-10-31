// Auth-dependent data fetching means this page must be server-rendered on every request
export const dynamic = "force-dynamic";

import { Check, Clock, Play } from "lucide-react";
import CourseCard from "@/components/CourseCard";
import CourseList from "@/components/CourseList";
import CTA from "@/components/CTA";
import SubjectTile from "@/components/SubjectTile";
import { getAllCourses, getLessonTimes, getUserSessions } from "@/lib/actions/course.actions";
import { getSubjectColor, getSubjectLabel } from "@/lib/utils";
import { activeDays, currentWeek } from "@/lib/week";
import { getLocale, getTranslations } from "next-intl/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Link, redirect } from "@/i18n/navigation";
import { readOnboarding } from "@/lib/onboarding/state";
import { cn } from "@/lib/utils";
import PageTour from "@/components/onboarding/PageTour";
import TaskCard from "@/components/classes/TaskCard";
import { getMyTasks } from "@/lib/actions/class.actions";

const WEEKDAYS = ["d0", "d1", "d2", "d3", "d4", "d5", "d6"] as const;

/**
 * Home: the student's own starting point. One big button first (continue
 * the last lesson, or start one), then their recent lessons and a gentle
 * week overview, and only then other courses to explore.
 */
const Page = async () => {
  const { userId } = await auth();
  const locale = await getLocale();
  if (!userId) redirect({ href: "/sign-in", locale });

  const week = currentWeek();
  // Independent queries run in parallel instead of one after another
  const [t, tSubjects, courses, recent, lessonTimes, user, tasks] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Subjects"),
    getAllCourses({ limit: 3 }),
    getUserSessions(userId!, 6),
    getLessonTimes(userId!, week.since),
    currentUser(),
    getMyTasks().catch(() => []),
  ]);

  // New users see the short welcome introduction once before the home page
  if (user && !readOnboarding(user.unsafeMetadata).welcomeDone) {
    redirect({ href: "/welcome", locale });
  }

  const [last, ...earlier] = recent;
  const days = activeDays(lessonTimes, week.days);
  const activeCount = days.filter(Boolean).length;
  const name = user?.firstName?.trim();

  return (
    <main>
      <PageTour id="home" />

      <section className="flex flex-col gap-1">
        <h1>{name ? t("hello", { name }) : t("helloNoName")}</h1>
        <p className="text-lg text-muted-foreground max-sm:text-base">
          {last ? t("subtitleContinue") : t("subtitleStart")}
        </p>
      </section>

      {/* Tasks from the teacher come before anything else */}
      {tasks.length > 0 && (
        <section className="task-grid" aria-label={t("tasksLabel")}>
          {tasks.slice(0, 4).map((task, index) => (
            <TaskCard
              key={task.assignmentId}
              assignmentId={task.assignmentId}
              teacherName={task.teacherName}
              course={task.course}
              minutes={task.minutes}
              dueDate={task.dueDate}
              message={task.message}
              progress={task.progress}
              autoRead={!!task.support.autoRead && index === 0}
              tour={index === 0 ? "home-task" : undefined}
            />
          ))}
        </section>
      )}

      {/* The one main action on this page */}
      {last ? (
        <section className="today-card" aria-labelledby="today-title" data-tour="home-continue">
          <SubjectTile subject={last.subject} size="lg" className="max-sm:size-14 max-sm:rounded-2xl" />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="form-eyebrow">{t("continueLabel")}</p>
            <h2 id="today-title" className="today-title" lang={last.language}>
              {last.name}
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="pill">{getSubjectLabel(tSubjects, last.subject)}</span>
              <span className="pill">
                <Clock className="size-4" aria-hidden />
                {t("minutes", { count: last.duration })}
              </span>
              {last.language && <span className="pill">{last.language.toUpperCase()}</span>}
            </div>
          </div>
          <Link href={`/courses/${last.id}`} className="btn-primary today-action">
            <Play className="size-5" fill="currentColor" aria-hidden />
            {t("startLesson")}
          </Link>
        </section>
      ) : (
        <section className="today-card" aria-labelledby="today-title" data-tour="home-continue">
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <p className="form-eyebrow">{t("startLabel")}</p>
            <h2 id="today-title" className="today-title">
              {t("startTitle")}
            </h2>
            <p className="text-lg text-muted-foreground">{t("startText")}</p>
          </div>
          <div className="today-action flex flex-wrap gap-3">
            <Link href="/courses" className="btn-primary">
              {t("browseCourses")}
            </Link>
            <Link href="/courses/new" className="btn-outline">
              {t("createCourse")}
            </Link>
          </div>
        </section>
      )}

      <section className="home-section">
        <CourseList
          title={t("recentCourses")}
          courses={earlier}
          classNames="lg:flex-1"
          tour="home-recent"
          emptyMessage={last ? t("recentOnlyOne") : t("recentEmpty")}
        />
        <div className="flex w-full flex-col gap-6 lg:max-w-[380px]">
          {/* Rewards showing up, never punishes a missed day: no streak to lose */}
          <article className="card flex flex-col gap-4" aria-labelledby="week-title" data-tour="home-week">
            <h2 id="week-title" className="text-2xl font-bold max-sm:text-xl">
              {t("weekTitle")}
            </h2>
            <ol className="week-row">
              {WEEKDAYS.map((key, index) => (
                <li
                  key={key}
                  className={cn("week-day", days[index] && "is-done", index === week.today && "is-today")}
                >
                  <span className="week-dot">
                    {days[index] && <Check className="size-4" strokeWidth={3} aria-hidden />}
                  </span>
                  <span aria-hidden>{t(`weekdays.${key}`)}</span>
                  <span className="sr-only">
                    {t(`weekdaysLong.${key}`)}: {days[index] ? t("dayDone") : t("dayOpen")}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-base text-muted-foreground">{t("weekSummary", { count: activeCount })}</p>
          </article>
          <CTA />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold max-sm:text-xl">{t("popularCourses")}</h2>
        <div className="courses-grid" data-tour="home-popular">
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
        </div>
      </section>
    </main>
  );
};

export default Page;
