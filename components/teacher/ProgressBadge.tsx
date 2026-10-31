import { useFormatter, useTranslations } from "next-intl";
import type { StudentProgress } from "@/lib/teacher/status";

/**
 * Status pill plus one short reason ("2 perc után kilépett"). Colour, word
 * and position all say the same thing, so nobody has to rely on colour.
 */
const ProgressBadge = ({ progress, showDetail = true }: { progress: StudentProgress; showDetail?: boolean }) => {
  const t = useTranslations("Status");
  const format = useFormatter();
  const { detail } = progress;

  const reason = !detail
    ? null
    : detail.kind === "left"
      ? t("left", { minutes: detail.minutes })
      : detail.kind === "micDenied"
        ? t("micDenied")
        : detail.kind === "connection"
          ? t("connection")
          : detail.kind === "learningNow"
            ? t("learningNow")
            : detail.kind === "progress"
              ? t("progress", { minutes: detail.minutes, total: detail.total })
              : t("doneOn", { date: format.dateTime(new Date(detail.date), { month: "short", day: "numeric" }) });

  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span className="status-pill" data-status={progress.status}>
          {t(progress.status)}
        </span>
        {progress.late && (
          <span className="status-pill" data-status="late">
            {t("late")}
          </span>
        )}
      </span>
      {showDetail && reason && <span className="person-detail w-full sm:w-auto">{reason}</span>}
    </>
  );
};

export default ProgressBadge;
