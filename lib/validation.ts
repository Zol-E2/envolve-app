import * as z from "zod";
import { subjects } from "@/constants";

/**
 * Input rules shared by the browser form and the server. The server always
 * checks again: anything sent from a browser can be forged, so the form's
 * checks are only for convenience. The database has matching limits
 * (supabase/migrations/20261030_lock_down_access.sql).
 */
export const LIMITS = {
  name: 80,
  topic: 500,
  search: 100,
  minDuration: 1,
  maxDuration: 60,
  /** New courses one student may create per 24 hours (stops scripted spam) */
  coursesPerDay: 20,
  className: 60,
  message: 200,
  displayName: 40,
  /** Classes one teacher may have (stops scripted spam) */
  classesPerTeacher: 50,
  /** Students one assignment may pick by name */
  pickedStudents: 200,
} as const;

// Control characters (except line breaks in the topic) never belong in a
// course; they can hide text or break the layout
const stripControl = (value: string, keepNewlines = false) =>
  value.replace(keepNewlines ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ");

export const cleanText = (value: string, max: number, keepNewlines = false) =>
  stripControl(value, keepNewlines)
    .replace(keepNewlines ? /[^\S\n]+/g : /\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

export const courseInputSchema = z.object({
  name: z
    .string()
    .transform((value) => cleanText(value, LIMITS.name))
    .pipe(z.string().min(1)),
  topic: z
    .string()
    .transform((value) => cleanText(value, LIMITS.topic, true))
    .pipe(z.string().min(1)),
  subject: z.enum(subjects as [string, ...string[]]),
  voice: z.enum(["male", "female"]),
  language: z.enum(["hu", "en"]),
  duration: z.coerce.number().int().min(LIMITS.minDuration).max(LIMITS.maxDuration),
});

export type CourseInput = z.infer<typeof courseInputSchema>;

/** Course and bookmark ids are UUIDs; anything else is rejected before it reaches the database */
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && z.uuid().safeParse(value).success;

/**
 * Search text for the course library. PostgREST filter strings use , ( ) . :
 * and quotes as syntax, so those (and the % * wildcards) are removed instead
 * of being passed through, which would let a search change the query itself.
 */
export const cleanSearch = (value: unknown) =>
  typeof value === "string"
    ? cleanText(value, LIMITS.search).replace(/[,()."'\\%*:]/g, " ").replace(/\s+/g, " ").trim()
    : "";

/** Only the known subject slugs are used as a filter */
export const cleanSubject = (value: unknown) =>
  typeof value === "string" && (subjects as string[]).includes(value) ? value : "";

/**
 * Pages a server action may refresh after a change: an app path like
 * "/hu/courses". A client-supplied path is never trusted blindly, since
 * revalidating arbitrary paths could be used to flush the cache.
 */
export const safeAppPath = (value: unknown) =>
  typeof value === "string" && /^\/(hu|en)(\/[A-Za-z0-9\-/]*)?$/.test(value) && value.length <= 120
    ? value
    : null;

/** Text placed into the AI tutor's prompt: no template markers, bounded length */
export const cleanPromptText = (value: string, max = LIMITS.topic) =>
  cleanText(value, max).replace(/[{}<>]/g, " ").replace(/\s+/g, " ").trim();

// ─── Teacher view ─────────────────────────────────────────────────────────

/** Join codes: six characters without look-alikes (no 0/O, 1/I/L), as the database makes them */
export const JOIN_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{6}$/;

/** What a student typed ("matek 6", "mat-ek6") as a code, or null */
export const cleanJoinCode = (value: unknown) => {
  if (typeof value !== "string") return null;
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return JOIN_CODE_PATTERN.test(code) ? code : null;
};

/** Clerk user ids ("user_2abc..."); anything else is rejected */
export const isUserId = (value: unknown): value is string =>
  typeof value === "string" && /^user_[A-Za-z0-9]{10,64}$/.test(value);

export const classInputSchema = z.object({
  name: z
    .string()
    .transform((value) => cleanText(value, LIMITS.className).replace(/[<>{}]/g, ""))
    .pipe(z.string().min(1)),
  subject: z
    .union([z.enum(subjects as [string, ...string[]]), z.literal("")])
    .transform((value) => value || null),
});

/** yyyy-mm-dd, from yesterday (time zones) up to a year ahead */
const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const day = Date.parse(`${value}T12:00:00Z`);
    const now = Date.now();
    return !Number.isNaN(day) && day > now - 2 * 86400000 && day < now + 366 * 86400000;
  });

export const assignmentInputSchema = z
  .object({
    classId: z.uuid(),
    courseId: z.uuid(),
    everyone: z.boolean(),
    studentIds: z.array(z.string().refine(isUserId)).max(LIMITS.pickedStudents).default([]),
    dueDate: z.union([dueDateSchema, z.literal("")]).transform((value) => value || null),
    message: z
      .string()
      .transform((value) => cleanText(value, LIMITS.message).replace(/[<>{}]/g, ""))
      .default(""),
  })
  .refine((value) => value.everyone || value.studentIds.length > 0, { path: ["studentIds"] });

export type AssignmentInput = z.input<typeof assignmentInputSchema>;

export const supportSchema = z
  .object({
    slowerSpeech: z.boolean().optional(),
    shorterMinutes: z.number().int().min(3).max(60).nullable().optional(),
    autoRead: z.boolean().optional(),
  })
  .strict();

export type Support = z.infer<typeof supportSchema>;

/** Reads support stored in the database, ignoring anything unexpected */
export const readSupport = (value: unknown): Support => {
  const parsed = supportSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
};

/** "Lili K." from a Clerk name: what the teacher sees, nothing more */
export const shortDisplayName = (first?: string | null, last?: string | null, fallback = "Diák") => {
  const clean = (value?: string | null) => cleanText(value ?? "", LIMITS.displayName).replace(/[<>{}]/g, "");
  const firstName = clean(first);
  const initial = clean(last).charAt(0);
  const name = [firstName, initial && `${initial.toUpperCase()}.`].filter(Boolean).join(" ");
  return (name || fallback).slice(0, LIMITS.displayName);
};
