"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { HeartHandshake, Hourglass, Phone, ShieldAlert, Volume2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { speak, stopSpeaking, useCanSpeak } from "@/lib/onboarding/speech";
import { LESSON_OUTCOME_SPEECH, joinForSpeech } from "@/lib/onboarding/speechText.mjs";
import type { LessonEventKind } from "@/lib/validation";
import { useComfort } from "./ComfortProvider";

const ICONS = { drift: Hourglass, violation: ShieldAlert, help: HeartHandshake } as const;

/**
 * The screen after a lesson the tutor ended for safety. Calm wording, never
 * "you broke a rule"; after a call for help, the free children's helpline.
 * Read aloud by itself when "Read tips aloud" is on.
 */
const LessonOutcome = ({ kind }: { kind: LessonEventKind }) => {
  const t = useTranslations("CourseSession.outcome");
  const locale = useLocale();
  const canRead = useCanSpeak(locale);
  const { settings: comfort } = useComfort();
  const Icon = ICONS[kind];

  // Keys come from a plain JS list shared with the recording script
  const text = t as unknown as (key: string) => string;
  const read = (auto: boolean) =>
    speak(joinForSpeech(LESSON_OUTCOME_SPEECH[kind].map((key) => text(`${kind}.${key}`))), locale, { auto });

  useEffect(() => {
    if (comfort.autoRead && canRead) read(true);
    return () => stopSpeaking();
    // Once, when the screen appears or the setting changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, comfort.autoRead, canRead]);

  return (
    <section className="lesson-outcome" data-kind={kind} role="status" aria-live="polite" data-tour="lesson-outcome">
      <Icon className="size-8 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-xl font-bold">{t(`${kind}.title`)}</h2>
        <p className="text-lg">{t(`${kind}.text`)}</p>
        {kind === "help" && (
          <p className="lesson-helpline">
            <Phone className="size-5 shrink-0" aria-hidden />
            <span>{t("help.line")}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {canRead && (
            <button type="button" className="btn-outline text-base" onClick={() => read(false)}>
              <Volume2 className="size-5" aria-hidden />
              {t("readAloud")}
            </button>
          )}
          <Link href="/" className="btn-primary text-base">
            {t("home")}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LessonOutcome;
