"use client";

import { useEffect } from "react";
import { useTour } from "./TourProvider";
import type { TourId } from "@/lib/onboarding/state";

/**
 * Registers the page's tips for the "Segítség" (Help) button. Renders
 * nothing.
 *
 * Tips never open by themselves: our users are children with learning
 * difficulties, and a bubble they did not ask for is one more thing to
 * deal with. The only exception is `intro` on the home page: one bubble,
 * once per account, that shows where the Help button is.
 */
const PageTour = ({ id, intro }: { id: TourId; intro?: "helpIntro" | "helpIntroAdult" }) => {
  const { setPageTour, startTour, stopTour, hasSeen, ready } = useTour();

  useEffect(() => {
    setPageTour(id);
    return () => {
      setPageTour(null);
      stopTour();
    };
  }, [id, setPageTour, stopTour]);

  const showIntro = !!intro && ready && !hasSeen(intro);

  useEffect(() => {
    if (!showIntro || !intro) return;
    // Give images and fonts a moment to settle so the highlight lands in place
    const timer = window.setTimeout(() => startTour(intro), 800);
    return () => window.clearTimeout(timer);
  }, [showIntro, intro, startTour]);

  return null;
};

export default PageTour;
