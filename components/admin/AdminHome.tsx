import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowRight, CircleCheck, Flag, History, Hourglass, ShieldAlert, ShieldX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AdminOverview } from "@/lib/admin/types";
import PageTour from "@/components/onboarding/PageTour";
import AuditLogList from "./AuditLogList";

/**
 * The admin's home page ("Áttekintés"): what needs a decision first, then
 * the numbers (totals only, no names), then the latest admin decisions.
 */
const AdminHome = async ({
  name,
  overview,
  openViolations = 0,
}: {
  name: string;
  overview: AdminOverview;
  /** Rule breaks in lessons that no teacher has looked at yet */
  openViolations?: number;
}) => {
  const [t, format] = await Promise.all([getTranslations("AdminHome"), getFormatter()]);
  const unchecked = Math.max(0, overview.courses.review - overview.flagged);
  const todo = overview.flagged + unchecked + openViolations;

  const numbers = [
    { key: "students", value: overview.users.student },
    { key: "teachers", value: overview.users.teacher },
    { key: "admins", value: overview.users.admin },
    { key: "publicCourses", value: overview.courses.public },
    { key: "activeStudents", value: overview.activeStudentsWeek },
    { key: "lessons", value: overview.lessonsWeek },
  ] as const;

  return (
    <main>
      <PageTour id="adminHome" intro="helpIntroAdult" />
      <section className="flex flex-col gap-1">
        <h1>{t("hello", { name })}</h1>
        <p className="text-lg text-muted-foreground max-sm:text-base">
          {todo > 0 ? t("leadTodo", { count: todo }) : t("leadCalm")}
        </p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="todo-title" data-tour="admin-attention">
        <h2 id="todo-title" className="flex items-center gap-2 text-2xl font-bold max-sm:text-xl">
          <ShieldAlert className="size-6 text-warn" aria-hidden />
          {t("todoTitle")}
        </h2>
        {todo === 0 ? (
          <p className="card flex items-center gap-2 text-lg">
            <CircleCheck className="size-6 shrink-0 text-ok" aria-hidden />
            {t("todoNone")}
          </p>
        ) : (
          <ul className="person-list">
            {openViolations > 0 && (
              <li>
                <Link href="/admin/safety" className="person-row group">
                  <ShieldX className="size-6 shrink-0 text-destructive" aria-hidden />
                  <span className="person-name group-hover:underline">
                    {t("violations", { count: openViolations })}
                    <span className="person-detail block">{t("violationsHint")}</span>
                  </span>
                  <ArrowRight className="size-5 text-primary-deep" aria-hidden />
                </Link>
              </li>
            )}
            {overview.flagged > 0 && (
              <li>
                <Link href="/admin/courses" className="person-row group">
                  <Flag className="size-6 shrink-0 text-destructive" aria-hidden />
                  <span className="person-name group-hover:underline">
                    {t("flagged", { count: overview.flagged })}
                    <span className="person-detail block">{t("flaggedHint")}</span>
                  </span>
                  <ArrowRight className="size-5 text-primary-deep" aria-hidden />
                </Link>
              </li>
            )}
            {unchecked > 0 && (
              <li>
                <Link href="/admin/courses" className="person-row group">
                  <Hourglass className="size-6 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="person-name group-hover:underline">
                    {t("unchecked", { count: unchecked })}
                    <span className="person-detail block">{t("uncheckedHint")}</span>
                  </span>
                  <ArrowRight className="size-5 text-primary-deep" aria-hidden />
                </Link>
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="numbers-title" data-tour="admin-numbers">
        <h2 id="numbers-title" className="text-2xl font-bold max-sm:text-xl">
          {t("numbersTitle")}
        </h2>
        <dl className="admin-stats">
          {numbers.map((n) => (
            <div key={n.key} className="admin-stat">
              <dt>{t(`number.${n.key}`)}</dt>
              <dd>{format.number(n.value)}</dd>
            </div>
          ))}
        </dl>
        {overview.users.capped && <p className="form-hint">{t("capped")}</p>}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="log-title" data-tour="admin-log">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="log-title" className="flex items-center gap-2 text-2xl font-bold max-sm:text-xl">
            <History className="size-6 text-primary" aria-hidden />
            {t("logTitle")}
          </h2>
          <span className="flex flex-wrap gap-1">
            <Link href="/admin/safety" className="btn-quiet">
              {t("safetyLink")}
              <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link href="/admin/log" className="btn-quiet">
              {t("logAll")}
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </span>
        </div>
        <AuditLogList entries={overview.log} />
      </section>
    </main>
  );
};

export default AdminHome;
