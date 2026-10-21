"use client";

import "driver.js/dist/driver.css";
import { driver, type Driver, type DriveStep } from "driver.js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { TOUR_STEPS } from "@/lib/onboarding/tours";
import {
  mergeOnboarding,
  readLocalOnboarding,
  readOnboarding,
  writeLocalOnboarding,
  type TourId,
} from "@/lib/onboarding/state";
import {
  canSpeak,
  speak,
  stopSpeaking,
  subscribeToVoices,
} from "@/lib/onboarding/speech";
import { logOnboardingEvent } from "@/lib/actions/onboarding.actions";

interface TourContextValue {
  /** Tour of the page currently on screen, registered by <PageTour> */
  pageTour: TourId | null;
  setPageTour: (id: TourId | null) => void;
  startTour: (id: TourId) => void;
  /** Closes a running tour without marking it as seen (e.g. on navigation) */
  stopTour: () => void;
  hasSeen: (id: TourId) => boolean;
  /** False until Clerk has told us who the user is */
  ready: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) throw new Error("useTour must be used inside <TourProvider>");
  return context;
};

// Hidden elements (display:none on mobile) have no client rects
const isVisible = (element: Element | null) =>
  !!element && element.getClientRects().length > 0;

const TourProvider = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("Tour");
  const locale = useLocale();
  const { isLoaded, user } = useUser();
  const [pageTour, setPageTour] = useState<TourId | null>(null);
  // Tours closed during this visit, so a tour never reopens while Clerk's
  // copy of the metadata is still refreshing
  const [seenNow, setSeenNow] = useState<Partial<Record<TourId, boolean>>>({});
  const driverRef = useRef<Driver | null>(null);

  // Start loading speech voices early so the read-aloud button is ready
  useEffect(() => subscribeToVoices(() => {}), []);

  // Never leave the dark overlay behind if the provider unmounts mid-tour
  useEffect(() => () => driverRef.current?.destroy(), []);

  const hasSeen = useCallback(
    (id: TourId) => {
      if (seenNow[id]) return true;
      const state = user
        ? readOnboarding(user.unsafeMetadata)
        : readLocalOnboarding();
      return state.tours?.[id] === true;
    },
    [seenNow, user]
  );

  const markSeen = useCallback(
    (id: TourId) => {
      setSeenNow((previous) => ({ ...previous, [id]: true }));
      if (user) {
        user
          .update({
            unsafeMetadata: mergeOnboarding(user.unsafeMetadata, {
              tours: { [id]: true },
            }),
          })
          .catch((error) => console.warn("Tour progress not saved:", error));
      } else {
        writeLocalOnboarding({ tours: { [id]: true } });
      }
    },
    [user]
  );

  const stopTour = useCallback(() => {
    stopSpeaking();
    // Public destroy() skips onDestroyStarted, so the tour is not marked seen
    driverRef.current?.destroy();
    driverRef.current = null;
  }, []);

  const startTour = useCallback(
    (id: TourId) => {
      if (driverRef.current?.isActive()) return;

      // Step keys are dynamic; en.json/hu.json parity guarantees they exist
      const text = t as unknown as (key: string) => string;
      const steps: DriveStep[] = TOUR_STEPS[id].flatMap((step) => {
        const popover = {
          title: text(`${id}.${step.key}.title`),
          description: text(`${id}.${step.key}.text`),
          side: step.side,
          align: step.align,
        };
        if (!step.target) return [{ popover }];
        const selector = `[data-tour="${step.target}"]`;
        if (isVisible(document.querySelector(selector))) {
          return [{ element: selector, popover }];
        }
        return step.centerIfMissing ? [{ popover }] : [];
      });
      if (steps.length === 0) return;

      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const tour = driver({
        steps,
        animate: !calm,
        smoothScroll: !calm,
        showProgress: steps.length > 1,
        progressText: "{{current}} / {{total}}",
        nextBtnText: t("next"),
        prevBtnText: t("back"),
        doneBtnText: t("done"),
        closeBtnLabel: t("close"),
        popoverClass: "envolve-tour",
        overlayOpacity: 0.55,
        stagePadding: 8,
        stageRadius: 14,
        // The tour explains the controls; clicks must not press them
        disableActiveInteraction: true,
        // A stray click beside the bubble should not throw the tour away;
        // the × button and Esc still close it
        overlayClickBehavior: "none",
        onPopoverRender: (popover) => {
          if (!canSpeak(locale)) return;
          const readButton = document.createElement("button");
          readButton.type = "button";
          readButton.className = "driver-popover-footer-btn envolve-tour-read";
          readButton.textContent = t("readAloud");
          readButton.addEventListener("click", () =>
            speak(
              `${popover.title.textContent ?? ""}. ${popover.description.textContent ?? ""}`,
              locale
            )
          );
          popover.footer.insertBefore(readButton, popover.footerButtons);
        },
        onHighlightStarted: () => stopSpeaking(),
        // Runs for Done, ×, and Esc alike
        onDestroyStarted: () => {
          const completed = tour.isLastStep();
          const step = tour.getActiveIndex() ?? 0;
          stopSpeaking();
          markSeen(id);
          void logOnboardingEvent({
            flow: id,
            event: completed ? "complete" : "skip",
            step,
            locale,
          });
          tour.destroy();
          driverRef.current = null;
        },
      });

      driverRef.current = tour;
      tour.drive();
      void logOnboardingEvent({ flow: id, event: "start", locale });
    },
    [t, locale, markSeen]
  );

  const value = useMemo<TourContextValue>(
    () => ({
      pageTour,
      setPageTour,
      startTour,
      stopTour,
      hasSeen,
      ready: isLoaded,
    }),
    [pageTour, startTour, stopTour, hasSeen, isLoaded]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export default TourProvider;
