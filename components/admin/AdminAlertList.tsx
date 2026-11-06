import { getFormatter, getTranslations } from "next-intl/server";
import { HeartHandshake, ShieldAlert } from "lucide-react";
import type { AdminSafety } from "@/lib/actions/admin.actions";

const ICONS = { help: HeartHandshake, violation: ShieldAlert } as const;

/**
 * Stopped lessons for admins (calls for help first, then rule breaks), in
 * the same colours and words as on the teacher's overview, with whether a
 * teacher has opened them. Never what was said.
 */
const AdminAlertList = async ({
  alerts,
  showEmail = false,
}: {
  alerts: AdminSafety["alerts"];
  showEmail?: boolean;
}) => {
  const [t, ts, format] = await Promise.all([
    getTranslations("Safety"),
    getTranslations("AdminSafety"),
    getFormatter(),
  ]);

  return (
    <ul className="flex flex-col gap-3">
      {alerts.map((a) => {
        const Icon = ICONS[a.kind];
        const handled = a.seen || a.falseAlarm;
        return (
          <li key={a.id} className="lesson-alert" data-kind={a.kind} data-seen={handled || undefined}>
            <span className="alert-icon" aria-hidden>
              <Icon className="size-6" />
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="alert-level">{t(`level.${a.kind}`)}</p>
                <span className="status-pill" data-status={a.falseAlarm ? "notStarted" : a.seen ? "done" : "stuck"}>
                  {a.falseAlarm ? ts("falseAlarm") : a.seen ? ts("seen") : ts("notSeen")}
                </span>
              </div>
              <p className="lesson-alert-who break-words">{a.studentName || a.studentEmail || ts("unknownStudent")}</p>
              <p className="text-lg max-sm:text-base">{t(`category.${a.category}`)}</p>
              <p className="text-base break-words text-muted-foreground">
                {[
                  showEmail && a.studentName ? a.studentEmail : "",
                  a.courseName && t("course", { name: a.courseName }),
                  format.dateTime(new Date(a.createdAt), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default AdminAlertList;
