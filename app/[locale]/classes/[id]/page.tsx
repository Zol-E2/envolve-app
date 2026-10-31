import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowLeft, Clock, Send, Trash2, TriangleAlert, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSubjectLabel } from "@/lib/utils";
import { isUuid } from "@/lib/validation";
import { loadClassDetail } from "@/lib/teacher/queries";
import { deleteAssignment, deleteClass } from "@/lib/actions/teacher.actions";
import type { AssignmentProgress } from "@/lib/teacher/types";
import JoinCodeBox from "@/components/teacher/JoinCodeBox";
import ProgressBadge from "@/components/teacher/ProgressBadge";
import StudentSupportRow from "@/components/teacher/StudentSupportRow";
import ConfirmAction from "@/components/teacher/ConfirmAction";
import SubjectTile from "@/components/SubjectTile";
import PageTour from "@/components/onboarding/PageTour";

const TABS = ["overview", "students", "assignments"] as const;
type Tab = (typeof TABS)[number];

interface ClassPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; a?: string }>;
}

export async function generateMetadata({ params }: ClassPageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await loadClassDetail(id);
  return { title: detail?.name ?? (await getTranslations("Classes"))("title") };
}

/**
 * One class: who needs help first (Overview), support per student
 * (Students), and everything handed out so far (Assignments).
 */
const ClassPage = async ({ params, searchParams }: ClassPageProps) => {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await loadClassDetail(id);
  if (!detail) notFound();

  const [t, tStatus, tSubjects, format] = await Promise.all([
    getTranslations("ClassDetail"),
    getTranslations("Status"),
    getTranslations("Subjects"),
    getFormatter(),
  ]);
  const tab: Tab = (TABS as readonly string[]).includes(query.tab ?? "") ? (query.tab as Tab) : "overview";
  const selected: AssignmentProgress | undefined =
    (isUuid(query.a) && detail.assignments.find((a) => a.id === query.a)) || detail.assignments[0];
  const dueText = (date: string | null) =>
    date
      ? t("due", { date: format.dateTime(new Date(`${date}T12:00:00`), { weekday: "long", month: "short", day: "numeric" }) })
      : t("noDue");

  const stuck = selected?.students.filter((s) => s.progress.status === "stuck") ?? [];
  const tabHref = (name: Tab) => (name === "overview" ? `/classes/${id}` : `/classes/${id}?tab=${name}`);

  return (
    <main>
      <PageTour id="classDetail" />

      <section className="flex flex-col gap-4">
        <Link href="/classes" className="btn-quiet w-fit px-0 lg:hidden">
          <ArrowLeft className="size-5" aria-hidden />
          {t("back")}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1>{detail.name}</h1>
            <p className="class-meta">
              {detail.subject && <span className="pill">{getSubjectLabel(tSubjects, detail.subject)}</span>}
              <span className="flex items-center gap-1.5">
                <UsersRound className="size-5" aria-hidden />
                {t("students", { count: detail.members.length })}
              </span>
            </p>
          </div>
          <Link href={`/classes/${id}/assign`} className="btn-primary" data-tour="class-assign">
            <Send className="size-5" aria-hidden />
            {t("assign")}
          </Link>
        </div>
        <JoinCodeBox classId={id} code={detail.joinCode} />
      </section>

      <nav className="tabs" aria-label={t("tabsLabel")} data-tour="class-tabs">
        {TABS.map((name) => (
          <Link key={name} href={tabHref(name)} className="tab-link" aria-current={tab === name ? "page" : undefined}>
            {t(`tab.${name}`)}
          </Link>
        ))}
      </nav>

      {tab === "overview" &&
        (detail.members.length === 0 ? (
          <div className="list-empty card">
            <p>{t("noStudents", { code: detail.joinCode })}</p>
          </div>
        ) : !selected ? (
          <div className="list-empty card">
            <p>{t("noAssignments")}</p>
            <Link href={`/classes/${id}/assign`} className="btn-primary w-fit">
              {t("assign")}
            </Link>
          </div>
        ) : (
          <section className="flex flex-col gap-4" aria-labelledby="selected-title">
            {detail.assignments.length > 1 && (
              <div className="chip-row" data-tour="class-picker" aria-label={t("pickerLabel")}>
                {detail.assignments.slice(0, 8).map((a) => (
                  <Link
                    key={a.id}
                    href={`/classes/${id}?a=${a.id}`}
                    className="assignment-chip"
                    aria-current={a.id === selected.id ? "true" : undefined}
                  >
                    {a.course.name}
                    {a.counts.stuck > 0 && <span className="attention-dot">{a.counts.stuck}</span>}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <SubjectTile subject={selected.course.subject} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 id="selected-title" className="text-2xl font-bold max-sm:text-xl" lang={selected.course.language}>
                  {selected.course.name}
                </h2>
                <p className="person-detail flex flex-wrap items-center gap-x-3">
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" aria-hidden />
                    {dueText(selected.dueDate)}
                  </span>
                  <span>
                    {t("doneCount", { done: selected.counts.done, total: selected.students.length })}
                  </span>
                </p>
              </div>
            </div>

            {stuck.length > 0 && (
              <div className="stuck-alert" role="status" data-tour="class-stuck">
                <TriangleAlert className="mt-1 size-6 shrink-0 text-warn" aria-hidden />
                <div className="flex flex-col gap-1">
                  <p className="font-bold">{t("stuckTitle", { count: stuck.length, course: selected.course.name })}</p>
                  <ul className="flex flex-col">
                    {stuck.map((s) => (
                      <li key={s.studentId}>
                        {s.displayName}:{" "}
                        {s.progress.detail?.kind === "left"
                          ? tStatus("left", { minutes: s.progress.detail.minutes })
                          : s.progress.detail?.kind === "micDenied"
                            ? tStatus("micDenied")
                            : tStatus("connection")}
                      </li>
                    ))}
                  </ul>
                  <p className="text-base text-muted-foreground">{t("stuckHint")}</p>
                </div>
              </div>
            )}

            <ul className="person-list" data-tour="class-status" aria-label={t("statusListLabel")}>
              {selected.students.map((s) => (
                <li key={s.studentId} className="person-row">
                  <span className="person-avatar" aria-hidden>
                    {s.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="person-name">{s.displayName}</span>
                  <ProgressBadge progress={s.progress} />
                </li>
              ))}
            </ul>
          </section>
        ))}

      {tab === "students" && (
        <section className="flex flex-col gap-4">
          <p className="max-w-prose text-lg text-muted-foreground">{t("studentsLead")}</p>
          {detail.members.length === 0 ? (
            <div className="list-empty card">
              <p>{t("noStudents", { code: detail.joinCode })}</p>
            </div>
          ) : (
            <ul className="person-list" data-tour="class-students">
              {detail.members.map((member, index) => (
                <StudentSupportRow key={member.studentId} classId={id} member={member} first={index === 0} />
              ))}
            </ul>
          )}
          <div className="danger-zone">
            <div className="flex min-w-0 flex-col">
              <span className="text-lg font-bold">{t("deleteClass")}</span>
              <span className="person-detail">{t("deleteClassHint")}</span>
            </div>
            <ConfirmAction
              label={t("deleteClass")}
              question={t("deleteClassQuestion")}
              confirmLabel={t("deleteClassConfirm")}
              action={deleteClass.bind(null, id)}
              afterHref="/classes"
              icon={<Trash2 className="size-5" aria-hidden />}
              className="btn-outline min-h-11 px-4 text-base"
            />
          </div>
        </section>
      )}

      {tab === "assignments" && (
        <section className="flex flex-col gap-4">
          {detail.assignments.length === 0 ? (
            <div className="list-empty card">
              <p>{t("noAssignments")}</p>
              <Link href={`/classes/${id}/assign`} className="btn-primary w-fit">
                {t("assign")}
              </Link>
            </div>
          ) : (
            <ul className="person-list" data-tour="class-assignments">
              {detail.assignments.map((a) => (
                <li key={a.id} className="person-row">
                  <SubjectTile subject={a.course.subject} size="sm" />
                  <span className="person-name">
                    <Link href={`/classes/${id}?a=${a.id}`} className="hover:underline" lang={a.course.language}>
                      {a.course.name}
                    </Link>
                    <span className="person-detail block">
                      {dueText(a.dueDate)} · {a.everyone ? t("forEveryone") : t("forSome", { count: a.students.length })}
                    </span>
                    {a.message && <span className="person-detail block italic">„{a.message}”</span>}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="status-pill" data-status="done">
                      {t("doneCount", { done: a.counts.done, total: a.students.length })}
                    </span>
                    {a.counts.stuck > 0 && (
                      <span className="status-pill" data-status="stuck">
                        {tStatus("stuckCount", { count: a.counts.stuck })}
                      </span>
                    )}
                  </span>
                  <ConfirmAction
                    label={t("deleteAssignment")}
                    question={t("deleteAssignmentQuestion")}
                    confirmLabel={t("deleteAssignmentConfirm")}
                    action={deleteAssignment.bind(null, a.id)}
                    icon={<Trash2 className="size-5" aria-hidden />}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
};

export default ClassPage;
