import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { ShieldX } from "lucide-react";
import { getAdminSafety } from "@/lib/actions/admin.actions";
import PageTour from "@/components/onboarding/PageTour";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("adminSafety") };
}

/**
 * Lesson safety for admins: rule breaks with names, so the platform can be
 * protected; drift and calls for help only as numbers, because a child's
 * call for help belongs to their school.
 */
const AdminSafetyPage = async () => {
  const [t, format, safety] = await Promise.all([getTranslations("AdminSafety"), getFormatter(), getAdminSafety()]);
  const { stats, violations } = safety;
  const numbers = [
    { key: "violation", value: stats.violation },
    { key: "help", value: stats.help },
    { key: "helpSeen", value: stats.helpSeen },
    { key: "drift", value: stats.drift },
    { key: "unassigned", value: stats.unassigned },
  ] as const;

  return (
    <main>
      <PageTour id="adminSafety" />
      <section className="flex flex-col gap-1">
        <h1>{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-sm:text-base">{t("lead")}</p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="safety-numbers" data-tour="admin-safety-numbers">
        <h2 id="safety-numbers" className="text-2xl font-bold max-sm:text-xl">
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
        <p className="form-hint">{t("helpNote")}</p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="safety-list" data-tour="admin-safety-list">
        <h2 id="safety-list" className="flex items-center gap-2 text-2xl font-bold max-sm:text-xl">
          <ShieldX className="size-6 text-destructive" aria-hidden />
          {t("listTitle")}
        </h2>
        {violations.length === 0 ? (
          <p className="card text-lg text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="person-list">
            {violations.map((v) => (
              <li key={v.id} className="person-row">
                <span className="person-name">
                  <span className="break-words">{v.studentName || v.studentEmail || t("unknownStudent")}</span>
                  <span className="person-detail block break-words">
                    {[v.studentName ? v.studentEmail : "", v.courseName].filter(Boolean).join(" · ")}
                    {v.courseName || v.studentEmail ? " · " : ""}
                    {format.dateTime(new Date(v.createdAt), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="person-detail block">{t(`category.${v.category}`)}</span>
                </span>
                <span className="status-pill" data-status={v.falseAlarm ? "notStarted" : v.seen ? "done" : "stuck"}>
                  {v.falseAlarm ? t("falseAlarm") : v.seen ? t("seen") : t("notSeen")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default AdminSafetyPage;
