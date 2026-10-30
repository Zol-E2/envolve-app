"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { mergeOnboarding, writeLocalOnboarding } from "@/lib/onboarding/state";
import { speak, stopSpeaking, useCanSpeak } from "@/lib/onboarding/speech";
import { WELCOME_SPEECH, joinForSpeech } from "@/lib/onboarding/speechText.mjs";
import { logOnboardingEvent } from "@/lib/actions/onboarding.actions";
import MicTest, { type MicResult } from "./MicTest";
import DemoCall from "./DemoCall";
import { useComfort } from "@/components/ComfortProvider";

const STEPS = ["intro", "lesson", "mic", "ready"] as const;
type Destination = "/" | "/courses" | "/courses/new";

/**
 * First-visit welcome: four short cards (what eNvolve is, how a lesson goes,
 * microphone check, where to start). One idea per card, no time limits,
 * skippable at any point, with optional read-aloud.
 */
const WelcomeFlow = () => {
  const t = useTranslations("Welcome");
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
    void logOnboardingEvent({ flow: "welcome", event: "start", locale });
  }, [locale]);

  // Move focus to the new card's heading so keyboard and screen-reader users
  // land on the new content; skip on first load to keep the page calm
  useEffect(() => {
    stopSpeaking();
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [index]);

  useEffect(() => () => stopSpeaking(), []);

  const finish = async (destination: Destination, skipped: boolean) => {
    setLeaving(true);
    stopSpeaking();
    void logOnboardingEvent({
      flow: "welcome",
      event: skipped ? "skip" : "complete",
      step: index,
      locale,
    });

    let saved = true;
    if (user) {
      try {
        await user.update({
          unsafeMetadata: mergeOnboarding(user.unsafeMetadata, {
            welcomeDone: true,
          }),
        });
      } catch (error) {
        saved = false;
        console.warn("Welcome progress not saved:", error);
      }
    } else {
      writeLocalOnboarding({ welcomeDone: true });
    }

    // The home page sends unfinished users back here, so if saving failed
    // go somewhere that does not redirect
    router.push(!saved && destination === "/" ? "/courses" : destination);
  };

  const onMicResult = (result: MicResult) => {
    const event = result === "granted" ? "mic_granted" : result === "denied" ? "mic_denied" : "mic_unavailable";
    void logOnboardingEvent({ flow: "welcome", event, locale });
  };

  // The card's texts only, not its buttons or the mic test status, so the
  // same sentence can be played from the recording
  const readCard = (auto: boolean) => {
    const text = t as unknown as (key: string) => string;
    speak(joinForSpeech(WELCOME_SPEECH[step].map((key) => text(`${step}.${key}`))), locale, { auto });
  };
  const readAloud = () => readCard(false);

  // "Read tips aloud" setting (profile page): every new card reads itself
  useEffect(() => {
    if (comfort.autoRead && canRead && !leaving) readCard(true);
    // Only when the card changes or the setting is switched on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, comfort.autoRead, canRead]);

  return (
    <section className="welcome-shell" aria-labelledby="welcome-heading">
      <div className="flex items-center justify-between gap-4">
        <p className="welcome-progress">
          {t("progress", { current: index + 1, total: STEPS.length })}
        </p>
        <button
          type="button"
          className="welcome-skip"
          onClick={() => finish("/", true)}
          disabled={leaving}
        >
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

        {step === "intro" && (
          <div className="flex gap-6 items-center max-md:flex-col-reverse">
            <div className="flex flex-col gap-4">
              <p className="welcome-lead">{t("intro.text")}</p>
              <ul className="welcome-list">
                <li>{t("intro.point1")}</li>
                <li>{t("intro.point2")}</li>
                <li>{t("intro.point3")}</li>
              </ul>
            </div>
            <Image
              src="/images/cta.svg"
              alt=""
              width={260}
              height={166}
              className="max-md:hidden"
            />
          </div>
        )}

        {step === "lesson" && (
          <div className="flex flex-col gap-4">
            <ol className="welcome-steps">
              <li>{t("lesson.step1")}</li>
              <li>{t("lesson.step2")}</li>
              <li>{t("lesson.step3")}</li>
            </ol>
            <p className="welcome-note">{t("lesson.note")}</p>
          </div>
        )}

        {step === "mic" && (
          <div className="flex flex-col gap-4">
            <p className="welcome-lead">{t("mic.text")}</p>
            <MicTest onResult={onMicResult} />
          </div>
        )}

        {step === "ready" && (
          <div className="flex flex-col gap-5">
            <p className="welcome-lead">{t("ready.text")}</p>
            <DemoCall />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-primary text-lg"
                onClick={() => finish("/courses/new", false)}
                disabled={leaving}
              >
                {t("ready.create")}
              </button>
              <button
                type="button"
                className="btn-outline text-lg"
                onClick={() => finish("/courses", false)}
                disabled={leaving}
              >
                {t("ready.browse")}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn-outline"
          onClick={() => setIndex((current) => current - 1)}
          disabled={index === 0 || leaving}
        >
          {t("back")}
        </button>
        <div className="flex flex-wrap gap-3">
          {canRead && (
            <button type="button" className="btn-outline" onClick={readAloud}>
              {t("readAloud")}
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIndex((current) => current + 1)}
              disabled={leaving}
            >
              {t("next")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default WelcomeFlow;
