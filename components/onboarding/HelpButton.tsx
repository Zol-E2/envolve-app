"use client";

import { useTranslations } from "next-intl";
import { CircleHelp } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { useTour } from "./TourProvider";

/**
 * Navbar "Help" button: opens the tips for the page on screen. Hidden on the
 * welcome screen, which is itself the explanation.
 */
const HelpButton = () => {
  const t = useTranslations("Tour");
  const tNav = useTranslations("Navbar");
  const pathname = usePathname();
  const { pageTour, startTour } = useTour();

  if (pathname === "/welcome") return null;

  const label = t("helpStart");
  return (
    <button
      type="button"
      className="btn-help"
      data-tour="nav-help"
      // The visible word is the accessible name; the tooltip says what it does
      title={label}
      // The page registers its tips right after it mounts; until then the
      // button stays in place (no layout jump) but does nothing
      disabled={!pageTour}
      onClick={() => pageTour && startTour(pageTour)}
    >
      <CircleHelp className="size-5" aria-hidden />
      {/* A visible word, not just "?": icons alone are easy to misread */}
      <span>{tNav("help")}</span>
    </button>
  );
};

export default HelpButton;
