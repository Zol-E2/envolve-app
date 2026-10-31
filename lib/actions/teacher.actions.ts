"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "../supabase";
import { canTeach, readRole } from "../roles";
import {
  LIMITS,
  assignmentInputSchema,
  classInputSchema,
  isUserId,
  isUuid,
  readSupport,
  readTeacherProfile,
  supportSchema,
  teacherProfileSchema,
  type AssignmentInput,
  type Support,
} from "../validation";
import { STATUS_ORDER, computeProgress, type Attempt, type LessonStatus } from "../teacher/status";
import { localDate } from "../week";
import type {
  AssignmentProgress,
  ClassCourse,
  ClassDetail,
  ClassMember,
  ClassSummary,
  TeacherOverview,
} from "../teacher/types";

// Server actions for teachers. A browser can call these with any arguments,
// so each one checks the teacher role and validates its input; the database
// policies (supabase/migrations/20261101_teacher_classes.sql) then make sure
// a teacher only ever touches their own classes.

/** The signed-in teacher's id; throws for students and visitors */
const requireTeacher = async () => {
  const { userId, sessionClaims } = await auth();
  if (!userId || !canTeach(readRole(sessionClaims?.app_role))) throw new Error("Not a teacher");
  return userId;
};

const refresh = () => revalidatePath("/", "layout");

const effectiveMinutes = (courseMinutes: number, support: Support) =>
  support.shorterMinutes ? Math.min(support.shorterMinutes, courseMinutes) : courseMinutes;

/** Assignments younger than this count towards a class's "needs attention" number */
const RECENT_DAYS = 30;

type AssignmentRow = {
  id: string;
  created_at: string;
  class_id: string;
  due_date: string | null;
  message: string | null;
  everyone: boolean;
  course: ClassCourse | null;
};

type MemberRow = { class_id: string; student_id: string; display_name: string; support: unknown; joined_at: string };

/** Who each assignment is for, and where they are with it */
const buildProgress = (
  assignments: AssignmentRow[],
  members: MemberRow[],
  picked: { assignment_id: string; student_id: string }[],
  attempts: Attempt[],
  now = new Date()
): AssignmentProgress[] =>
  assignments
    .filter((a): a is AssignmentRow & { course: ClassCourse } => !!a.course)
    .map((a) => {
      const classMembers = members.filter((m) => m.class_id === a.class_id);
      const pickedIds = new Set(picked.filter((p) => p.assignment_id === a.id).map((p) => p.student_id));
      const audience = a.everyone ? classMembers : classMembers.filter((m) => pickedIds.has(m.student_id));
      const counts: Record<LessonStatus, number> = { stuck: 0, inProgress: 0, notStarted: 0, done: 0 };
      const students = audience
        .map((m) => {
          const minutes = effectiveMinutes(a.course.duration, readSupport(m.support));
          const progress = computeProgress(
            attempts.filter((t) => t.assignment_id === a.id && t.student_id === m.student_id),
            minutes,
            a.due_date,
            now
          );
          counts[progress.status]++;
          return { studentId: m.student_id, displayName: m.display_name, progress, minutes };
        })
        .sort(
          (x, y) =>
            STATUS_ORDER[x.progress.status] - STATUS_ORDER[y.progress.status] ||
            x.displayName.localeCompare(y.displayName, "hu")
        );
      return {
        id: a.id,
        createdAt: a.created_at,
        dueDate: a.due_date,
        message: a.message ?? "",
        everyone: a.everyone,
        course: a.course,
        students,
        counts,
      };
    });

const COURSE_FIELDS = "id, name, subject, duration, language";

/** Loads assignments, picked students and attempts for some classes in three queries */
const loadClassData = async (classIds: string[], since?: string) => {
  const supabase = createSupabaseClient();
  if (classIds.length === 0) return { members: [], assignments: [], picked: [], attempts: [] };

  let assignmentQuery = supabase
    .from("assignments")
    .select(`id, created_at, class_id, due_date, message, everyone, course:courses(${COURSE_FIELDS})`)
    .in("class_id", classIds)
    .order("created_at", { ascending: false })
    .limit(200);
  if (since) assignmentQuery = assignmentQuery.gte("created_at", since);

  const [{ data: members, error: memberError }, { data: assignments, error: assignmentError }] =
    await Promise.all([
      supabase
        .from("class_members")
        .select("class_id, student_id, display_name, support, joined_at")
        .in("class_id", classIds),
      assignmentQuery,
    ]);
  if (memberError || assignmentError) throw new Error("Class data not loaded");

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  if (assignmentIds.length === 0) {
    return { members: (members ?? []) as MemberRow[], assignments: [], picked: [], attempts: [] };
  }
  const [{ data: picked, error: pickedError }, { data: attempts, error: attemptError }] = await Promise.all([
    supabase.from("assignment_students").select("assignment_id, student_id").in("assignment_id", assignmentIds),
    supabase
      .from("lesson_attempts")
      .select("student_id, assignment_id, started_at, ended_at, seconds, end_reason")
      .in("assignment_id", assignmentIds),
  ]);
  if (pickedError || attemptError) throw new Error("Class data not loaded");

  return {
    members: (members ?? []) as MemberRow[],
    // Many-to-one embeds come back as a single object
    assignments: (assignments ?? []) as unknown as AssignmentRow[],
    picked: picked ?? [],
    attempts: (attempts ?? []) as Attempt[],
  };
};

// ─── Classes ─────────────────────────────────────────────────────────────────

/** The teacher's classes with their recent assignments, in four queries */
const loadTeacherData = async () => {
  const teacher = await requireTeacher();
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, subject, join_code")
    .eq("teacher_id", teacher)
    .order("created_at", { ascending: true });
  if (error) throw new Error("Classes not loaded");

  const ids = (data ?? []).map((c) => c.id);
  const since = new Date(Date.now() - RECENT_DAYS * 86400000).toISOString();
  const { members, assignments, picked, attempts } = await loadClassData(ids, since);
  const progress = buildProgress(assignments, members, picked, attempts);
  return { rows: data ?? [], members, assignments, progress };
};

/** The teacher's classes, with how many students need help */
export const getTeacherClasses = async (): Promise<ClassSummary[]> => {
  const { rows, members, assignments, progress } = await loadTeacherData();
  return summarize(rows, members, assignments, progress);
};

const summarize = (
  rows: { id: string; name: string; subject: string | null; join_code: string }[],
  members: MemberRow[],
  assignments: AssignmentRow[],
  progress: AssignmentProgress[]
): ClassSummary[] =>
  rows.map((c) => {
    const stuck = new Set(
      progress
        .filter((p) => assignments.find((a) => a.id === p.id)?.class_id === c.id)
        .flatMap((p) => p.students.filter((s) => s.progress.status === "stuck").map((s) => s.studentId))
    );
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      joinCode: c.join_code,
      studentCount: members.filter((m) => m.class_id === c.id).length,
      stuckCount: stuck.size,
    };
  });

/**
 * The teacher's home page: who needs help (across all classes), what is due
 * soon, and the classes. Things to act on first, no statistics.
 */
export const getTeacherOverview = async (): Promise<TeacherOverview> => {
  const { rows, members, assignments, progress } = await loadTeacherData();
  const classOf = new Map(assignments.map((a) => [a.id, a.class_id]));
  const className = new Map(rows.map((c) => [c.id, c.name]));
  const today = localDate(new Date());
  const inTwoWeeks = localDate(new Date(Date.now() + 14 * 86400000));

  const stuck = progress
    .flatMap((p) =>
      p.students
        .filter((s) => s.progress.status === "stuck")
        .map((s) => ({
          studentName: s.displayName,
          classId: classOf.get(p.id) ?? "",
          className: className.get(classOf.get(p.id) ?? "") ?? "",
          assignmentId: p.id,
          courseName: p.course.name,
          progress: s.progress,
        }))
    )
    .sort((a, b) => (b.progress.lastActivity ?? "").localeCompare(a.progress.lastActivity ?? ""))
    .slice(0, 8);

  const deadlines = progress
    .filter((p) => p.dueDate && p.dueDate >= today && p.dueDate <= inTwoWeeks)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 6)
    .map((p) => ({
      assignmentId: p.id,
      classId: classOf.get(p.id) ?? "",
      className: className.get(classOf.get(p.id) ?? "") ?? "",
      courseName: p.course.name,
      dueDate: p.dueDate as string,
      done: p.counts.done,
      total: p.students.length,
    }));

  return { classes: summarize(rows, members, assignments, progress), stuck, deadlines };
};

// ─── Teacher profile ─────────────────────────────────────────────────────────

/** The name students see, and the school; stored with the teacher's account */
export const updateTeacherProfile = async (input: { name: string; school: string }) => {
  const teacher = await requireTeacher();
  const parsed = teacherProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid profile");
  const { name, school } = parsed.data;

  const client = await clerkClient();
  await client.users.updateUserMetadata(teacher, { unsafeMetadata: { teacherName: name, school } });

  // Students see the new name in every class of this teacher
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("classes").update({ teacher_name: name }).eq("teacher_id", teacher);
  if (error) throw new Error("Classes not updated");
  refresh();
};

export const createClass = async (input: { name: string; subject: string }) => {
  const teacher = await requireTeacher();
  const parsed = classInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid class data");

  const supabase = createSupabaseClient();
  const { count } = await supabase
    .from("classes")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", teacher);
  if ((count ?? 0) >= LIMITS.classesPerTeacher) throw new Error("Too many classes");

  const user = await currentUser();
  const teacherName = readTeacherProfile(user?.unsafeMetadata, user?.firstName, user?.lastName).name;

  // The database picks a random code; on the rare clash it simply tries again
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("classes")
      .insert({ name: parsed.data.name, subject: parsed.data.subject, teacher_name: teacherName })
      .select("id")
      .single();
    if (!error && data) {
      refresh();
      return data.id as string;
    }
    if (error?.code !== "23505") break;
  }
  throw new Error("Class not created");
};

export const deleteClass = async (classId: string) => {
  const teacher = await requireTeacher();
  if (!isUuid(classId)) throw new Error("Invalid class");
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("classes").delete().eq("id", classId).eq("teacher_id", teacher);
  if (error) throw new Error("Class not deleted");
  refresh();
};

/** A new join code, when the old one was shared too widely */
export const regenerateJoinCode = async (classId: string) => {
  await requireTeacher();
  if (!isUuid(classId)) throw new Error("Invalid class");
  const supabase = createSupabaseClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.rpc("regenerate_join_code", { p_class: classId });
    if (!error) {
      refresh();
      return data as string;
    }
    if (error.code !== "23505") break;
  }
  throw new Error("Code not changed");
};

/** Everything the class page shows; null when it is not the teacher's class */
export const getClassDetail = async (classId: string): Promise<ClassDetail | null> => {
  const teacher = await requireTeacher();
  if (!isUuid(classId)) return null;
  const supabase = createSupabaseClient();
  const { data: row } = await supabase
    .from("classes")
    .select("id, name, subject, join_code, teacher_name, teacher_id")
    .eq("id", classId)
    .maybeSingle();
  if (!row || row.teacher_id !== teacher) return null;

  const { members, assignments, picked, attempts } = await loadClassData([classId]);
  const memberList: ClassMember[] = members
    .map((m) => ({
      studentId: m.student_id,
      displayName: m.display_name,
      support: readSupport(m.support),
      joinedAt: m.joined_at,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "hu"));

  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    joinCode: row.join_code,
    teacherName: row.teacher_name,
    members: memberList,
    assignments: buildProgress(assignments, members, picked, attempts),
  };
};

// ─── Students ────────────────────────────────────────────────────────────────

export const setStudentSupport = async (classId: string, studentId: string, support: Support) => {
  await requireTeacher();
  if (!isUuid(classId) || !isUserId(studentId)) throw new Error("Invalid student");
  const parsed = supportSchema.safeParse(support);
  if (!parsed.success) throw new Error("Invalid support");
  // Store only what is switched on, so the row stays small and readable
  const clean: Support = {
    ...(parsed.data.slowerSpeech && { slowerSpeech: true }),
    ...(parsed.data.autoRead && { autoRead: true }),
    ...(parsed.data.shorterMinutes && { shorterMinutes: parsed.data.shorterMinutes }),
  };
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("class_members")
    .update({ support: clean })
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .select("student_id");
  if (error || !data?.length) throw new Error("Support not saved");
  refresh();
  return clean;
};

export const removeStudent = async (classId: string, studentId: string) => {
  await requireTeacher();
  if (!isUuid(classId) || !isUserId(studentId)) throw new Error("Invalid student");
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", studentId);
  if (error) throw new Error("Student not removed");
  refresh();
};

// ─── Assignments ─────────────────────────────────────────────────────────────

/** Courses a teacher can hand out: their own first, then the newest in the library */
export const getAssignableCourses = async () => {
  const teacher = await requireTeacher();
  const supabase = createSupabaseClient();
  const [own, library] = await Promise.all([
    supabase.from("courses").select(COURSE_FIELDS).eq("author", teacher).order("created_at", { ascending: false }).limit(50),
    supabase.from("courses").select(COURSE_FIELDS).neq("author", teacher).order("created_at", { ascending: false }).limit(50),
  ]);
  if (own.error || library.error) throw new Error("Courses not loaded");
  return { own: (own.data ?? []) as ClassCourse[], library: (library.data ?? []) as ClassCourse[] };
};

export const createAssignment = async (input: AssignmentInput) => {
  const teacher = await requireTeacher();
  const parsed = assignmentInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid assignment");
  const { classId, courseId, everyone, studentIds, dueDate, message } = parsed.data;

  const supabase = createSupabaseClient();
  const { data: row } = await supabase.from("classes").select("teacher_id").eq("id", classId).maybeSingle();
  if (!row || row.teacher_id !== teacher) throw new Error("Not your class");

  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({ class_id: classId, course_id: courseId, everyone, due_date: dueDate, message: message || null })
    .select("id")
    .single();
  if (error || !assignment) throw new Error("Assignment not created");

  if (!everyone) {
    const { error: pickError } = await supabase
      .from("assignment_students")
      .insert([...new Set(studentIds)].map((studentId) => ({ assignment_id: assignment.id, student_id: studentId })));
    if (pickError) {
      // Never leave a half-made assignment that nobody can see
      await supabase.from("assignments").delete().eq("id", assignment.id);
      throw new Error("Assignment not created");
    }
  }
  refresh();
  return assignment.id as string;
};

export const deleteAssignment = async (assignmentId: string) => {
  await requireTeacher();
  if (!isUuid(assignmentId)) throw new Error("Invalid assignment");
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
  if (error) throw new Error("Assignment not deleted");
  refresh();
};
