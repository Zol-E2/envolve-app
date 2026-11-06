import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { ShieldX } from "lucide-react";
import AdminAlertList from "@/components/admin/AdminAlertList";
import { getAdminSafety } from "@/lib/actions/admin.actions";
import PageTour from "@/components/onboarding/PageTour";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("adminSafety") };
}

/**
 * Lesson safety for admins: lessons stopped for a call for help or a rule
 * break, with names, so none can go unnoticed; drift only as a number.
 */
const AdminSafetyPage = async () => {
  const [t, format, safety] = await Promise.all([getTranslations("AdminSafety"), getFormatter(), getAdminSafety()]);
  const { stats, alerts } = safety;
  const numbers = [
    { key: "help", kind: "help", value: stats.help },
    { key: "helpSeen", kind: "help", value: stats.helpSeen },
    { key: "violation", kind: "violation", value: stats.violation },
    { key: "drift", kind: "drift", value: stats.drift },
    { key: "unassigned", kind: "violation", value: stats.unassigned },
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
            <div key={n.key} className="admin-stat" data-kind={n.value > 0 ? n.kind : undefined}>
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
        {alerts.length === 0 ? (
          <p className="card text-lg text-muted-foreground">{t("empty")}</p>
        ) : (
          <AdminAlertList alerts={alerts} showEmail />
        )}
      </section>
    </main>
  );
};

export default AdminSafetyPage;
