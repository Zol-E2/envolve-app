"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";
import jsQR from "jsqr";
import { Camera, CircleCheck, KeyRound, TriangleAlert } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { readCardKey } from "@/lib/classAccounts";

type Phase = "starting" | "scanning" | "signingIn" | "done" | "noCamera" | "badCard" | "error";

/**
 * Signing in with a login card (20261112_class_accounts.sql): the camera
 * reads the card's QR code, our server checks the key and returns a one-time
 * Clerk ticket, and Clerk signs the student in. A card opened with the
 * tablet's own camera app lands here with the key in the address (#k=...).
 *
 * No tips on sign-in pages (AGENTS.md); the screen says what to do in one
 * short sentence and always offers the way back to signing in by name.
 */
const CardSignIn = () => {
  const t = useTranslations("CardSignIn");
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("starting");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const signInWithKey = useCallback(
    async (key: string) => {
      if (busyRef.current || !isLoaded || !signIn) return;
      busyRef.current = true;
      setPhase("signingIn");
      stopCamera();
      try {
        const response = await fetch("/api/card-sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const result = (await response.json().catch(() => null)) as { ok?: boolean; ticket?: string } | null;
        if (!response.ok || !result?.ok || !result.ticket) {
          setPhase("badCard");
          busyRef.current = false;
          return;
        }
        // A shared tablet: the previous student is signed out first
        if (isSignedIn) await signOut();
        const attempt = await signIn.create({ strategy: "ticket", ticket: result.ticket });
        if (attempt.status !== "complete" || !attempt.createdSessionId) throw new Error("Not complete");
        await setActive({ session: attempt.createdSessionId });
        setPhase("done");
        router.replace("/");
      } catch {
        setPhase("error");
        busyRef.current = false;
      }
    },
    [isLoaded, signIn, setActive, isSignedIn, signOut, router]
  );

  // A card opened with the tablet's own camera app: the key is in the address
  useEffect(() => {
    if (!isLoaded) return;
    const key = readCardKey(window.location.hash);
    if (key) {
      // The key leaves the address bar and the history right away
      window.history.replaceState(null, "", window.location.pathname);
      // After this render, not inside the effect itself
      const timer = window.setTimeout(() => void signInWithKey(key), 0);
      return () => window.clearTimeout(timer);
    }
  }, [isLoaded, signInWithKey]);

  const startCamera = useCallback(async () => {
    // A card key from the address is already being used
    if (busyRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("noCamera");
      return;
    }
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (busyRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setPhase("scanning");
    } catch {
      setPhase("noCamera");
    }
  }, []);

  useEffect(() => {
    if (window.location.hash.includes("k=")) return;
    const timer = window.setTimeout(() => void startCamera(), 0);
    return () => {
      window.clearTimeout(timer);
      stopCamera();
    };
  }, [startCamera]);

  // Reads a few frames a second while the camera is on
  useEffect(() => {
    if (phase !== "scanning") return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const width = Math.min(640, video.videoWidth);
      const height = Math.round((video.videoHeight / video.videoWidth) * width) || 480;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(video, 0, 0, width, height);
      const code = jsQR(context.getImageData(0, 0, width, height).data, width, height, {
        inversionAttempts: "dontInvert",
      });
      if (!code) return;
      const key = readCardKey(code.data);
      if (key) void signInWithKey(key);
      else setPhase("badCard");
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase, signInWithKey]);

  const retry = () => {
    busyRef.current = false;
    void startCamera();
  };

  return (
    <div className="card-signin">
      <h1 className="text-center">{t("title")}</h1>

      <div className="card-signin-camera" data-phase={phase}>
        <video ref={videoRef} playsInline muted aria-hidden />
        <canvas ref={canvasRef} hidden />
        {(phase === "scanning" || phase === "starting") && <span className="card-signin-frame" aria-hidden />}
        {phase === "signingIn" && <p className="card-signin-status">{t("signingIn")}</p>}
        {phase === "done" && (
          <p className="card-signin-status">
            <CircleCheck className="size-8 text-ok" aria-hidden />
            {t("done")}
          </p>
        )}
      </div>

      <p className="text-center text-xl font-bold" role="status" aria-live="polite">
        {phase === "scanning" || phase === "starting"
          ? t("hold")
          : phase === "noCamera"
            ? t("noCamera")
            : phase === "badCard"
              ? t("badCard")
              : phase === "error"
                ? t("error")
                : ""}
      </p>

      {(phase === "noCamera" || phase === "badCard" || phase === "error") && (
        <div className="flex flex-col items-center gap-3">
          {phase !== "noCamera" && (
            <button type="button" className="btn-primary w-full max-w-sm" onClick={retry}>
              <Camera className="size-5" aria-hidden />
              {t("retry")}
            </button>
          )}
          {phase === "noCamera" && <TriangleAlert className="size-8 text-warn" aria-hidden />}
        </div>
      )}

      <Link href="/sign-in" className="btn-outline w-full max-w-sm self-center">
        <KeyRound className="size-5" aria-hidden />
        {t("withName")}
      </Link>
    </div>
  );
};

export default CardSignIn;
