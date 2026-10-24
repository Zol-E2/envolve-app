"use client";
import { removeBookmark } from "@/lib/actions/course.actions";
import { addBookmark } from "@/lib/actions/course.actions";
import { getSubjectLabel } from "@/lib/utils";
import Image from "next/image";
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
  color: string;
  bookmarked: boolean;
  language?: "hu" | "en";
}

const CourseCard = ({
  id,
  name,
  topic,
  subject,
  duration,
  color,
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

  return (
    <article className="course-card" style={{ backgroundColor: color }}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="subject-badge">{getSubjectLabel(tSubjects, subject)}</div>
          {language && (
            <div
              className="subject-badge"
              data-tour="card-language"
              title={t(language === "hu" ? "lessonHu" : "lessonEn")}
              aria-label={t(language === "hu" ? "lessonHu" : "lessonEn")}
            >
              {language.toUpperCase()}
            </div>
          )}
        </div>
        <button
          className="course-bookmark"
          data-tour="card-bookmark"
          onClick={handleBookmark}
          title={t("bookmark")}
        >
          <Image
            src={
              isBookmarked ? "/icons/bookmark-filled.svg" : "/icons/bookmark.svg"
            }
            alt={t("bookmark")}
            width={13}
            height={15}
          />
        </button>
      </div>

      {/* Course content is in the lesson language, which may differ from the
          interface; lang lets read-aloud and screen readers pronounce it right */}
      <h2 className="text-2xl font-bold" lang={language}>
        {name}
      </h2>
      <p className="text-sm" lang={language}>
        {topic}
      </p>
      <div className="flex items-center gap-2">
        <Image
          src="/icons/clock.svg"
          alt=""
          width={14}
          height={14}
        />
        <p className="text-sm">{t("minutes", { count: duration })}</p>
      </div>

      <Link href={`/courses/${id}`} className="w-full" data-tour="card-launch">
        <button className="btn-primary w-full justify-center">
          {t("launchLesson")}
        </button>
      </Link>
    </article>
  );
};

export default CourseCard;
