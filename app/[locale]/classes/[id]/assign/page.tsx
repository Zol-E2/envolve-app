import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { loadClassDetail } from "@/lib/teacher/queries";
import { getAssignableCourses } from "@/lib/actions/teacher.actions";
import AssignForm from "@/components/teacher/AssignForm";
import PageTour from "@/components/onboarding/PageTour";

interface AssignPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Assign");
  return { title: t("title") };
}

const AssignPage = async ({ params }: AssignPageProps) => {
  const { id } = await params;
  const [detail, courses, t] = await Promise.all([
    loadClassDetail(id),
    getAssignableCourses().catch(() => ({ own: [], library: [] })),
    getTranslations("Assign"),
  ]);
  if (!detail) notFound();

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
      <AssignForm classId={id} teacherName={detail.teacherName} members={detail.members} courses={courses} />
    </main>
  );
};

export default AssignPage;
