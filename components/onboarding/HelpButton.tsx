"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useTour } from "./TourProvider";

/**
 * Navbar "?" button: opens the tips for the page on screen. Hidden on the
 * welcome screen, which is itself the explanation.
 */
const HelpButton = () => {
  const t = useTranslations("Tour");
  const pathname = usePathname();
  const { pageTour, startTour } = useTour();

  if (pathname === "/welcome") return null;

  const label = t("helpStart");
  return (
    <button
      type="button"
      className="btn-help"
      data-tour="nav-help"
      aria-label={label}
      title={label}
      // The page registers its tips right after it mounts; until then the
      // button stays in place (no layout jump) but does nothing
      disabled={!pageTour}
      onClick={() => pageTour && startTour(pageTour)}
    >
      ?
    </button>
  );
};

export default HelpButton;
