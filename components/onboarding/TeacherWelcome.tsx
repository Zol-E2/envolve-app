"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { mergeOnboarding } from "@/lib/onboarding/state";
import { speak, stopSpeaking, useCanSpeak } from "@/lib/onboarding/speech";
import { TEACHER_WELCOME_SPEECH, joinForSpeech } from "@/lib/onboarding/speechText.mjs";
import { logOnboardingEvent } from "@/lib/actions/onboarding.actions";
import { useComfort } from "@/components/ComfortProvider";

const STEPS = ["intro", "steps", "ready"] as const;
type Destination = "/" | "/classes" | "/library";

/**
 * A teacher's first visit: three short cards (what eNvolve does for a
 * teacher, the three steps of the work, where to start). No microphone test
 * or children's introduction: those belong to the student view.
 */
const TeacherWelcome = () => {
  const t = useTranslations("TeacherWelcome");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useUser();
  const canRead = useCanSpeak(locale);
  const { settings: comfort } = useComfort();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  useEffect(() => {
    void logOnboardingEvent({ flow: "teacherWelcome", event: "start", locale });
  }, [locale]);

  useEffect(() => {
    stopSpeaking();
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [index]);

  useEffect(() => () => stopSpeaking(), []);

  const readCard = (auto: boolean) => {
    const text = t as unknown as (key: string) => string;
    speak(joinForSpeech(TEACHER_WELCOME_SPEECH[step].map((key) => text(`${step}.${key}`))), locale, { auto });
  };

  useEffect(() => {
    if (comfort.autoRead && canRead && !leaving) readCard(true);
    // Only when the card changes or the setting is switched on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, comfort.autoRead, canRead]);

  const finish = async (destination: Destination, skipped: boolean) => {
    setLeaving(true);
    stopSpeaking();
    void logOnboardingEvent({ flow: "teacherWelcome", event: skipped ? "skip" : "complete", step: index, locale });
    let saved = true;
    try {
      await user?.update({ unsafeMetadata: mergeOnboarding(user.unsafeMetadata, { welcomeDone: true }) });
    } catch (error) {
      saved = false;
      console.warn("Welcome progress not saved:", error);
    }
    // The home page sends unfinished users back here, so avoid a loop
    router.push(!saved && destination === "/" ? "/classes" : destination);
  };

  return (
    <section className="welcome-shell" aria-labelledby="welcome-heading">
      <div className="flex items-center justify-between gap-4">
        <p className="welcome-progress">{t("progress", { current: index + 1, total: STEPS.length })}</p>
        <button type="button" className="welcome-skip" onClick={() => finish("/", true)} disabled={leaving}>
          {t("skip")}
        </button>
      </div>

      <ol className="welcome-dots" aria-hidden="true">
        {STEPS.map((name, dot) => (
          <li key={name} className={cn(dot <= index && "is-done")} />
        ))}
      </ol>

      <div className="welcome-card">
        <h1 id="welcome-heading" ref={headingRef} tabIndex={-1} className="welcome-title">
          {t(`${step}.title`)}
        </h1>
        {step === "intro" && <p className="welcome-lead">{t("intro.text")}</p>}
        {step === "steps" && (
          <ol className="welcome-steps">
            <li>{t("steps.step1")}</li>
            <li>{t("steps.step2")}</li>
            <li>{t("steps.step3")}</li>
          </ol>
        )}
        {step === "ready" && (
          <div className="flex flex-col gap-5">
            <p className="welcome-lead">{t("ready.text")}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-primary text-lg" onClick={() => finish("/classes", false)} disabled={leaving}>
                {t("ready.createClass")}
              </button>
              <button type="button" className="btn-outline text-lg" onClick={() => finish("/library", false)} disabled={leaving}>
                {t("ready.library")}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-outline" onClick={() => setIndex((current) => current - 1)} disabled={index === 0 || leaving}>
          {t("back")}
        </button>
        <div className="flex flex-wrap gap-3">
          {canRead && (
            <button type="button" className="btn-outline" onClick={() => readCard(false)}>
              {t("readAloud")}
            </button>
          )}
          {!isLast && (
            <button type="button" className="btn-primary" onClick={() => setIndex((current) => current + 1)} disabled={leaving}>
              {t("next")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default TeacherWelcome;
