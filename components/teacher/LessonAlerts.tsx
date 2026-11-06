"use client";

import { useState, useSyncExternalStore } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BellRing, HeartHandshake, Hourglass, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { acknowledgeAlert, type LessonAlert } from "@/lib/actions/safety.actions";
import { alertSoundOn, setAlertSound } from "@/lib/alertSound";

const ICONS = { drift: Hourglass, violation: ShieldAlert, help: HeartHandshake } as const;
const noSubscribe = () => () => {};

/**
 * "Értesítések az órákról" on the teacher's overview: which student, which
 * lesson, what kind, never what was said. A call for help is not shown as
 * a rule break and comes with what to do next.
 */
const LessonAlerts = ({ alerts }: { alerts: LessonAlert[] }) => {
  const t = useTranslations("Safety");
  const format = useFormatter();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // The saved choice (browser only), until the teacher changes it here
  const stored = useSyncExternalStore(noSubscribe, alertSoundOn, () => true);
  const [chosen, setChosen] = useState<boolean | null>(null);
  const sound = chosen ?? stored;

  // Every unopened alert waits here, from any lesson of the teacher's
  // students (assigned or chosen by the student), until it is opened
  const open = alerts.filter((a) => !a.seen);
  const recent = alerts.filter((a) => a.seen).slice(0, 10);

  const acknowledge = async (id: string, falseAlarm = false) => {
    setBusy(id);
    setFailed(false);
    try {
      await acknowledgeAlert({ id, falseAlarm });
      router.refresh();
    } catch {
      setFailed(true);
    }
    setBusy(null);
  };

  const toggleSound = () => {
    setAlertSound(!sound);
    setChosen(!sound);
  };

  const item = (alert: LessonAlert, actions: boolean) => {
    const Icon = ICONS[alert.kind];
    return (
      <li key={alert.id} className="lesson-alert" data-kind={alert.kind}>
        <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-bold">{t(`kind.${alert.kind}`)}</p>
          <p className="text-base">
            {[alert.studentName, alert.className, alert.courseName].filter(Boolean).join(" · ")} ·{" "}
            {format.dateTime(new Date(alert.createdAt), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-base text-muted-foreground">{t(`category.${alert.category}`)}</p>
          {alert.kind === "help" && actions && <p className="text-base">{t("helpGuidance")}</p>}
          {!actions && alert.falseAlarm && <p className="text-base text-muted-foreground">{t("markedFalse")}</p>}
          {actions && (
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary text-base"
                disabled={busy === alert.id}
                onClick={() => acknowledge(alert.id)}
              >
                {alert.kind === "help" ? t("seenHelp") : t("seen")}
              </button>
              <button
                type="button"
                className="btn-quiet"
                disabled={busy === alert.id}
                onClick={() => acknowledge(alert.id, true)}
              >
                {t("falseAlarm")}
              </button>
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <section
      id="alerts"
      className="lesson-alerts flex scroll-mt-24 flex-col gap-3"
      data-open={open.length > 0 || undefined}
      aria-labelledby="alerts-title"
      data-tour="teacher-alerts"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="alerts-title" className="flex flex-wrap items-center gap-2 text-2xl font-bold max-sm:text-xl">
          <BellRing className="size-6 text-primary" aria-hidden />
          {t("title")}
          {open.length > 0 && <span className="alert-count">{t("openBadge", { count: open.length })}</span>}
        </h2>
        <button type="button" className="btn-quiet" onClick={toggleSound} aria-pressed={sound}>
          {sound ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
          {sound ? t("soundOn") : t("soundOff")}
        </button>
      </div>
      {open.length === 0 ? (
        <p className="card text-lg text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="flex flex-col gap-3">{open.map((a) => item(a, true))}</ul>
      )}
      {failed && (
        <p className="field-error" role="alert">
          {t("saveError")}
        </p>
      )}
      {recent.length > 0 && (
        <details className="lesson-alerts-earlier">
          <summary className="btn-quiet w-fit">{t("earlier", { count: recent.length })}</summary>
          <ul className="mt-2 flex flex-col gap-3">{recent.map((a) => item(a, false))}</ul>
        </details>
      )}
    </section>
  );
};

export default LessonAlerts;
