import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AdminSafety } from "@/lib/actions/admin.actions";
import AdminAlertList from "./AdminAlertList";

/**
 * Lesson safety on the admin's home page, in its own card: how many lessons
 * the tutor stopped in the last 30 days, most serious first, and the latest
 * calls for help and rule breaks with names. If the numbers could not be
 * loaded, it says so instead of showing nothing.
 */
const AdminSafetyCard = async ({ safety }: { safety: AdminSafety | null }) => {
  const [t, ts, format] = await Promise.all([
    getTranslations("AdminHome"),
    getTranslations("AdminSafety"),
    getFormatter(),
  ]);

  type Stat = {
    key: "help" | "helpSeen" | "violation" | "drift" | "unassigned";
    kind: "help" | "violation" | "drift";
    value: number;
  };
  const numbers: Stat[] = safety
    ? [
        { key: "help", kind: "help", value: safety.stats.help },
        { key: "helpSeen", kind: "help", value: safety.stats.helpSeen },
        { key: "violation", kind: "violation", value: safety.stats.violation },
        { key: "drift", kind: "drift", value: safety.stats.drift },
      ]
    : [];
  if (safety && safety.stats.unassigned > 0) {
    numbers.push({ key: "unassigned", kind: "violation", value: safety.stats.unassigned });
  }
  const latest = safety?.alerts.slice(0, 5) ?? [];
  const total = safety ? safety.stats.help + safety.stats.violation + safety.stats.drift : 0;

  return (
    <section className="admin-safety-card" aria-labelledby="safety-card-title" data-attention={total > 0 || undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="safety-card-title" className="flex items-center gap-2 text-2xl font-bold max-sm:text-xl">
          <ShieldAlert className="size-6 text-destructive" aria-hidden />
          {t("safetyTitle")}
        </h2>
        <Link href="/admin/safety" className="btn-quiet">
          {t("safetyOpen")}
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      </div>

      {!safety ? (
        <p className="field-error" role="alert">
          {t("safetyError")}
        </p>
      ) : (
        <>
          <dl className="admin-stats">
            {numbers.map((n) => (
              <div key={n.key} className="admin-stat" data-kind={n.value > 0 ? n.kind : undefined}>
                <dt>{ts(`number.${n.key}`)}</dt>
                <dd>{format.number(n.value)}</dd>
              </div>
            ))}
          </dl>
          <h3 className="text-xl font-bold max-sm:text-lg">{t("safetyRecent")}</h3>
          {latest.length === 0 ? (
            <p className="text-lg text-muted-foreground">{ts("empty")}</p>
          ) : (
            <AdminAlertList alerts={latest} />
          )}
          <p className="form-hint">{ts("helpNote")}</p>
        </>
      )}
    </section>
  );
};

export default AdminSafetyCard;
