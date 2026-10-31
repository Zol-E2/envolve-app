import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, KeyRound, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSubjectLabel } from "@/lib/utils";
import { loadTeacherClasses } from "@/lib/teacher/queries";
import NewClassForm from "@/components/teacher/NewClassForm";
import PageTour from "@/components/onboarding/PageTour";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Classes");
  return { title: t("title") };
}

/** The teacher's classes; the ones where someone is stuck come first */
const ClassesPage = async () => {
  const [t, tSubjects, classes] = await Promise.all([
    getTranslations("Classes"),
    getTranslations("Subjects"),
    loadTeacherClasses(),
  ]);
  const sorted = [...classes].sort((a, b) => b.stuckCount - a.stuckCount);

  return (
    <main>
      <PageTour id="classes" />
      <section className="flex flex-col gap-1">
        <h1>{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-sm:text-base">{t("lead")}</p>
      </section>

      <NewClassForm />

      {sorted.length === 0 ? (
        <div className="list-empty card" data-tour="classes-list">
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="class-grid" data-tour="classes-list">
          {sorted.map((c) => (
            <Link key={c.id} href={`/classes/${c.id}`} className="class-card group">
              <div className="flex items-start justify-between gap-3">
                <h2 className="class-card-title group-hover:underline">{c.name}</h2>
                <span
                  className="status-pill"
                  data-status={c.stuckCount > 0 ? "stuck" : "done"}
                >
                  {c.stuckCount > 0 ? t("needsAttention", { count: c.stuckCount }) : t("allGood")}
                </span>
              </div>
              <div className="class-meta">
                {c.subject && <span className="pill">{getSubjectLabel(tSubjects, c.subject)}</span>}
                <span className="flex items-center gap-1.5">
                  <UsersRound className="size-5" aria-hidden />
                  {t("students", { count: c.studentCount })}
                </span>
                <span className="flex items-center gap-1.5">
                  <KeyRound className="size-5" aria-hidden />
                  <span className="font-mono font-bold tracking-widest">{c.joinCode}</span>
                </span>
              </div>
              <span className="mt-auto flex items-center gap-2 text-base font-bold text-primary-deep">
                {t("open")}
                <ArrowRight className="size-5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
};

export default ClassesPage;
