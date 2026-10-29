"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { vapi } from "@/lib/vapi.sdk";
import { VAPI_DEMO_ASSISTANT_IDS, isLessonLanguage } from "@/lib/ai/assistants";
import { getMicPermission } from "@/lib/onboarding/microphone";
import { stopSpeaking } from "@/lib/onboarding/speech";

type DemoStatus = "idle" | "connecting" | "active" | "ended";

/**
 * Optional spoken introduction on the welcome screen: a short voice
 * conversation with the demo assistant, which explains the app in the
 * interface language and answers questions about it. Helpful for students
 * who find reading hard. Nothing is saved to the lesson history.
 */
const DemoCall = () => {
  const t = useTranslations("Welcome.demo");
  const locale = useLocale();
  const [status, setStatus] = useState<DemoStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const inCall = useRef(false);

  useEffect(() => {
    const onCallStart = () => {
      inCall.current = true;
      setStatus("active");
    };
    const onCallEnd = () => {
      inCall.current = false;
      setIsSpeaking(false);
      setStatus("ended");
    };
    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    const onError = async (error: unknown) => {
      console.log("Demo call error:", error);
      if ((await getMicPermission()) === "denied") setMicBlocked(true);
      setStatus((current) => (current === "connecting" ? "idle" : current));
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
      // Leaving the welcome screen mid-demo must not leave the call running
      if (inCall.current) vapi.stop();
    };
  }, []);

  const start = async () => {
    stopSpeaking();
    if ((await getMicPermission()) === "denied") {
      setMicBlocked(true);
      return;
    }
    setMicBlocked(false);
    setStatus("connecting");
    const language = isLessonLanguage(locale) ? locale : "hu";
    vapi.start(VAPI_DEMO_ASSISTANT_IDS[language]);
  };

  const stop = () => {
    vapi.stop();
    setStatus("ended");
  };

  const statusText =
    status === "connecting"
      ? t("connecting")
      : status === "active"
        ? isSpeaking
          ? t("speaking")
          : t("yourTurn")
        : status === "ended"
          ? t("ended")
          : null;

  return (
    <div className="demo-box">
      <p className="font-bold text-xl">{t("title")}</p>
      <p className="welcome-note">{t("text")}</p>

      {statusText && (
        <p
          className="lesson-status w-fit min-h-12 text-lg"
          data-tone={status === "active" ? (isSpeaking ? "tutor" : "you") : status === "ended" ? "done" : "wait"}
          role="status"
          aria-live="polite"
        >
          {statusText}
        </p>
      )}

      {status === "active" || status === "connecting" ? (
        <button
          type="button"
          className="btn-outline w-fit text-lg"
          onClick={stop}
          disabled={status === "connecting"}
        >
          {t("stop")}
        </button>
      ) : (
        <button type="button" className="btn-primary w-fit text-lg" onClick={start}>
          {status === "ended" ? t("restart") : t("start")}
        </button>
      )}

      {micBlocked && (
        <div className="help-box" role="alert">
          <p className="font-bold">{t("micBlockedTitle")}</p>
          <p>{t("micBlockedHelp")}</p>
        </div>
      )}
    </div>
  );
};

export default DemoCall;
