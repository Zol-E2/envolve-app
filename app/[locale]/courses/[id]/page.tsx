import type { Metadata } from "next";
import { cache } from "react";
import { getCourseById } from "@/lib/actions/course.actions";
import { getSubjectLabel } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import SubjectTile from "@/components/SubjectTile";
import CourseComponent from "@/components/CourseComponent";
import PageTour from "@/components/onboarding/PageTour";
import { AutoReadBoost } from "@/components/ComfortProvider";
import { getLessonAssignment } from "@/lib/actions/class.actions";
import { getTeacherClasses } from "@/lib/actions/teacher.actions";
import { isTeacher } from "@/lib/roles.server";
import AssignCourseButton from "@/components/teacher/AssignCourseButton";
import { Eye } from "lucide-react";

interface CourseSessionPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ assignment?: string }>;
}

// One database lookup per request, shared by the tab title and the page.
// An unknown or malformed course id makes Supabase throw; treat it as "not found".
const loadCourse = cache((id: string) => getCourseById(id).catch(() => null));

export async function generateMetadata({
  params,
}: CourseSessionPageProps): Promise<Metadata> {
  const { id } = await params;
  const [course, t] = await Promise.all([
    loadCourse(id),
    getTranslations("NotFound"),
  ]);
  // A missing course renders the 404 page, so give the tab the same title
  return { title: course?.name ?? t("title") };
}

const CourseSession = async ({ params, searchParams }: CourseSessionPageProps) => {
  const [{ id }, query] = await Promise.all([params, searchParams ?? Promise.resolve({ assignment: undefined })]);
  // Independent lookups run in parallel instead of one after another
  // Teachers try the lesson in preview: nothing is recorded (lib/views.ts)
  const preview = await isTeacher();
  const [locale, t, tSubjects, course, user, assignment, classes] = await Promise.all([
    getLocale(),
    getTranslations("CourseSession"),
    getTranslations("Subjects"),
    loadCourse(id),
    currentUser(),
    // Started from a teacher's task: its support settings apply, and the
    // lesson is recorded for the teacher's overview
    !preview && query.assignment ? getLessonAssignment(query.assignment, id).catch(() => null) : null,
    preview ? getTeacherClasses().catch(() => []) : [],
  ]);

  // Locale-aware redirect keeps the user on /hu/... when they were browsing in Hungarian
  if (!user) {
    redirect({ href: "/sign-in", locale });
  }
  if (!course) {
    notFound();
  }

  const { name, subject, topic, duration, language } = course;
  if (!name || !subject || !topic || !duration) {
    redirect({ href: "/courses", locale });
  }

  return (
    <main>
      <PageTour id={preview ? "lessonPreview" : "lesson"} />
      {assignment?.support.autoRead && <AutoReadBoost />}
      {preview && (
        <div className="stuck-alert flex-wrap items-center" role="note" data-tour="preview-banner">
          <Eye className="size-6 shrink-0 text-warn" aria-hidden />
          <p className="min-w-0 flex-1 basis-60">{t("previewNote")}</p>
          <AssignCourseButton
            courseId={id}
            classes={classes.map((c) => ({ id: c.id, name: c.name }))}
            tour="preview-assign"
            menuAlign="end"
          />
        </div>
      )}
      <article className="card flex items-center gap-4 max-sm:gap-3">
        <SubjectTile subject={subject} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl max-sm:text-xl" lang={language}>
            {name}
          </h1>
          <p className="line-clamp-2 text-base text-muted-foreground" lang={language}>
            {getSubjectLabel(tSubjects, subject)} · {topic}
          </p>
        </div>
        <span className="pill max-sm:hidden">
          <Clock className="size-4" aria-hidden />
          {t("min", { count: assignment?.minutes ?? duration })}
        </span>
      </article>
      <CourseComponent
        {...course}
        courseId={id}
        assignment={assignment}
        preview={preview}
        userName={user.firstName!}
        userImage={user.imageUrl!}
      />
    </main>
  );
};

export default CourseSession;
