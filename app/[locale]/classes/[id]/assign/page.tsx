import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { loadClassDetail } from "@/lib/teacher/queries";
import { getAssignableCourses } from "@/lib/actions/teacher.actions";
import { getCourseById } from "@/lib/actions/course.actions";
import { isUuid } from "@/lib/validation";
import type { ClassCourse } from "@/lib/teacher/types";
import AssignForm from "@/components/teacher/AssignForm";
import PageTour from "@/components/onboarding/PageTour";

interface AssignPageProps {
  params: Promise<{ id: string }>;
  /** ?course=<id> from the Kurzustár or a lesson preview: that course is picked */
  searchParams?: Promise<{ course?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Assign");
  return { title: t("title") };
}

const AssignPage = async ({ params, searchParams }: AssignPageProps) => {
  const [{ id }, query] = await Promise.all([params, searchParams ?? Promise.resolve({ course: undefined })]);
  const wanted = isUuid(query.course) ? query.course : null;
  const [detail, courses, t] = await Promise.all([
    loadClassDetail(id),
    getAssignableCourses().catch(() => ({ own: [] as ClassCourse[], library: [] as ClassCourse[] })),
    getTranslations("Assign"),
  ]);
  if (!detail) notFound();

  // A course older than the newest 50 is still offered when it was picked
  if (wanted && ![...courses.own, ...courses.library].some((c) => c.id === wanted)) {
    const extra = await getCourseById(wanted).catch(() => null);
    if (extra) {
      courses.library.unshift({
        id: extra.id,
        name: extra.name,
        subject: extra.subject,
        duration: extra.duration,
        language: extra.language,
      });
    }
  }

  return (
    <main>
      <PageTour id="assign" />
      <section className="flex flex-col gap-2">
        <Link href={`/classes/${id}`} className="btn-quiet w-fit px-0">
          <ArrowLeft className="size-5" aria-hidden />
          {detail.name}
        </Link>
        <h1>{t("heading", { name: detail.name })}</h1>
        <p className="text-lg text-muted-foreground max-sm:text-base">{t("lead")}</p>
      </section>
      <AssignForm
        classId={id}
        teacherName={detail.teacherName}
        members={detail.members}
        courses={courses}
        initialCourseId={wanted}
      />
    </main>
  );
};

export default AssignPage;
