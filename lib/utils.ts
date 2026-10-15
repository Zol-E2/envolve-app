import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { subjectsColors } from "@/constants";
import type { Messages, useTranslations } from "next-intl";

/** Merges Tailwind classes, resolving conflicts via tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns the background color hex associated with a subject string. */
export const getSubjectColor = (subject: string) => {
  return subjectsColors[subject as keyof typeof subjectsColors];
};

// ─── i18n helpers ─────────────────────────────────────────────────────────────

type SubjectKey = keyof Messages["Subjects"];
type SubjectTranslator = ReturnType<typeof useTranslations<"Subjects">>;

/**
 * Translates a subject slug ("maths" → "Matematika") and falls back to the raw
 * value for subjects that have no entry in messages/*.json yet, so an unknown
 * DB value never renders as a broken "Subjects.foo" key.
 */
export const getSubjectLabel = (t: SubjectTranslator, subject: string) =>
  t.has(subject as SubjectKey) ? t(subject as SubjectKey) : subject;
