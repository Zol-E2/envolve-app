"use client";

import { useEffect } from "react";
import { useTour } from "./TourProvider";
import type { TourId } from "@/lib/onboarding/state";
import { TOUR_AUTO_START } from "@/lib/onboarding/tours";

/**
 * Registers the page's tour for the navbar "?" button and starts it
 * automatically on the user's first visit (unless the page opts out).
 * Renders nothing.
 */
const PageTour = ({ id }: { id: TourId }) => {
  const { setPageTour, startTour, stopTour, hasSeen, ready } = useTour();

  useEffect(() => {
    setPageTour(id);
    return () => {
      setPageTour(null);
      stopTour();
    };
  }, [id, setPageTour, stopTour]);

  const shouldAutoStart = TOUR_AUTO_START[id] && ready && !hasSeen(id);

  useEffect(() => {
    if (!shouldAutoStart) return;
    // Give images and fonts a moment to settle so the highlight lands in place
    const timer = window.setTimeout(() => startTour(id), 800);
    return () => window.clearTimeout(timer);
  }, [shouldAutoStart, id, startTour]);

  return null;
};

export default PageTour;
