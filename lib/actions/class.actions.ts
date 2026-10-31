"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "../supabase";
import { cleanJoinCode, isUuid, readSupport, shortDisplayName, type Support } from "../validation";
import { computeProgress, type Attempt, type EndReason } from "../teacher/status";
import type { ClassCourse, LessonAssignment, StudentClass, StudentTask } from "../teacher/types";

// Server actions for students in a class. Each checks who is signed in; the
// database policies make sure a student only sees their own classes and the
// assignments meant for them.

const currentUserId = async () => (await auth()).userId ?? null;
const refresh = () => revalidatePath("/", "layout");

const effectiveMinutes = (courseMinutes: number, support: Support) =>
  support.shorterMinutes ? Math.min(support.shorterMinutes, courseMinutes) : courseMinutes;

export type JoinResult =
  | { status: "joined"; className: string; teacherName: string }
  | { status: "invalid_code" | "own_class" | "too_many_attempts" | "error" };

/** Joins the class with this code; the teacher sees the student as "Lili K." */
export const joinClass = async (code: string): Promise<JoinResult> => {
  const userId = await currentUserId();
  if (!userId) return { status: "error" };
  const clean = cleanJoinCode(code);
  if (!clean) return { status: "invalid_code" };

  const user = await currentUser();
  const displayName = shortDisplayName(user?.firstName, user?.lastName, user?.username ?? undefined);

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("join_class", { p_code: clean, p_display_name: displayName });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return { status: "error" };
  if (row.status !== "joined") {
    return { status: row.status === "own_class" || row.status === "too_many_attempts" ? row.status : "invalid_code" };
  }
  refresh();
  return { status: "joined", className: row.class_name, teacherName: row.teacher_name };
};

export const leaveClass = async (classId: string) => {
  const userId = await currentUserId();
  if (!userId || !isUuid(classId)) throw new Error("Invalid class");
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("class_members").delete().eq("class_id", classId).eq("student_id", userId);
  if (error) throw new Error("Not left");
  refresh();
};

/** The classes the student has joined */
export const getMyClasses = async (): Promise<StudentClass[]> => {
  const userId = await currentUserId();
  if (!userId) return [];
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("class_members")
    .select("class:classes(id, name, subject, teacher_name)")
    .eq("student_id", userId);
  if (error) return [];
  return (data ?? [])
    .map(({ class: c }) => c as unknown as { id: string; name: string; subject: string | null; teacher_name: string } | null)
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ id: c.id, name: c.name, subject: c.subject, teacherName: c.teacher_name }));
};

type TaskRow = {
  id: string;
  class_id: string;
  due_date: string | null;
  message: string | null;
  course: ClassCourse | null;
  class: { name: string; teacher_name: string } | null;
};

/**
 * The student's assignments with where they are with each. Not-done ones
 * come first, the nearest due date first; finished ones from the last week
 * follow, so the student sees what they have achieved.
 */
export const getMyTasks = async (): Promise<StudentTask[]> => {
  const userId = await currentUserId();
  if (!userId) return [];
  const supabase = createSupabaseClient();
  const { data: memberships } = await supabase
    .from("class_members")
    .select("class_id, support")
    .eq("student_id", userId);
  const classIds = (memberships ?? []).map((m) => m.class_id as string);
  if (classIds.length === 0) return [];

  const [{ data: rows, error }, { data: attempts }] = await Promise.all([
    // The policies return only assignments meant for this student; the class
    // filter keeps a teacher's own assignments off their home page
    supabase
      .from("assignments")
      .select("id, class_id, due_date, message, course:courses(id, name, subject, duration, language), class:classes(name, teacher_name)")
      .in("class_id", classIds)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("lesson_attempts")
      .select("student_id, assignment_id, started_at, ended_at, seconds, end_reason")
      .eq("student_id", userId),
  ]);
  if (error) return [];

  const supportByClass = new Map((memberships ?? []).map((m) => [m.class_id as string, readSupport(m.support)]));
  const weekAgo = Date.now() - 7 * 86400000;

  return ((rows ?? []) as unknown as TaskRow[])
    .filter((r): r is TaskRow & { course: ClassCourse; class: NonNullable<TaskRow["class"]> } => !!r.course && !!r.class)
    .map((r) => {
      const support = supportByClass.get(r.class_id) ?? {};
      const minutes = effectiveMinutes(r.course.duration, support);
      return {
        assignmentId: r.id,
        dueDate: r.due_date,
        message: r.message ?? "",
        teacherName: r.class.teacher_name,
        className: r.class.name,
        course: r.course,
        minutes,
        support,
        progress: computeProgress(
          ((attempts ?? []) as Attempt[]).filter((a) => a.assignment_id === r.id),
          minutes,
          r.due_date
        ),
      };
    })
    .filter((t) => t.progress.status !== "done" || Date.parse(t.progress.lastActivity ?? "") > weekAgo)
    .sort((a, b) => {
      const doneA = a.progress.status === "done" ? 1 : 0;
      const doneB = b.progress.status === "done" ? 1 : 0;
      return doneA - doneB || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
    });
};

/** The assignment a lesson was started from, if it is really meant for this student */
export const getLessonAssignment = async (
  assignmentId: string,
  courseId: string
): Promise<LessonAssignment | null> => {
  const userId = await currentUserId();
  if (!userId || !isUuid(assignmentId) || !isUuid(courseId)) return null;
  const supabase = createSupabaseClient();
  const { data: row } = await supabase
    .from("assignments")
    .select("id, class_id, course_id, course:courses(duration)")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!row || row.course_id !== courseId) return null;
  const { data: member } = await supabase
    .from("class_members")
    .select("support")
    .eq("class_id", row.class_id)
    .eq("student_id", userId)
    .maybeSingle();
  if (!member) return null;
  const support = readSupport(member.support);
  const duration = (row.course as unknown as { duration: number } | null)?.duration ?? 15;
  return { assignmentId: row.id, minutes: effectiveMinutes(duration, support), support };
};

// ─── Lesson attempts (only for lessons started from an assignment) ──────────

export const startLessonAttempt = async (assignmentId: string, courseId: string) => {
  const userId = await currentUserId();
  if (!userId || !isUuid(assignmentId) || !isUuid(courseId)) return null;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("lesson_attempts")
    .insert({ assignment_id: assignmentId, course_id: courseId })
    .select("id")
    .single();
  return error || !data ? null : (data.id as string);
};

const END_REASONS: EndReason[] = ["finished", "left", "mic_denied", "error"];

export const finishLessonAttempt = async (attemptId: string, seconds: number, reason: EndReason) => {
  const userId = await currentUserId();
  if (!userId || !isUuid(attemptId) || !END_REASONS.includes(reason)) return;
  const safeSeconds = Math.max(0, Math.min(7200, Math.round(Number(seconds) || 0)));
  const supabase = createSupabaseClient();
  await supabase
    .from("lesson_attempts")
    .update({ ended_at: new Date().toISOString(), seconds: safeSeconds, end_reason: reason })
    .eq("id", attemptId)
    .eq("student_id", userId)
    .is("ended_at", null);
  refresh();
};

/** A lesson that could not even start because the microphone is blocked */
export const recordMicBlocked = async (assignmentId: string, courseId: string) => {
  const id = await startLessonAttempt(assignmentId, courseId);
  if (id) await finishLessonAttempt(id, 0, "mic_denied");
};
