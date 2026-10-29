"use client";
import { removeBookmark } from "@/lib/actions/course.actions";
import { addBookmark } from "@/lib/actions/course.actions";
import { getSubjectLabel } from "@/lib/utils";
import { Bookmark, BookmarkCheck, Clock, Play } from "lucide-react";
import SubjectTile from "./SubjectTile";
import { Link } from "@/i18n/navigation";
// Deliberately the plain Next.js hooks: revalidatePath() needs the real
// locale-prefixed path (/en/courses), and router.refresh() is locale-agnostic.
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startTransition, useState } from "react";

interface CourseCardProps {
  id: string;
  name: string;
  topic: string;
  subject: string;
  duration: number;
  /** Kept for callers; the subject tile picks its own colour */
  color?: string;
  bookmarked: boolean;
  language?: "hu" | "en";
}

const CourseCard = ({
  id,
  name,
  topic,
  subject,
  duration,
  bookmarked,
  language,
}: CourseCardProps) => {
  const t = useTranslations("CourseCard");
  const tSubjects = useTranslations("Subjects");
  const [isBookmarked, setIsBookmarked] = useState(bookmarked);
  const router = useRouter();
  const pathname = usePathname();

  const handleBookmark = () => {
    startTransition(async () => {
      if (isBookmarked) {
        await removeBookmark(id, pathname);
        setIsBookmarked(false);
      } else {
        await addBookmark(id, pathname);
        setIsBookmarked(true);
      }
      router.refresh();
    });
  };

  const languageLabel = language ? t(language === "hu" ? "lessonHu" : "lessonEn") : "";

  // Same structure on every card (tile, title, details, buttons in the same
  // place), so students learn it once and can scan a list of cards quickly
  return (
    <article className="course-card">
      <div className="course-card-head">
        <SubjectTile subject={subject} />
        <div className="flex min-w-0 flex-col">
          {/* Course content is in the lesson language, which may differ from the
              interface; lang lets read-aloud and screen readers pronounce it right */}
          <h2 className="text-[21px] leading-tight font-bold" lang={language}>
            {name}
          </h2>
          <p className="text-[15px] font-bold text-muted-foreground">
            {getSubjectLabel(tSubjects, subject)}
          </p>
        </div>
      </div>

      <p className="line-clamp-2 text-base text-muted-foreground" lang={language}>
        {topic}
      </p>

      <div className="flex flex-wrap gap-2">
        <span className="pill">
          <Clock className="size-4" aria-hidden />
          {t("minutes", { count: duration })}
        </span>
        {language && (
          <span className="pill" data-tour="card-language" title={languageLabel}>
            <span aria-hidden>{language.toUpperCase()}</span>
            <span className="sr-only">{languageLabel}</span>
          </span>
        )}
      </div>

      <div className="mt-auto flex gap-2">
        <Link href={`/courses/${id}`} className="btn-soft flex-1 px-4 text-[17px] whitespace-nowrap" data-tour="card-launch">
          <Play className="size-5" fill="currentColor" aria-hidden />
          {t("launchLesson")}
        </Link>
        <button
          type="button"
          className="course-bookmark px-3 text-[15px]"
          data-tour="card-bookmark"
          onClick={handleBookmark}
          aria-pressed={isBookmarked}
          title={t("bookmark")}
        >
          {isBookmarked ? (
            <BookmarkCheck className="size-5" aria-hidden />
          ) : (
            <Bookmark className="size-5" aria-hidden />
          )}
          {isBookmarked ? t("saved") : t("save")}
        </button>
      </div>
    </article>
  );
};

export default CourseCard;
