import { Check, CircleAlert, Clock, Mic, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

/*
 * Drawn previews of the app for the landing page, built from the app's own
 * colours instead of screenshots: they stay sharp at any size, weigh almost
 * nothing, and never show a real child's name. Decorative: the figure around
 * them describes them in words (aria-label).
 */

/** A student's lesson in a browser window: the tutor speaking, with the caption */
export const LessonMock = async () => {
  const t = await getTranslations("Landing.mock");
  return (
    <div className="mock-window" aria-hidden="true">
      <div className="mock-window-bar">
        <span className="mock-dot" />
        <span className="mock-dot" />
        <span className="mock-dot" />
        <span className="mock-url">{t("url")}</span>
      </div>
      <div className="mock-lesson">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-[1.05em] font-extrabold">{t("course")}</p>
            <p className="text-[0.75em] text-muted-foreground">{t("subject")}</p>
          </div>
          <span className="mock-chip bg-turn-soft text-turn-deep">
            <Mic className="size-[1em]" /> {t("speaking")}
          </span>
        </div>
        <div className="mock-tutor">
          <span className="mock-ring" />
          <span className="mock-ring mock-ring-2" />
          <Image src="/icons/icon-192.png" alt="" width={192} height={192} sizes="96px" className="mock-face" />
        </div>
        <p className="mock-caption">{t("caption")}</p>
        <span className="mock-end">{t("end")}</span>
      </div>
    </div>
  );
};

/** The teacher's overview on a phone: one class with its progress */
export const TeacherMock = async ({ compact = false }: { compact?: boolean }) => {
  const t = await getTranslations("Landing.mock");
  const rows = [
    { name: t("student1"), status: t("done"), icon: Check, tone: "bg-ok-soft text-ok" },
    { name: t("student2"), status: t("stuck"), icon: CircleAlert, tone: "bg-warn-soft text-warn" },
    { name: t("student3"), status: t("inProgress"), icon: Clock, tone: "bg-turn-soft text-turn-deep" },
  ];
  return (
    <div className={compact ? "mock-phone mock-phone-compact" : "mock-phone"} aria-hidden="true">
      <p className="text-[0.7em] font-bold text-muted-foreground">{t("overview")}</p>
      <p className="mb-2 font-display text-[0.95em] font-extrabold">{t("className")}</p>
      {/* The small phone beside the window has no room for the totals */}
      {!compact && (
        <div className="mb-2 grid grid-cols-3 gap-1.5 text-center">
          <span className="mock-stat bg-ok-soft text-ok"><b>12</b>{t("done")}</span>
          <span className="mock-stat bg-warn-soft text-warn"><b>1</b>{t("stuck")}</span>
          <span className="mock-stat bg-turn-soft text-turn-deep"><b>3</b>{t("inProgress")}</span>
        </div>
      )}
      <ul className="grid gap-1.5">
        {rows.map(({ name, status, icon: Icon, tone }) => (
          <li key={name} className="mock-row">
            <span className="truncate font-bold">{name}</span>
            <span className={`mock-chip ${tone}`}>
              <Icon className="size-[1em]" /> {status}
            </span>
          </li>
        ))}
      </ul>
      {!compact && <span className="mock-handled">{t("handled")}</span>}
    </div>
  );
};

/** A small floating notice: lesson safety at work */
export const SafetyBadge = async () => {
  const t = await getTranslations("Landing.mock");
  return (
    <div className="mock-badge" aria-hidden="true">
      <span className="flex size-[2em] shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
        <ShieldCheck className="size-[1.1em]" />
      </span>
      {t("safe")}
    </div>
  );
};
