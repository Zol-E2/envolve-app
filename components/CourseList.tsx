import { ArrowRight } from "lucide-react";
import { cn, getSubjectLabel } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import SubjectTile from "./SubjectTile";

interface CourseListProps {
  title: string;
  courses?: Course[];
  classNames?: string;
  /** data-tour target for the page tour */
  tour?: string;
  /** Shown instead of the list when there are no courses */
  emptyMessage?: string;
  emptyAction?: { href: string; label: string };
}

/**
 * A simple list instead of a table: one row per course, the whole row is
 * one big tap target, and it reads the same on a phone as on a desktop.
 */
const CourseList = ({
  title,
  courses,
  classNames,
  tour,
  emptyMessage,
  emptyAction,
}: CourseListProps) => {
  const t = useTranslations("CourseList");
  const tSubjects = useTranslations("Subjects");

  return (
    <article className={cn("course-list", classNames)} data-tour={tour}>
      <h2 className="text-2xl font-bold max-sm:text-xl">{title}</h2>

      {!courses?.length ? (
        // An empty list gives a new user nothing to do, so offer the next step
        <div className="list-empty">
          <p>{emptyMessage ?? t("empty")}</p>
          {emptyAction && (
            <Link href={emptyAction.href} className="btn-primary w-fit">
              {emptyAction.label}
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col">
          {courses.map(({ id, name, subject, duration, language }, index) => (
            <li key={`${id}-${index}`}>
              <Link href={`/courses/${id}`} className="course-row group">
                <SubjectTile subject={subject} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-lg leading-snug font-bold group-hover:underline" lang={language}>
                    {name}
                  </span>
                  <span className="text-[15px] text-muted-foreground">
                    {getSubjectLabel(tSubjects, subject)} · {duration} {t("min")}
                    {language && ` · ${language.toUpperCase()}`}
                  </span>
                </span>
                <span className="course-row-go" aria-hidden>
                  <ArrowRight className="size-5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
};

export default CourseList;
