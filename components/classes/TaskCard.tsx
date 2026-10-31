"use client";

import { useEffect } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CalendarDays, Check, Clock, Play, RotateCcw, Volume2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { speak, stopSpeaking, useCanSpeak } from "@/lib/onboarding/speech";
import { useComfort } from "@/components/ComfortProvider";
import type { ClassCourse } from "@/lib/teacher/types";
import type { StudentProgress } from "@/lib/teacher/status";
import SubjectTile from "@/components/SubjectTile";

interface TaskCardProps {
  assignmentId?: string;
  teacherName: string;
  course: Pick<ClassCourse, "id" | "name" | "subject" | "language">;
  minutes: number;
  dueDate: string | null;
  message: string;
  progress?: StudentProgress;
  /** Teacher's support setting: read the message aloud by itself */
  autoRead?: boolean;
  /** On the teacher's assign page: looks the same, but nothing is clickable */
  preview?: boolean;
  tour?: string;
}

/**
 * A task from the teacher on the student's home page: what to do, by when,
 * the teacher's message (with read-aloud), and one big button.
 */
const TaskCard = ({
  assignmentId,
  teacherName,
  course,
  minutes,
  dueDate,
  message,
  progress,
  autoRead = false,
  preview = false,
  tour,
}: TaskCardProps) => {
  const t = useTranslations("Task");
  const format = useFormatter();
  const locale = useLocale();
  const canRead = useCanSpeak(locale);
  const { settings } = useComfort();
  const status = progress?.status ?? "notStarted";
  const done = status === "done";

  const readMessage = (auto: boolean) => {
    if (message) speak(t("messageSpeech", { teacher: teacherName, message }), locale, { auto });
  };

  // Teacher's support or the student's own setting: the message reads itself
  useEffect(() => {
    if (!preview && !done && message && canRead && (autoRead || settings.autoRead)) readMessage(true);
    return () => stopSpeaking();
    // Once per card, when it appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  const due = dueDate
    ? t("due", { date: format.dateTime(new Date(`${dueDate}T12:00:00`), { weekday: "long", month: "short", day: "numeric" }) })
    : null;
  const href = `/courses/${course.id}?assignment=${assignmentId}` as const;
  const action =
    status === "stuck" ? (
      <>
        <RotateCcw className="size-5" aria-hidden />
        {t("tryAgain")}
      </>
    ) : status === "inProgress" ? (
      <>
        <Play className="size-5" fill="currentColor" aria-hidden />
        {t("continue")}
      </>
    ) : (
      <>
        <Play className="size-5" fill="currentColor" aria-hidden />
        {t("start")}
      </>
    );

  return (
    <article className="task-card" data-status={done ? "done" : undefined} data-tour={tour}>
      <div className="flex items-start gap-4">
        <SubjectTile subject={course.subject} className="max-sm:size-14 max-sm:rounded-2xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="task-eyebrow">{t("eyebrow", { teacher: teacherName })}</p>
          <h2 className="today-title" lang={course.language}>
            {course.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            <span className="pill">
              <Clock className="size-4" aria-hidden />
              {t("minutes", { count: minutes })}
            </span>
            {due && (
              // May wrap: a weekday and date are long with big text on a phone
              <span className="pill h-auto min-h-8 py-1 whitespace-normal">
                <CalendarDays className="size-4" aria-hidden />
                {due}
              </span>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="task-message">
          <p className="min-w-0">„{message}”</p>
          {canRead && !preview && (
            <button type="button" className="btn-soft min-h-11 px-4 text-base" onClick={() => readMessage(false)}>
              <Volume2 className="size-5" aria-hidden />
              {t("readMessage")}
            </button>
          )}
        </div>
      )}

      {status === "stuck" && <p className="text-lg">{t("stuckEncourage")}</p>}

      {done ? (
        <p className="flex items-center gap-2 text-lg font-bold text-ok">
          <Check className="size-6" strokeWidth={3} aria-hidden />
          {t("done")}
        </p>
      ) : preview || !assignmentId ? (
        <span className="btn-primary today-action pointer-events-none w-full" aria-hidden>
          {action}
        </span>
      ) : (
        <Link href={href} className="btn-primary today-action w-full">
          {action}
        </Link>
      )}
    </article>
  );
};

export default TaskCard;
