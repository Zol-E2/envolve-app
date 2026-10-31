import { useTranslations } from "next-intl";
import { Clock, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSubjectLabel } from "@/lib/utils";
import SubjectTile from "@/components/SubjectTile";
import AssignCourseButton from "./AssignCourseButton";

interface LibraryCourseCardProps {
  course: Pick<Course, "id" | "name" | "subject" | "topic" | "duration" | "language">;
  classes: { id: string; name: string }[];
  first?: boolean;
}

/** A course in the teacher's library: try it, or hand it out to a class */
const LibraryCourseCard = ({ course, classes, first }: LibraryCourseCardProps) => {
  const t = useTranslations("Library");
  const tSubjects = useTranslations("Subjects");

  return (
    <article className="course-card">
      <div className="course-card-head">
        <SubjectTile subject={course.subject} />
        <div className="flex min-w-0 flex-col">
          <h3 className="text-[1.3125rem] leading-tight font-bold" lang={course.language}>
            {course.name}
          </h3>
          <p className="text-[0.9375rem] font-bold text-muted-foreground">{getSubjectLabel(tSubjects, course.subject)}</p>
        </div>
      </div>
      <p className="line-clamp-2 text-base text-muted-foreground" lang={course.language}>
        {course.topic}
      </p>
      <div className="flex flex-wrap gap-2">
        <span className="pill">
          <Clock className="size-4" aria-hidden />
          {t("minutes", { count: course.duration })}
        </span>
        {course.language && <span className="pill">{course.language.toUpperCase()}</span>}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <AssignCourseButton courseId={course.id} classes={classes} tour={first ? "library-assign" : undefined} />
        <Link href={`/courses/${course.id}`} className="btn-outline min-h-11 px-4 text-base" data-tour={first ? "library-try" : undefined}>
          <Play className="size-5" aria-hidden />
          {t("try")}
        </Link>
      </div>
    </article>
  );
};

export default LibraryCourseCard;
