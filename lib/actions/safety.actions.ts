"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "../supabase";
import { canTeach, readRole } from "../roles";
import { isCallId, isUuid, type LessonEventCategory, type LessonEventKind } from "../validation";

// Lesson safety (supabase/migrations/20261107_lesson_safety.sql). A browser
// can call these with any arguments: each checks who is signed in, and the
// database functions decide what each person may see.

export interface LessonAlert {
  id: string;
  kind: LessonEventKind;
  category: LessonEventCategory;
  createdAt: string;
  seen: boolean;
  falseAlarm: boolean;
  studentName: string;
  className: string;
  courseName: string;
}

/**
 * Links a voice call to the signed-in student (and to the assignment lesson,
 * if any), so a report from the tutor reaches the right teacher. Called
 * right after the call starts. Returns false if the link could not be made.
 */
export const registerLessonCall = async (input: {
  callId: string;
  courseId?: string | null;
  attemptId?: string | null;
}) => {
  const { userId } = await auth();
  if (!userId || !isCallId(input.callId)) return false;
  const courseId = isUuid(input.courseId) ? input.courseId : null;
  const attemptId = isUuid(input.attemptId) ? input.attemptId : null;
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("lesson_calls")
    .insert({ call_id: input.callId, course_id: courseId, attempt_id: attemptId });
  if (!error) return true;
  // Already linked (the same call registered twice) still counts
  if (error.code === "23505") return true;
  // The table does not exist yet (the migration has not been run): lessons
  // keep working as before instead of all stopping at once
  if (error.code === "42P01" || error.code === "PGRST205") {
    console.warn("lesson_calls missing: run supabase/migrations/20261107_lesson_safety.sql");
    return true;
  }
  return false;
};

/** How the student's own lesson ended: drift, violation, help or null */
export const getLessonOutcome = async (callId: string): Promise<LessonEventKind | null> => {
  const { userId } = await auth();
  if (!userId || !isCallId(callId)) return null;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("my_lesson_outcome", { p_call_id: callId });
  if (error || typeof data !== "string") return null;
  return (["drift", "violation", "help"] as const).find((kind) => kind === data) ?? null;
};

/** The signed-in teacher's alerts from the last 30 days, newest first */
export const getTeacherAlerts = async (): Promise<LessonAlert[]> => {
  const { userId, sessionClaims } = await auth();
  if (!userId || !canTeach(readRole(sessionClaims?.app_role))) return [];
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("teacher_lesson_events");
  if (error) console.error("Lesson alerts not loaded:", error.message);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[])
    .map((row) => ({
      id: String(row.id),
      kind: row.kind as LessonEventKind,
      category: row.category as LessonEventCategory,
      createdAt: String(row.created_at),
      seen: row.acknowledged_at != null,
      falseAlarm: row.false_alarm === true,
      studentName: String(row.student_name ?? ""),
      className: String(row.class_name ?? ""),
      courseName: String(row.course_name ?? ""),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/** A teacher marks an alert as seen, or as a false alarm */
export const acknowledgeAlert = async (input: { id: string; falseAlarm?: boolean }) => {
  const { userId, sessionClaims } = await auth();
  if (!userId || !canTeach(readRole(sessionClaims?.app_role))) throw new Error("Not a teacher");
  if (!isUuid(input.id)) throw new Error("Invalid alert");
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("acknowledge_lesson_event", {
    p_event: input.id,
    p_false_alarm: input.falseAlarm === true,
  });
  if (error || data !== "ok") throw new Error("Not saved");
  revalidatePath("/", "layout");
};
