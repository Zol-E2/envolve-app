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
