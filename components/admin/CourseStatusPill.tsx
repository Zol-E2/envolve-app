import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import type { ModerationCourse } from "@/lib/admin/types";

/** Where a course stands: public, waiting (and why) or hidden; never colour alone */
const STATUS = {
  public: "done",
  reports: "stuck",
  filter: "late",
  unchecked: "notStarted",
  hidden: "notStarted",
} as const;

const CourseStatusPill = async ({
  visibility,
  reviewReason,
  featured,
}: Pick<ModerationCourse, "visibility" | "reviewReason" | "featured">) => {
  const t = await getTranslations("AdminCourses");
  const key = visibility === "review" ? (reviewReason ?? "unchecked") : visibility;
  return (
    <span className="flex flex-wrap gap-2">
      <span className="status-pill" data-status={STATUS[key]}>
        {t(`status.${key}`)}
      </span>
      {featured && (
        <span className="status-pill" data-status="inProgress">
          <Star className="size-4" aria-hidden />
          {t("status.featured")}
        </span>
      )}
    </span>
  );
};

export default CourseStatusPill;
