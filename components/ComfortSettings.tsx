"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ALargeSmall,
  BookOpenText,
  CircleCheck,
  RotateCcw,
  SlidersHorizontal,
  Volume2,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useComfort } from "./ComfortProvider";
import { DEFAULT_COMFORT, TEXT_SIZES, type ComfortSettings as Settings, type TextSize } from "@/lib/comfort";

// How big each "A" is drawn, so the buttons show what they do
const SIZE_PREVIEW: Record<TextSize, string> = {
  normal: "1rem",
  large: "1.25rem",
  larger: "1.5rem",
};

type SwitchKey = "readingFont" | "autoRead" | "lessMotion";

const SWITCHES: { key: SwitchKey; icon: LucideIcon; tour: string }[] = [
  { key: "readingFont", icon: BookOpenText, tour: "comfort-reading" },
  { key: "autoRead", icon: Volume2, tour: "comfort-read" },
  { key: "lessMotion", icon: Waves, tour: "comfort-motion" },
];

const Row = ({
  icon: Icon,
  label,
  hint,
  labelId,
  tour,
  children,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  labelId: string;
  tour: string;
  children: ReactNode;
}) => (
  <div className="comfort-row" data-tour={tour}>
    <span className="comfort-row-icon" aria-hidden>
      <Icon className="size-6" />
    </span>
    <div className="comfort-row-text">
      <span id={labelId} className="comfort-row-label">
        {label}
      </span>
      <span id={`${labelId}-hint`} className="comfort-row-hint">
        {hint}
      </span>
    </div>
    {children}
  </div>
);

/**
 * "Így kényelmes nekem": text size, reading-friendly text, automatic
 * read-aloud and less motion. Every change applies at once (the student sees
 * the effect right away) and is saved without a save button.
 */
const ComfortSettings = () => {
  const t = useTranslations("Comfort");
  const { own: settings, update } = useComfort();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const timer = useRef<number | undefined>(undefined);
  const sizeRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const change = async (patch: Partial<Settings>) => {
    window.clearTimeout(timer.current);
    try {
      await update(patch);
      setStatus("saved");
    } catch (error) {
      console.warn("Comfort settings not saved:", error);
      setStatus("error");
    }
    timer.current = window.setTimeout(() => setStatus("idle"), 3000);
  };

  // Radio group keyboard pattern: arrow keys move between the sizes
  const onSizeKey = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + TEXT_SIZES.length) % TEXT_SIZES.length;
    sizeRefs.current[next]?.focus();
    void change({ textSize: TEXT_SIZES[next] });
  };

  const isDefault = (Object.keys(DEFAULT_COMFORT) as (keyof Settings)[]).every(
    (key) => settings[key] === DEFAULT_COMFORT[key]
  );

  return (
    <section className="comfort-card" aria-labelledby="comfort-title" data-tour="profile-comfort">
      <h2 id="comfort-title" className="comfort-title">
        <SlidersHorizontal className="size-7 text-primary" aria-hidden />
        {t("title")}
      </h2>
      <p className="comfort-lead">{t("lead")}</p>

      <Row icon={ALargeSmall} label={t("size")} hint={t("sizeHint")} labelId="comfort-size" tour="comfort-size">
        <div className="size-picker comfort-control" role="radiogroup" aria-labelledby="comfort-size" aria-describedby="comfort-size-hint">
          {TEXT_SIZES.map((size, index) => {
            const checked = settings.textSize === size;
            return (
              <button
                key={size}
                ref={(element) => {
                  sizeRefs.current[index] = element;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={t(`sizes.${size}`)}
                tabIndex={checked ? 0 : -1}
                className="size-option"
                style={{ fontSize: SIZE_PREVIEW[size] }}
                onClick={() => void change({ textSize: size })}
                onKeyDown={(event) => onSizeKey(event, index)}
              >
                A
              </button>
            );
          })}
        </div>
      </Row>

      {SWITCHES.map(({ key, icon, tour }) => {
        const on = settings[key];
        return (
          <Row key={key} icon={icon} label={t(`${key}.label`)} hint={t(`${key}.hint`)} labelId={`comfort-${key}`} tour={tour}>
            <span className="comfort-control">
              <span className="comfort-state" aria-hidden>
                {on ? t("on") : t("off")}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-labelledby={`comfort-${key}`}
                aria-describedby={`comfort-${key}-hint`}
                className="switch"
                onClick={() => void change({ [key]: !on })}
              />
            </span>
          </Row>
        );
      })}

      <p className="comfort-sample" data-tour="comfort-sample">
        {t("sample")}
      </p>

      <div className="comfort-foot">
        <p className="comfort-saved" role="status" aria-live="polite">
          {status === "saved" && (
            <>
              <CircleCheck className="size-5" aria-hidden />
              {t("saved")}
            </>
          )}
          {status === "error" && <span className="text-destructive">{t("error")}</span>}
        </p>
        <button
          type="button"
          className="btn-outline min-h-11 px-4 text-base"
          onClick={() => void change(DEFAULT_COMFORT)}
          disabled={isDefault}
          data-tour="comfort-reset"
        >
          <RotateCcw className="size-5" aria-hidden />
          {t("reset")}
        </button>
      </div>
    </section>
  );
};

export default ComfortSettings;
