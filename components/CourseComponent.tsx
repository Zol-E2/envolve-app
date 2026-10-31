"use client";

import { cn, getSubjectColor } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { buildLessonCall } from "@/lib/ai/assistants";
import { vapi } from "@/lib/vapi.sdk";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  LoaderCircle,
  Mic,
  MicOff,
  Play,
  Square,
  TriangleAlert,
  Volume2,
  Sprout,
  Footprints,
  Mountain,
  Flag,
} from "lucide-react";
import { SubjectIcon } from "./SubjectTile";
import dynamic from "next/dynamic";
import type { LottieRefCurrentProps } from "lottie-react";
import { useComfort } from "@/components/ComfortProvider";
import { prefersLessMotion } from "@/lib/comfort";
import soundwaves from "@/constants/soundwaves.json";

// The sound-wave animation library is large and only needed once a lesson
// is running, so it loads separately instead of slowing down the page
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
import { addToSessionHistory } from "@/lib/actions/course.actions";
import { finishLessonAttempt, recordMicBlocked, startLessonAttempt } from "@/lib/actions/class.actions";
import { endReasonFor } from "@/lib/teacher/status";
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
  subject,
  topic,
  language,
  voice,
  duration,
  assignment,
  preview = false,
}: CourseComponentProps) => {
  const t = useTranslations("CourseSession");
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  // Set when the browser blocks the microphone, so we can explain how to fix it
  const [micBlocked, setMicBlocked] = useState(false);

  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  // Seconds since the lesson started, for the calm progress bar
  const [elapsed, setElapsed] = useState(0);

  // Lesson length: the teacher's "shorter lesson" support wins over the course
  const lessonMinutes = assignment?.minutes ?? (duration && duration > 0 ? duration : 15);
  const assignmentId = assignment?.assignmentId ?? null;

  // For the teacher's overview: lessons started from an assignment are
  // recorded (start, length, how they ended). Free-time lessons are not.
  const attempt = useRef<{
    id: Promise<string | null>;
    startedAt: number;
    tutorClosed: boolean;
    failed: boolean;
    done: boolean;
  } | null>(null);

  const closeAttempt = useRef((reasonOverride?: "left") => {
    const current = attempt.current;
    if (!current || current.done) return;
    current.done = true;
    const seconds = (Date.now() - current.startedAt) / 1000;
    const reason = reasonOverride ?? endReasonFor(seconds, lessonMinutes, current);
    void current.id.then((id) => {
      if (id) void finishLessonAttempt(id, seconds, reason);
    });
  });

  // Play / pause the soundwave animation based on whether the AI is speaking.
  // With "less motion" it stays still; the status line still says who talks.
  const { settings: comfort } = useComfort();
  useEffect(() => {
    if (isSpeaking && !prefersLessMotion()) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.stop();
    }
  }, [isSpeaking, comfort.lessMotion]);

  // Wire up Vapi event listeners for the duration of the session
  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
      if (assignmentId) {
        attempt.current = {
          id: startLessonAttempt(assignmentId, courseId).catch(() => null),
          startedAt: Date.now(),
          tutorClosed: false,
          failed: false,
          done: false,
        };
      }
    };
    const onCallEnd = () => {
      setCallStatus(CallStatus.ENDED);
      // A teacher's preview stays out of every history and statistic
      if (!preview) addToSessionHistory(courseId);
      closeAttempt.current();
    };

    // Only persist "final" transcript messages (not interim partials)
    const onMessage = (message: Message) => {
      // How the call ended: the tutor said goodbye, time ran out, or it broke
      const status = message as { type?: string; status?: string; endedReason?: string };
      if (status.type === "status-update" && status.status === "ended" && attempt.current) {
        const why = status.endedReason ?? "";
        if (/assistant-ended-call|assistant-said-end-call-phrase|exceeded-max-duration/.test(why)) {
          attempt.current.tutorClosed = true;
        } else if (/error|failed|pipeline|timeout/i.test(why)) {
          attempt.current.failed = true;
        }
      }
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
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
      if (attempt.current) attempt.current.failed = true;
      // A blocked microphone is the most common reason a lesson fails to start
      if ((await getMicPermission()) === "denied") {
        setMicBlocked(true);
        if (assignmentId && !attempt.current) void recordMicBlocked(assignmentId, courseId);
      }
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
  }, [courseId, assignmentId, preview]);

  // Leaving the page mid-lesson counts as stopping it
  useEffect(() => {
    const close = closeAttempt.current;
    return () => close("left");
  }, []);

  // Count the lesson time while the call is running
  useEffect(() => {
    if (callStatus !== CallStatus.ACTIVE) return;
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  // Keep the newest sentence in view by scrolling only the transcript box,
  // never the page, so the "who is speaking" bar stays where it is
  useEffect(() => {
    const box = transcriptRef.current;
    if (!box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ top: box.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages.length]);

  const toggleMicrophone = () => {
    const isMuted = vapi.isMuted();
    vapi.setMuted(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleCall = async () => {
    // Explain a blocked microphone up front instead of failing silently
    if ((await getMicPermission()) === "denied") {
      setMicBlocked(true);
      if (assignmentId) void recordMicBlocked(assignmentId, courseId);
      return;
    }
    setMicBlocked(false);
    setMessages([]);
    setElapsed(0);
    setCallStatus(CallStatus.CONNECTING);
    // The saved Vapi assistant for the lesson language holds the prompt,
    // transcriber, model and voice model; here we only fill in the lesson.
    const { assistantId, overrides } = buildLessonCall({
      language,
      voice,
      subject,
      topic,
      minutes: lessonMinutes,
      slower: !!assignment?.support.slowerSpeech,
    });
    vapi.start(assistantId, overrides);
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.ENDED);
    vapi.stop();
  };

  // One plain sentence telling the student what is happening right now,
  // always with an icon and a fixed colour, so it can be read at a glance
  const status = micBlocked
    ? { text: t("statusMicBlocked"), icon: TriangleAlert, tone: "alert" }
    : callStatus === CallStatus.CONNECTING
    ? { text: t("statusConnecting"), icon: LoaderCircle, tone: "wait" }
    : callStatus === CallStatus.ACTIVE
    ? isMuted
      ? { text: t("statusMuted"), icon: MicOff, tone: "wait" }
      : isSpeaking
      ? { text: t("statusTutorSpeaking"), icon: Volume2, tone: "tutor" }
      : { text: t("statusYourTurn"), icon: Mic, tone: "you" }
    : callStatus === CallStatus.ENDED
    ? { text: t("statusEnded"), icon: Check, tone: "done" }
    : { text: t("statusReady"), icon: Play, tone: "wait" };
  const StatusIcon = status.icon;

  const total = lessonMinutes;
  const minutes = Math.floor(elapsed / 60);
  const progress = Math.min(elapsed / (total * 60), 1);
  // A word for where the lesson is, instead of a clock
  const phase =
    callStatus === CallStatus.ENDED
      ? "done"
      : callStatus !== CallStatus.ACTIVE
        ? "ready"
        : progress < 0.15
          ? "start"
          : progress < 0.5
            ? "early"
            : progress < 0.75
              ? "half"
              : progress < 0.95
                ? "late"
                : "end";
  const PhaseIcon = { ready: Play, start: Sprout, early: Footprints, half: Mountain, late: Flag, end: Flag, done: Check }[phase];
  const active = callStatus === CallStatus.ACTIVE;

  return (
    <div className="lesson">
      {/* The tutor, what is happening now, and how long the lesson has run */}
      <section className="lesson-stage" data-tour="lesson-tutor">
        <div
          className={cn("lesson-tutor", active && isSpeaking && "is-speaking")}
          style={{ backgroundColor: getSubjectColor(subject) }}
        >
          {active ? (
            <Lottie
              lottieRef={lottieRef}
              animationData={soundwaves}
              autoplay={false}
              className="lesson-lottie"
            />
          ) : (
            <SubjectIcon
              subject={subject}
              className={cn("size-24 max-sm:size-12", callStatus === CallStatus.CONNECTING && "motion-safe:animate-pulse")}
              strokeWidth={1.75}
            />
          )}
        </div>
        <p
          className="lesson-status"
          data-tone={status.tone}
          role="status"
          aria-live="polite"
          data-tour="lesson-status"
        >
          <StatusIcon
            className={cn("size-6 shrink-0", status.tone === "wait" && callStatus === CallStatus.CONNECTING && "motion-safe:animate-spin")}
            aria-hidden
          />
          {status.text}
        </p>
        {/* Where the student is in the lesson, in words and on a path. No
            seconds and no countdown: nothing to race against */}
        <div className="lesson-timer" data-tour="lesson-timer">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="flex items-center gap-2 text-lg font-bold">
              <PhaseIcon className="size-5 text-ok" aria-hidden />
              {t(`phase.${phase}`)}
            </span>
            <span className="text-base text-muted-foreground">{t("lessonLength", { total })}</span>
          </div>
          <div
            className="lesson-path"
            role="progressbar"
            aria-label={t("pathLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-valuetext={t("pathValue", { phase: t(`phase.${phase}`), minutes, total })}
          >
            <span className="lesson-path-fill" style={{ width: `${progress * 100}%` }} />
            <span className="lesson-path-mark" style={{ left: "50%" }} data-reached={progress >= 0.5} />
            <span className="lesson-path-you" style={{ left: `${progress * 100}%` }} data-active={active} />
          </div>
          <div className="lesson-path-labels" aria-hidden>
            <span>{t("milestone.start")}</span>
            <span>{t("milestone.middle")}</span>
            <span>{t("milestone.end")}</span>
          </div>
        </div>
        {micBlocked && (
          <div className="help-box w-full text-left" role="alert">
            <p className="font-bold">{t("micBlockedTitle")}</p>
            <p>{t("micBlockedHelp")}</p>
          </div>
        )}
      </section>

      {/* Everything said so far, newest at the bottom, older lines fainter */}
      <section className="lesson-transcript" data-tour="lesson-transcript" aria-labelledby="transcript-title">
        <h2 id="transcript-title" className="text-xl font-bold max-sm:text-lg">
          {t("transcriptTitle")}
        </h2>
        {messages.length === 0 ? (
          <p className="text-lg text-muted-foreground">{t("transcriptEmpty")}</p>
        ) : (
          // The conversation happens in the lesson language. Only this box
          // scrolls; tabIndex lets keyboard users scroll it too
          <div ref={transcriptRef} className="lesson-transcript-list" tabIndex={0}>
          <ol className="flex flex-col gap-3" lang={language}>
            {messages.map((message, index) => (
              <li
                key={index}
                className={cn(
                  "lesson-msg",
                  message.role === "assistant" ? "is-tutor" : "is-you",
                  index < messages.length - 2 && "is-old"
                )}
              >
                <span className="lesson-msg-who">
                  {/* Course names are topics now ("Törtek összeadása"), so the tutor is just "Tutor" */}
                  {message.role === "assistant" ? t("tutor") : userName || t("you")}
                </span>
                {message.content}
              </li>
            ))}
          </ol>
          </div>
        )}
      </section>

      <aside className="lesson-side">
        {/* Desktop: a card beside the tutor. Phone: a bar fixed to the bottom */}
        <div className="lesson-controls">
          <button
            type="button"
            data-tour="lesson-start"
            className={cn(
              "lesson-main-btn",
              active ? "is-stop" : "btn-primary",
              callStatus === CallStatus.CONNECTING && "motion-safe:animate-pulse"
            )}
            onClick={active ? handleDisconnect : handleCall}
            disabled={callStatus === CallStatus.CONNECTING}
          >
            {active ? (
              <Square className="size-5" fill="currentColor" aria-hidden />
            ) : (
              <Play className="size-5" fill="currentColor" aria-hidden />
            )}
            {active ? t("endSession") : callStatus === CallStatus.CONNECTING ? t("connecting") : t("startSession")}
          </button>
          <button
            type="button"
            className="btn-outline lesson-mute"
            data-tour="lesson-mute"
            onClick={toggleMicrophone}
            disabled={!active}
            aria-pressed={isMuted}
          >
            {isMuted ? <Mic className="size-5" aria-hidden /> : <MicOff className="size-5" aria-hidden />}
            {isMuted ? t("micOn") : t("micOff")}
            {/* The bottom bar on phones has room for the short word only */}
            <span className="max-lg:sr-only">({isMuted ? t("micOnHint") : t("micOffHint")})</span>
          </button>
        </div>

        {/* Ready-made sentences to say out loud when stuck, in the lesson language */}
        <section className="card flex flex-col gap-3" data-tour="lesson-stuck" aria-labelledby="stuck-title">
          <h2 id="stuck-title" className="flex items-center gap-2 text-xl font-bold max-sm:text-lg">
            <CircleHelp className="size-6 text-turn" aria-hidden />
            {t("stuckTitle")}
          </h2>
          <ul className="flex flex-col gap-2" lang={language}>
            {STUCK_PHRASES[language === "en" ? "en" : "hu"].map((phrase) => (
              <li key={phrase} className="stuck-phrase">
                {phrase}
              </li>
            ))}
          </ul>
        </section>

        <Link href="/courses" className="btn-outline w-full" data-tour="lesson-exit">
          <ArrowLeft className="size-5" aria-hidden />
          {t("back")}
        </Link>
      </aside>
    </div>
  );
};

// Sentences the student can say to the tutor. They follow the lesson
// language (an English lesson needs English sentences), not the interface.
const STUCK_PHRASES = {
  hu: ["„Elmagyaráznád másképp?”", "„Lassabban, kérlek.”", "„Mondj egy példát!”"],
  en: ["“Could you explain it another way?”", "“Slower, please.”", "“Can you give me an example?”"],
};

export default CourseComponent;
