"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bot, Volume2 } from "lucide-react";
import { speak, stopSpeaking, useCanSpeak } from "@/lib/onboarding/speech";
import { AI_NOTICE_SPEECH, joinForSpeech } from "@/lib/onboarding/speechText.mjs";
import { useComfort } from "./ComfortProvider";

/**
 * "Your tutor is a computer": shown on the lesson page until the lesson
 * starts, so every student knows they talk to an AI, not a person (EU AI
 * Act, article 50). Written, read aloud on request, and by itself when
 * "Read tips aloud" is on. The tutor says the same in its first sentence
 * (buildLessonCall in lib/ai/assistants.ts).
 */
const AiNotice = () => {
  const t = useTranslations("CourseSession.aiNotice");
  const locale = useLocale();
  const canRead = useCanSpeak(locale);
  const { settings: comfort } = useComfort();

  // Keys come from a plain JS list shared with the recording script
  const text = t as unknown as (key: string) => string;
  const read = (auto: boolean) =>
    speak(joinForSpeech(AI_NOTICE_SPEECH.map((key) => text(key))), locale, { auto });

  useEffect(() => {
    if (comfort.autoRead && canRead) read(true);
    return () => stopSpeaking();
    // Once, when the note appears or the setting changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comfort.autoRead, canRead]);

  return (
    <section className="lesson-ai-notice" data-tour="lesson-ai-notice" aria-labelledby="ai-notice-title">
      <Bot className="size-8 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-col gap-2">
        <h2 id="ai-notice-title" className="text-xl font-bold max-sm:text-lg">
          {t("title")}
        </h2>
        <p className="text-lg max-sm:text-base">{t("text")}</p>
        {canRead && (
          <button type="button" className="btn-outline w-fit text-base" onClick={() => read(false)}>
            <Volume2 className="size-5" aria-hidden />
            {t("readAloud")}
          </button>
        )}
      </div>
    </section>
  );
};

export default AiNotice;
