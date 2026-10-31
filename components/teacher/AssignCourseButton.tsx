"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface AssignCourseButtonProps {
  courseId: string;
  classes: { id: string; name: string }[];
  className?: string;
  tour?: string;
  /** Open the class menu towards the left (for a button at the right edge) */
  menuAlign?: "start" | "end";
}

/**
 * "Kiosztom": straight to the assign form with this course picked. With
 * several classes it first asks which one; with none it points to creating one.
 */
const AssignCourseButton = ({
  courseId,
  classes,
  className = "btn-primary min-h-11 px-4 text-base",
  tour,
  menuAlign = "start",
}: AssignCourseButtonProps) => {
  const t = useTranslations("Library");

  if (classes.length === 0) {
    return (
      <Link href="/classes" className="btn-outline min-h-11 px-4 text-base" data-tour={tour}>
        {t("needClass")}
      </Link>
    );
  }
  if (classes.length === 1) {
    return (
      <Link href={`/classes/${classes[0].id}/assign?course=${courseId}`} className={className} data-tour={tour}>
        <Send className="size-5" aria-hidden />
        {t("assign")}
      </Link>
    );
  }
  return (
    <details className="assign-picker" data-tour={tour}>
      <summary className={className}>
        <Send className="size-5" aria-hidden />
        {t("assign")}
        <ChevronDown className="size-5" aria-hidden />
      </summary>
      <div className="assign-picker-menu" data-align={menuAlign}>
        <p className="px-3 pt-1 text-[0.9375rem] font-bold text-muted-foreground">{t("whichClass")}</p>
        {classes.map((c) => (
          <Link key={c.id} href={`/classes/${c.id}/assign?course=${courseId}`} className="class-sidebar-link">
            {c.name}
          </Link>
        ))}
      </div>
    </details>
  );
};

export default AssignCourseButton;
