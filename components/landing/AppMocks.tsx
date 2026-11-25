import { ShieldCheck } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

/*
 * The app as it really looks, for the landing page: screenshots of the real
 * pages (public/images/landing, made from a demo class with invented names,
 * never a real child), framed as a browser window or a phone. Decorative:
 * the figure around them describes them in words (aria-label).
 */

type Shot = "lesson" | "teacher" | "alert" | "student-phone";
const SIZES: Record<Shot, [number, number]> = {
  lesson: [2560, 1920],
  teacher: [2400, 1558],
  alert: [2240, 676],
  "student-phone": [780, 1688],
};

const ShotImage = async ({ shot, sizes, priority = false, className }: { shot: Shot; sizes: string; priority?: boolean; className?: string }) => {
  const locale = await getLocale();
  const [width, height] = SIZES[shot];
  return (
    <Image
      src={`/images/landing/${shot}-${locale}.webp`}
      alt=""
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
};

/** A screenshot in a browser window */
export const BrowserShot = async ({ shot, priority = false, className = "" }: { shot: Shot; priority?: boolean; className?: string }) => (
  <div className={`shot-window ${className}`} aria-hidden="true">
    <div className="shot-window-bar">
      <span className="shot-dot" />
      <span className="shot-dot" />
      <span className="shot-dot" />
      <span className="shot-url">envolve.hu</span>
    </div>
    <ShotImage shot={shot} sizes="(min-width: 1024px) 860px, 92vw" priority={priority} className="block h-auto w-full" />
  </div>
);

/** A screenshot on a phone */
export const PhoneShot = async ({ shot, className = "" }: { shot: Shot; className?: string }) => (
  <div className={`shot-phone ${className}`} aria-hidden="true">
    <ShotImage shot={shot} sizes="(min-width: 1024px) 260px, 40vw" className="block h-auto w-full" />
  </div>
);

/** A screenshot as a plain card (no frame) */
export const CardShot = async ({ shot, className = "" }: { shot: Shot; className?: string }) => (
  <div className={`shot-card ${className}`} aria-hidden="true">
    <ShotImage shot={shot} sizes="(min-width: 1024px) 1000px, 92vw" className="block h-auto w-full" />
  </div>
);

/** A small floating notice: lesson safety at work */
export const SafetyBadge = async () => {
  const t = await getTranslations("Landing.mock");
  return (
    <div className="shot-badge" aria-hidden="true">
      <span className="flex size-[2em] shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
        <ShieldCheck className="size-[1.1em]" />
      </span>
      {t("safe")}
    </div>
  );
};
