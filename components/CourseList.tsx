import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, getSubjectColor, getSubjectLabel } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface CourseListProps {
  title: string;
  courses?: Course[];
  classNames?: string;
  /** data-tour target for the page tour */
  tour?: string;
  /** Shown instead of the table when there are no courses */
  emptyMessage?: string;
  emptyAction?: { href: string; label: string };
}

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
      <h2 className="font-bold text-3xl">{title}</h2>

      {!courses?.length ? (
        // An empty table gives a new user nothing to do, so offer the next step
        <div className="list-empty">
          <p>{emptyMessage ?? t("empty")}</p>
          {emptyAction && (
            <Link href={emptyAction.href} className="btn-primary w-fit">
              {emptyAction.label}
            </Link>
          )}
        </div>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-lg w-2/3">{t("lessons")}</TableHead>
            <TableHead className="text-lg">{t("subject")}</TableHead>
            <TableHead className="text-lg text-right">{t("duration")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses?.map(({ id, name, subject, duration, topic }) => (
            <TableRow key={id}>
              <TableCell>
                <Link href={`/courses/${id}`}>
                  <div className="flex items-center gap-2">
                    <div
                      className="size-[72px] 
                    flex items-center 
                    justify-center 
                    rounded-lg max-md:hidden"
                      style={{ backgroundColor: getSubjectColor(subject) }}
                    >
                      <Image
                        src={`/icons/${subject}.svg`}
                        alt={getSubjectLabel(tSubjects, subject)}
                        width={35}
                        height={35}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="font-bold text-2xl">{name}</p>
                      <p className="text-lg">{topic}</p>
                    </div>
                  </div>
                </Link>
              </TableCell>
              <TableCell>
                <div className="subject-badge w-fit max-md:hidden">
                  {getSubjectLabel(tSubjects, subject)}
                </div>
                <div
                  className="flex 
                items-center 
                justify-center 
                rounded-lg 
                w-fit 
                p-2 
                md:hidden"
                  style={{ backgroundColor: getSubjectColor(subject) }}
                >
                  <Image
                    src={`/icons/${subject}.svg`}
                    alt={getSubjectLabel(tSubjects, subject)}
                    width={18}
                    height={18}
                  />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2 w-full">
                  <p className="text-2xl">
                    {duration} <span className="max-md:hidden">{t("min")}</span>
                  </p>
                  <Image
                    src={`/icons/clock.svg`}
                    alt={t("min")}
                    width={14}
                    height={14}
                    className="md:hidden"
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
    </article>
  );
};

export default CourseList;
