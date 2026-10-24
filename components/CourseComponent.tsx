"use client";

import { cn, getSubjectColor, getSubjectLabel } from "@/lib/utils";
import { buildLessonCall } from "@/lib/ai/assistants";
import { vapi } from "@/lib/vapi.sdk";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import soundwaves from "@/constants/soundwaves.json";
import { addToSessionHistory } from "@/lib/actions/course.actions";
import { useTranslations } from "next-intl";
import { getMicPermission } from "@/lib/onboarding/microphone";

// Represents the current state of the Vapi voice call
enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  ENDED = "ENDED",
}

const CourseComponent = ({
  courseId,
  userName,
  userImage,
  name,
  subject,
  topic,
  language,
  voice,
}: CourseComponentProps) => {
  const t = useTranslations("CourseSession");
  const tSubjects = useTranslations("Subjects");
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  // Set when the browser blocks the microphone, so we can explain how to fix it
  const [micBlocked, setMicBlocked] = useState(false);

  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // Play / pause the soundwave animation based on whether the AI is speaking
  useEffect(() => {
    if (lottieRef) {
      if (isSpeaking) {
        lottieRef.current?.play();
      } else {
        lottieRef.current?.stop();
      }
    }
  }, [lottieRef, isSpeaking]);

  // Wire up Vapi event listeners for the duration of the session
  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };
    const onCallEnd = () => {
      setCallStatus(CallStatus.ENDED);
      addToSessionHistory(courseId);
    };

    // Only persist "final" transcript messages (not interim partials)
    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [newMessage, ...prev]);
      }
    };

    const onSpeechStart = () => {
      setIsSpeaking(true);
    };
    const onSpeechEnd = () => {
      setIsSpeaking(false);
    };

    const onError = async (error: Error) => {
      console.log("Error: ", error);
      // A blocked microphone is the most common reason a lesson fails to start
      if ((await getMicPermission()) === "denied") setMicBlocked(true);
      // Don't leave the button pulsing on "Connecting..." forever
      setCallStatus((current) =>
        current === CallStatus.CONNECTING ? CallStatus.INACTIVE : current
      );
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("error", onError);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);

    // Remove all listeners when the component unmounts to prevent memory leaks
    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("error", onError);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
    };
  }, [courseId]);

  const toggleMicrophone = () => {
    const isMuted = vapi.isMuted();
    vapi.setMuted(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleCall = async () => {
    // Explain a blocked microphone up front instead of failing silently
    if ((await getMicPermission()) === "denied") {
      setMicBlocked(true);
      return;
    }
    setMicBlocked(false);
    setCallStatus(CallStatus.CONNECTING);
    // The saved Vapi assistant for the lesson language holds the prompt,
    // transcriber, model and voice model; here we only fill in the lesson.
    const { assistantId, overrides } = buildLessonCall({
      language,
      voice,
      subject,
      topic,
    });
    vapi.start(assistantId, overrides);
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.ENDED);
    vapi.stop();
  };

  // One plain sentence telling the student what is happening right now
  const statusText = micBlocked
    ? t("statusMicBlocked")
    : callStatus === CallStatus.CONNECTING
    ? t("statusConnecting")
    : callStatus === CallStatus.ACTIVE
    ? isMuted
      ? t("statusMuted")
      : isSpeaking
      ? t("statusTutorSpeaking")
      : t("statusYourTurn")
    : callStatus === CallStatus.ENDED
    ? t("statusEnded")
    : t("statusReady");

  return (
    <section className="flex flex-col h-[70vh]">
      <section className="flex gap-8 max-sm:flex-col">
        <div className="course-section" data-tour="lesson-tutor">
          <div
            className="course-avatar"
            style={{ backgroundColor: getSubjectColor(subject) }}
          >
            {/* Show subject icon when idle or connecting */}
            <div
              className={cn(
                "absolute transition-opacity duration-1000",
                callStatus === CallStatus.INACTIVE ||
                  callStatus === CallStatus.ENDED
                  ? "opacity-100"
                  : "opacity-0",
                callStatus === CallStatus.CONNECTING &&
                  "opacity-100 animate-pulse"
              )}
            >
              <Image
                src={`/icons/${subject}.svg`}
                alt={getSubjectLabel(tSubjects, subject)}
                width={150}
                height={150}
                className="max-sm:w-fit"
              />
            </div>
            {/* Show animated soundwave when call is active */}
            <div
              className={cn(
                "absolute transition-opacity duration-1000",
                callStatus === CallStatus.ACTIVE ? "opacity-100" : "opacity-0"
              )}
            >
              <Lottie
                lottieRef={lottieRef}
                animationData={soundwaves}
                autoplay={false}
                className="course-lottie"
              />
            </div>
          </div>
          <p className="font-bold text-2xl" lang={language}>
            {name}
          </p>
          <p
            className={cn(
              "lesson-status",
              callStatus === CallStatus.ACTIVE && !isMuted && !isSpeaking && "lesson-status-turn",
              micBlocked && "lesson-status-alert"
            )}
            role="status"
            aria-live="polite"
            data-tour="lesson-status"
          >
            {statusText}
          </p>
        </div>
        <div className="user-section">
          <div className="user-avatar">
            <Image
              src={userImage}
              alt={userName}
              width={130}
              height={130}
              className="rounded-lg"
            />
            <p className="font-bold text-2xl">{userName}</p>
          </div>
          <button
            className="btn-mic"
            data-tour="lesson-mute"
            onClick={toggleMicrophone}
            disabled={callStatus !== CallStatus.ACTIVE}
            // The text label is hidden on mobile, so the button needs its own accessible name
            title={isMuted ? t("micOn") : t("micOff")}
            aria-label={isMuted ? t("micOn") : t("micOff")}
          >
            <Image
              src={isMuted ? "/icons/mic-off.svg" : "/icons/mic-on.svg"}
              alt=""
              width={36}
              height={36}
            />
            <p className="max-sm:hidden">
              {isMuted ? t("micOn") : t("micOff")}
            </p>
          </button>
          <button
            data-tour="lesson-start"
            className={cn(
              "rounded-lg py-2 cursor-pointer transition-color w-full text-white",
              callStatus === CallStatus.ACTIVE ? "bg-red-700" : "bg-primary",
              callStatus === CallStatus.CONNECTING && "animate-pulse"
            )}
            onClick={
              callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall
            }
          >
            {callStatus === CallStatus.ACTIVE
              ? t("endSession")
              : callStatus === CallStatus.CONNECTING
              ? t("connecting")
              : t("startSession")}
          </button>
        </div>
      </section>
      {micBlocked && (
        <div className="help-box mt-4" role="alert">
          <p className="font-bold">{t("micBlockedTitle")}</p>
          <p>{t("micBlockedHelp")}</p>
        </div>
      )}
      <section className="transcript" data-tour="lesson-transcript">
        {/* The conversation happens in the lesson language */}
        <div className="transcript-message no-scrollbar" lang={language}>
          {messages.map((message, index) => {
            if (message.role === "assistant") {
              return (
                <p key={index} className="max-sm:text-sm">
                  {/* Strip punctuation from the tutor's first name for display */}
                  {name.split(" ")[0].replace(/[.,]/g, "")}:{" "}
                  {message.content}
                </p>
              );
            } else {
              return (
                <p key={index} className="text-primary max-sm:text-sm">
                  {userName}: {message.content}
                </p>
              );
            }
          })}
        </div>

        <div className="transcript-fade" />
      </section>
    </section>
  );
};

export default CourseComponent;
