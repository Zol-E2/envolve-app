"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { markStuckHandled } from "@/lib/actions/teacher.actions";

/**
 * "Kezeltem" next to a stuck student: the teacher has dealt with it, so the
 * lesson stops showing as stuck until the student's next attempt.
 */
const MarkHandledButton = ({
  assignmentId,
  studentId,
  studentName,
}: {
  assignmentId: string;
  studentId: string;
  studentName: string;
}) => {
  const t = useTranslations("ClassDetail");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const mark = () =>
    startTransition(async () => {
      setFailed(false);
      try {
        await markStuckHandled({ assignmentId, studentId });
        router.refresh();
      } catch {
        setFailed(true);
      }
    });

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn-outline min-h-11 px-4 py-2 text-base"
        onClick={mark}
        disabled={pending}
        aria-label={`${t("markHandled")}: ${studentName}`}
      >
        <Check className="size-5" aria-hidden />
        {t("markHandled")}
      </button>
      {failed && (
        <span className="field-error" role="alert">
          {t("markHandledError")}
        </span>
      )}
    </span>
  );
};

export default MarkHandledButton;
