"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * A button that asks once more before doing something that cannot be undone
 * (removing a student, deleting an assignment or a class). The question is
 * shown in the page, not in a browser pop-up.
 */
const ConfirmAction = ({
  label,
  question,
  confirmLabel,
  action,
  afterHref,
  icon,
  className = "btn-quiet",
  tour,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  action: () => Promise<unknown>;
  /** Where to go afterwards; stays on the page when omitted */
  afterHref?: "/classes";
  icon?: ReactNode;
  className?: string;
  tour?: string;
}) => {
  const t = useTranslations("Classes");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await action();
      if (afterHref) router.push(afterHref);
      else router.refresh();
      setAsking(false);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)} data-tour={tour}>
        {icon}
        {label}
      </button>
    );
  }
  return (
    <span className="flex w-full flex-wrap items-center gap-2" role="group" aria-label={question}>
      <span className="text-base font-bold">{question}</span>
      <button type="button" className="btn-danger" onClick={run} disabled={busy}>
        {confirmLabel}
      </button>
      <button type="button" className="btn-quiet" onClick={() => setAsking(false)} disabled={busy}>
        {t("cancel")}
      </button>
      {failed && (
        <span className="field-error w-full" role="alert">
          {t("actionError")}
        </span>
      )}
    </span>
  );
};

export default ConfirmAction;
