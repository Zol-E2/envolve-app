"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type MicState = "idle" | "asking" | "listening" | "denied" | "unavailable";
export type MicResult = "granted" | "denied" | "unavailable";

/**
 * Microphone check before the first lesson. It asks for permission here, with
 * an explanation, instead of surprising the student when the lesson starts,
 * and shows a live level bar so they can see the device hears them.
 */
const MicTest = ({ onResult }: { onResult?: (result: MicResult) => void }) => {
  const t = useTranslations("Welcome.mic");
  const [state, setState] = useState<MicState>("idle");
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Release the microphone when the student leaves this step
  useEffect(() => () => cleanupRef.current?.(), []);

  const stop = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setLevel(0);
    setState("idle");
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      onResult?.("unavailable");
      return;
    }

    setState("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);

      let frame = 0;
      let shown = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let peak = 0;
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128));
        const value = Math.min(1, peak / 64);
        // Only re-render on visible changes
        if (Math.abs(value - shown) > 0.03) {
          shown = value;
          setLevel(value);
        }
        if (value > 0.25) setHeard(true);
        frame = window.requestAnimationFrame(tick);
      };
      tick();

      cleanupRef.current = () => {
        window.cancelAnimationFrame(frame);
        stream.getTracks().forEach((track) => track.stop());
        void context.close();
      };
      setState("listening");
      onResult?.("granted");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      const denied = name === "NotAllowedError" || name === "SecurityError";
      setState(denied ? "denied" : "unavailable");
      onResult?.(denied ? "denied" : "unavailable");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {(state === "idle" || state === "asking") && (
        <button
          type="button"
          className="btn-primary w-fit text-lg"
          onClick={start}
          disabled={state === "asking"}
        >
          {t("start")}
        </button>
      )}

      {state === "asking" && (
        <p className="welcome-note" role="status">
          {t("asking")}
        </p>
      )}

      {state === "listening" && (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold" role="status" aria-live="polite">
            {heard ? t("heard") : t("listening")}
          </p>
          <div
            className="mic-meter"
            role="meter"
            aria-label={t("meterLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level * 100)}
          >
            <div
              className={cn("mic-meter-fill", heard && "mic-meter-fill-ok")}
              style={{ width: `${Math.max(4, level * 100)}%` }}
            />
          </div>
          <button type="button" className="btn-outline w-fit" onClick={stop}>
            {t("stop")}
          </button>
        </div>
      )}

      {state === "denied" && (
        <div className="help-box" role="alert">
          <p className="font-bold">{t("deniedTitle")}</p>
          <p>{t("deniedHelp")}</p>
        </div>
      )}

      {state === "unavailable" && (
        <div className="help-box" role="alert">
          <p>{t("unavailable")}</p>
          <button type="button" className="btn-outline w-fit" onClick={start}>
            {t("retry")}
          </button>
        </div>
      )}

      {state !== "listening" && <p className="welcome-note">{t("later")}</p>}
    </div>
  );
};

export default MicTest;
