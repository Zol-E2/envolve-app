import { getFormatter, getTranslations } from "next-intl/server";
import { Eye, Flag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ModerationCourse } from "@/lib/admin/types";
import SubjectChip from "@/components/SubjectChip";
import CourseStatusPill from "./CourseStatusPill";
import ModerationButtons from "./ModerationButtons";

/**
 * One course in the course check: what it is, who made it, why it is here
 * (the filter or reports), and the admin's decisions.
 */
const CourseModerationCard = async ({ course, first }: { course: ModerationCourse; first?: boolean }) => {
  const [t, tRoles, format] = await Promise.all([
    getTranslations("AdminCourses"),
    getTranslations("AdminUsers"),
    getFormatter(),
  ]);
  const author = [course.authorName, course.authorEmail].filter(Boolean).join(" · ") || t("unknownAuthor");

  return (
    <article className="moderation-card" data-tour={first ? "admin-course-card" : undefined}>
      <header className="flex items-start gap-3">
        <SubjectChip subject={course.subject} />
        {/* Wide enough for the name; the status moves below on narrow screens */}
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
          <h2 className="text-xl leading-tight font-extrabold break-words" lang={course.language}>
            {course.name}
          </h2>
          <p className="text-base text-muted-foreground">
            {author} · {tRoles(`role.${course.authorRole}`)} ·{" "}
            {format.dateTime(new Date(course.createdAt), { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
        <CourseStatusPill visibility={course.visibility} reviewReason={course.reviewReason} featured={course.featured} />
      </header>

      <p className="line-clamp-4 text-lg leading-relaxed" lang={course.language}>
        {course.topic}
      </p>

      {course.reports.length > 0 && (
        <section className="report-list" aria-label={t("reportsLabel")} data-tour={first ? "admin-course-reports" : undefined}>
          <p className="flex items-center gap-2 font-bold">
            <Flag className="size-5 text-destructive" aria-hidden />
            {t("reports", { count: course.reports.length })}
          </p>
          <ul className="flex flex-col gap-1">
            {course.reports.map((report, i) => (
              <li key={i} className="text-base">
                <span className="font-bold">{t(`reason.${report.reason}`)}</span>
                {report.adult && <span className="text-muted-foreground"> · {t("byTeacher")}</span>}
                {report.note && <span className="text-muted-foreground"> · „{report.note}”</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <ModerationButtons
          courseId={course.id}
          visibility={course.visibility}
          featured={course.featured}
          tour={first ? "admin-course-actions" : undefined}
        />
        <Link href={`/courses/${course.id}`} className="btn-quiet">
          <Eye className="size-5" aria-hidden />
          {t("open")}
        </Link>
      </footer>
    </article>
  );
};

export default CourseModerationCard;
