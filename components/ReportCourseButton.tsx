"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Flag, Volume2 } from "lucide-react";
import { reportCourse, type ReportStatus } from "@/lib/actions/course.actions";
import { REPORT_REASONS, type ReportReason } from "@/lib/validation";
import { speak, stopSpeaking, useCanSpeak } from "@/lib/onboarding/speech";
import { REPORT_SPEECH, joinForSpeech } from "@/lib/onboarding/speechText.mjs";
import { useComfort } from "./ComfortProvider";

/**
 * "Something is wrong with this course": a child can tell an adult with two
 * taps. One report from a teacher, or three from students, takes the course
 * out of the library until an admin looks at it.
 */
const ReportCourseButton = ({ courseId }: { courseId: string }) => {
  const t = useTranslations("Report");
  const locale = useLocale();
  const canRead = useCanSpeak(locale);
  const { settings: comfort } = useComfort();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReportStatus | "error" | null>(null);

  // Keys come from a plain JS list shared with the recording script
  const read = (auto: boolean) =>
    speak(joinForSpeech(REPORT_SPEECH.map((key) => t(key as "question" | ReportReason))), locale, { auto });

  // "Read tips aloud" setting: the question reads itself when it opens
  useEffect(() => {
    if (open && comfort.autoRead && canRead) read(true);
    return () => stopSpeaking();
    // Only when the form opens or the setting changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, comfort.autoRead, canRead]);

  if (result && result !== "error" && result !== "invalid") {
    return (
      <p className="report-done" role="status">
        {t(`result.${result}`)}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-quiet" onClick={() => setOpen(true)} data-tour="lesson-report">
        <Flag className="size-5" aria-hidden />
        {t("open")}
      </button>
    );
  }

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) return;
    setBusy(true);
    try {
      setResult(await reportCourse({ courseId, reason, note }));
    } catch {
      setResult("error");
    }
    setBusy(false);
  };

  return (
    <form className="report-form" onSubmit={send} noValidate>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-xl font-bold">{t("question")}</span>
          {canRead && (
            <button type="button" className="btn-quiet" onClick={() => read(false)}>
              <Volume2 className="size-5" aria-hidden />
              {t("readAloud")}
            </button>
          )}
        </legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="choice">
            <input
              type="radio"
              name="report-reason"
              className="sr-only"
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            <span className="choice-radio" aria-hidden />
            <span className="choice-label">{t(r)}</span>
          </label>
        ))}
      </fieldset>
      <div className="field-group">
        <label htmlFor="report-note" className="field-label text-base">
          {t("note")}
        </label>
        <textarea
          id="report-note"
          className="field"
          rows={2}
          maxLength={300}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      {(result === "error" || result === "invalid") && (
        <p className="field-error" role="alert">
          {t("error")}
        </p>
      )}
      <div className="form-nav">
        <button type="button" className="btn-outline" onClick={() => setOpen(false)} disabled={busy}>
          {t("cancel")}
        </button>
        <button type="submit" className="btn-primary" disabled={busy || !reason}>
          {busy ? t("sending") : t("send")}
        </button>
      </div>
    </form>
  );
};

export default ReportCourseButton;
