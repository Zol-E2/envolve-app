"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, EyeOff, Star, StarOff, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { moderateCourse } from "@/lib/actions/admin.actions";
import type { ModerationAction } from "@/lib/validation";

/**
 * An admin's decisions on one course: make it public, hide it, recommend
 * it, or delete it (asks once more, in the page). Every decision is written
 * to the admin log by the database.
 */
const ModerationButtons = ({
  courseId,
  visibility,
  featured,
  afterDelete,
  tour,
}: {
  courseId: string;
  visibility: "public" | "review" | "hidden";
  featured: boolean;
  /** Where to go after deleting (the preview page would be gone) */
  afterDelete?: "/admin/courses";
  tour?: string;
}) => {
  const t = useTranslations("AdminCourses");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async (action: ModerationAction) => {
    setBusy(true);
    setFailed(false);
    try {
      await moderateCourse({ courseId, action });
      if (action === "deleted" && afterDelete) router.push(afterDelete);
      else router.refresh();
      setAsking(false);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-tour={tour}>
      {visibility !== "public" && (
        <button type="button" className="btn-primary text-base" disabled={busy} onClick={() => run("public")}>
          <Check className="size-5" aria-hidden />
          {t("makePublic")}
        </button>
      )}
      {visibility !== "hidden" && (
        <button type="button" className="btn-outline text-base" disabled={busy} onClick={() => run("hidden")}>
          <EyeOff className="size-5" aria-hidden />
          {t("hide")}
        </button>
      )}
      {visibility === "public" && (
        <button
          type="button"
          className="btn-outline text-base"
          disabled={busy}
          onClick={() => run(featured ? "unfeatured" : "featured")}
        >
          {featured ? <StarOff className="size-5" aria-hidden /> : <Star className="size-5" aria-hidden />}
          {featured ? t("unfeature") : t("feature")}
        </button>
      )}
      {!asking ? (
        <button type="button" className="btn-quiet" disabled={busy} onClick={() => setAsking(true)}>
          <Trash2 className="size-5" aria-hidden />
          {t("delete")}
        </button>
      ) : (
        <span className="flex w-full flex-wrap items-center gap-2" role="group" aria-label={t("deleteQuestion")}>
          <span className="text-base font-bold">{t("deleteQuestion")}</span>
          <button type="button" className="btn-danger" disabled={busy} onClick={() => run("deleted")}>
            {t("deleteConfirm")}
          </button>
          <button type="button" className="btn-quiet" disabled={busy} onClick={() => setAsking(false)}>
            {t("cancel")}
          </button>
        </span>
      )}
      {failed && (
        <p className="field-error w-full" role="alert">
          {t("actionError")}
        </p>
      )}
    </div>
  );
};

export default ModerationButtons;
