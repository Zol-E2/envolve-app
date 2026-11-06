"use client";

import { useState, useSyncExternalStore } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BellRing, HeartHandshake, Hourglass, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { acknowledgeAlert, type LessonAlert } from "@/lib/actions/safety.actions";
import { alertSoundOn, setAlertSound } from "@/lib/alertSound";

const ICONS = { drift: Hourglass, violation: ShieldAlert, help: HeartHandshake } as const;
/** Most important first: a student who may be in danger, then rule breaks, then drift */
const RANK = { help: 0, violation: 1, drift: 2 } as const;
const noSubscribe = () => () => {};

/**
 * "Értesítések az órákról" on the teacher's overview: every lesson of their
 * students that the tutor stopped (assigned or chosen by the student), one
 * card per lesson: who, what happened in one sentence, which course, when.
 * Never what was said. The three kinds look different by importance, and
 * a call for help comes with what to do next. A student leaving a lesson
 * by themselves is not here; that stays in the class progress as before.
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
  const open = alerts
    .filter((a) => !a.seen)
    .sort((a, b) => RANK[a.kind] - RANK[b.kind] || b.createdAt.localeCompare(a.createdAt));
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
      <li key={alert.id} className="lesson-alert" data-kind={alert.kind} data-seen={!actions || undefined}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="alert-level" data-kind={alert.kind}>
            <Icon className="size-5 shrink-0" aria-hidden />
            {t(`level.${alert.kind}`)}
          </span>
          <span className="text-base text-muted-foreground">
            {format.dateTime(new Date(alert.createdAt), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="lesson-alert-who">
            {alert.studentName}
            {alert.className && <span className="font-normal text-muted-foreground"> · {alert.className}</span>}
          </p>
          <p className="text-lg max-sm:text-base">{t(`category.${alert.category}`)}</p>
          {alert.courseName && <p className="text-base text-muted-foreground">{t("course", { name: alert.courseName })}</p>}
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
      data-open={open[0]?.kind}
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
