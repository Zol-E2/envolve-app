import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowRight, CalendarDays, CircleCheck, Library, Plus, Send, TriangleAlert, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TeacherOverview } from "@/lib/teacher/types";
import ProgressBadge from "./ProgressBadge";
import PageTour from "@/components/onboarding/PageTour";

/**
 * The teacher's home page ("Áttekintés"): what needs their attention first
 * (stuck students, deadlines), then the classes and quick actions. No
 * student-style content: no streaks, no "continue", no course suggestions.
 */
const TeacherHome = async ({ name, overview }: { name: string; overview: TeacherOverview }) => {
  const [t, format] = await Promise.all([getTranslations("TeacherHome"), getFormatter()]);
  const { classes, stuck, deadlines } = overview;
  const assignHref = classes.length === 1 ? `/classes/${classes[0].id}/assign` : "/library";

  return (
    <main>
      <PageTour id="teacherHome" />

      <section className="flex flex-col gap-1">
        <h1>{t("hello", { name })}</h1>
        <p className="text-lg text-muted-foreground max-sm:text-base">
          {classes.length === 0 ? t("leadFirst") : stuck.length > 0 ? t("leadStuck", { count: stuck.length }) : t("leadCalm")}
        </p>
      </section>

      <div className="flex flex-wrap gap-3" data-tour="teacher-actions">
        <Link href={assignHref} className="btn-primary">
          <Send className="size-5" aria-hidden />
          {t("assign")}
        </Link>
        <Link href="/classes" className="btn-outline">
          <Plus className="size-5" aria-hidden />
          {t("newClass")}
        </Link>
        <Link href="/library" className="btn-outline">
          <Library className="size-5" aria-hidden />
          {t("library")}
        </Link>
      </div>

      <div className="home-section">
        <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-1">
          <section className="flex flex-col gap-3" aria-labelledby="stuck-title" data-tour="teacher-stuck">
            <h2 id="stuck-title" className="flex items-center gap-2 text-2xl font-bold max-sm:text-xl">
              <TriangleAlert className="size-6 text-warn" aria-hidden />
              {t("stuckTitle")}
            </h2>
            {stuck.length === 0 ? (
              <p className="card flex items-center gap-2 text-lg">
                <CircleCheck className="size-6 shrink-0 text-ok" aria-hidden />
                {classes.length === 0 ? t("stuckNoClasses") : t("stuckNone")}
              </p>
            ) : (
              <ul className="person-list">
                {stuck.map((s) => (
                  <li key={`${s.assignmentId}-${s.studentName}`} className="person-row">
                    <span className="person-avatar" aria-hidden>
                      {s.studentName.charAt(0).toUpperCase()}
                    </span>
                    <span className="person-name">
                      <Link href={`/classes/${s.classId}?a=${s.assignmentId}`} className="hover:underline">
                        {s.studentName}
                      </Link>
                      <span className="person-detail block">
                        {s.className} · {s.courseName}
                      </span>
                    </span>
                    <ProgressBadge progress={s.progress} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="deadline-title" data-tour="teacher-deadlines">
            <h2 id="deadline-title" className="flex items-center gap-2 text-2xl font-bold max-sm:text-xl">
              <CalendarDays className="size-6 text-turn" aria-hidden />
              {t("deadlinesTitle")}
            </h2>
            {deadlines.length === 0 ? (
              <p className="card text-lg text-muted-foreground">{t("deadlinesNone")}</p>
            ) : (
              <ul className="person-list">
                {deadlines.map((d) => (
                  <li key={d.assignmentId} className="person-row">
                    <span className="person-name">
                      <Link href={`/classes/${d.classId}?a=${d.assignmentId}`} className="hover:underline">
                        {d.courseName}
                      </Link>
                      <span className="person-detail block">
                        {d.className} ·{" "}
                        {format.dateTime(new Date(`${d.dueDate}T12:00:00`), { weekday: "long", month: "short", day: "numeric" })}
                      </span>
                    </span>
                    <span className="status-pill" data-status={d.done === d.total && d.total > 0 ? "done" : "inProgress"}>
                      {t("doneCount", { done: d.done, total: d.total })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="flex w-full flex-col gap-3 lg:max-w-[380px]" aria-labelledby="classes-title" data-tour="teacher-classes">
          <h2 id="classes-title" className="flex items-center gap-2 text-2xl font-bold max-sm:text-xl">
            <UsersRound className="size-6 text-primary" aria-hidden />
            {t("classesTitle")}
          </h2>
          {classes.length === 0 ? (
            <div className="list-empty card">
              <p>{t("classesNone")}</p>
              <Link href="/classes" className="btn-primary w-fit">
                {t("newClass")}
              </Link>
            </div>
          ) : (
            <ul className="person-list">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link href={`/classes/${c.id}`} className="person-row group">
                    <span className="person-name group-hover:underline">
                      {c.name}
                      <span className="person-detail block">{t("students", { count: c.studentCount })}</span>
                    </span>
                    {c.stuckCount > 0 && <span className="attention-dot">{c.stuckCount}</span>}
                    <ArrowRight className="size-5 text-primary-deep" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default TeacherHome;
