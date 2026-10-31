import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import type { ModerationCourse } from "@/lib/admin/types";
import CourseStatusPill from "./CourseStatusPill";
import ModerationButtons from "./ModerationButtons";

/** On a lesson preview, for admins: where the course stands and the decisions */
const AdminCourseBar = async ({
  courseId,
  status,
}: {
  courseId: string;
  status: Pick<ModerationCourse, "visibility" | "reviewReason" | "featured">;
}) => {
  const t = await getTranslations("AdminCourses");
  return (
    <section className="admin-course-bar" aria-label={t("barLabel")} data-tour="admin-course-bar">
      <div className="flex flex-wrap items-center gap-3">
        <ShieldCheck className="size-6 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 basis-60 text-lg">{t("barNote")}</p>
        <CourseStatusPill {...status} />
      </div>
      <ModerationButtons
        courseId={courseId}
        visibility={status.visibility}
        featured={status.featured}
        afterDelete="/admin/courses"
      />
    </section>
  );
};

export default AdminCourseBar;
