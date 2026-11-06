"use server";

import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "../supabase";
import { requireAdmin } from "../admin/access";
import { readRole } from "../roles";
import {
  COURSE_TABS,
  cleanText,
  isUuid,
  moderationSchema,
  readCourseTab,
  roleChangeSchema,
  type CourseTab,
  type ModerationAction,
  type ReportReason,
  type RoleChoice,
} from "../validation";
import type {
  AdminOverview,
  AdminUser,
  AuditEntry,
  ModerationCourse,
  ModerationList,
} from "../admin/types";

// Server actions for the admin view. A browser can call these with any
// arguments, so each one checks the admin role and two-step verification
// (lib/admin/access.ts) and validates its input. The database checks the
// admin role again (supabase/migrations/20261103_admin.sql).
//
// People's names and e-mail addresses come from Clerk and are not copied
// into our database. Lesson data is only ever counted, never listed.

const roleOf = (user: User): RoleChoice => readRole(user.publicMetadata?.role) ?? "student";

const toAdminUser = (user: User): AdminUser => ({
  id: user.id,
  name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "",
  email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "",
  role: roleOf(user),
  createdAt: user.createdAt,
  lastActiveAt: user.lastActiveAt,
});

/** Names and e-mails for some Clerk ids, in one request */
const usersById = async (ids: string[]) => {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 100);
  if (unique.length === 0) return new Map<string, AdminUser>();
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ userId: unique, limit: unique.length });
  return new Map(data.map((user) => [user.id, toAdminUser(user)]));
};

const refresh = () => revalidatePath("/", "layout");

// ─── Overview ────────────────────────────────────────────────────────────────

/** Clerk returns at most 500 users per request; above that the role counts are a sample */
const USER_SAMPLE = 500;

export const getAdminOverview = async (): Promise<AdminOverview> => {
  await requireAdmin();
  const supabase = createSupabaseClient();
  const client = await clerkClient();

  const [users, stats, attention, log] = await Promise.all([
    client.users.getUserList({ limit: USER_SAMPLE, orderBy: "-created_at" }),
    supabase.rpc("admin_stats").single(),
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("visibility", "review")
      .in("review_reason", ["filter", "reports"]),
    getAuditLog(6),
  ]);
  if (stats.error || !stats.data) throw new Error("Overview not loaded");

  const counts = { student: 0, teacher: 0, admin: 0 };
  for (const user of users.data) counts[roleOf(user)]++;
  const s = stats.data as {
    public_courses: number;
    review_courses: number;
    hidden_courses: number;
    open_reports: number;
    active_students_week: number;
    lessons_week: number;
  };

  return {
    users: { ...counts, total: users.totalCount, capped: users.totalCount > USER_SAMPLE },
    courses: { public: s.public_courses, review: s.review_courses, hidden: s.hidden_courses },
    openReports: s.open_reports,
    activeStudentsWeek: s.active_students_week,
    lessonsWeek: s.lessons_week,
    flagged: attention.count ?? 0,
    log,
  };
};

// ─── Admin log ───────────────────────────────────────────────────────────────

export const getAuditLog = async (limit = 100): Promise<AuditEntry[]> => {
  await requireAdmin();
  const safeLimit = Math.min(Math.max(Math.trunc(Number(limit)) || 100, 1), 200);
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id, actor, action, target_type, target_id, target_label, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw new Error("Log not loaded");

  const actors = await usersById((data ?? []).map((row) => row.actor as string));
  return (data ?? []).map((row) => ({
    id: row.id as number,
    actorName: actors.get(row.actor)?.name || actors.get(row.actor)?.email || row.actor,
    action: row.action as AuditEntry["action"],
    targetType: row.target_type as AuditEntry["targetType"],
    targetId: row.target_id as string,
    targetLabel: (row.target_label as string | null) ?? "",
    detail: (row.detail as string | null) ?? "",
    createdAt: row.created_at as string,
  }));
};

// ─── Users ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export const listUsers = async ({ query = "", page = 1 }: { query?: string; page?: number } = {}) => {
  const me = await requireAdmin();
  // Passed to Clerk as a URL parameter by its SDK; e-mail dots stay
  const q = typeof query === "string" ? cleanText(query, 100) : "";
  const safePage = Math.min(Math.max(Math.trunc(Number(page)) || 1, 1), 200);
  const client = await clerkClient();
  const { data, totalCount } = await client.users.getUserList({
    query: q || undefined,
    limit: PAGE_SIZE,
    offset: (safePage - 1) * PAGE_SIZE,
    orderBy: "-last_active_at",
  });
  return {
    users: data.map(toAdminUser),
    total: totalCount,
    page: safePage,
    pageSize: PAGE_SIZE,
    meId: me,
  };
};

/**
 * Gives someone another role. The same as `npm run role:set`, but from the
 * Users page, with a reason, and written to the admin log. Nobody can change
 * their own role, so the last admin can never lock everyone out.
 */
export const changeUserRole = async (input: { userId: string; role: RoleChoice; reason: string }) => {
  const me = await requireAdmin();
  const parsed = roleChangeSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid role change");
  const { userId, role, reason } = parsed.data;
  if (userId === me) throw new Error("Own role");

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const from = roleOf(user);
  if (from === role) return { changed: false };

  // Merges into publicMetadata; null removes the key (= student)
  await client.users.updateUserMetadata(userId, { publicMetadata: { role: role === "student" ? null : role } });

  const label = toAdminUser(user);
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("admin_audit_log").insert({
    actor: me,
    action: "role_change",
    target_type: "user",
    target_id: userId,
    target_label: (label.email || label.name).slice(0, 200),
    detail: `${from} → ${role}: ${reason}`.slice(0, 300),
  });
  if (error) console.error("admin log: role change not recorded", error.message);

  refresh();
  return { changed: true };
};

// ─── Courses ─────────────────────────────────────────────────────────────────

const COURSE_COLUMNS = "id, name, subject, topic, language, created_at, author, visibility, review_reason, featured";

type CourseRow = {
  id: string;
  name: string;
  subject: string;
  topic: string;
  language: string;
  created_at: string;
  author: string;
  visibility: ModerationCourse["visibility"];
  review_reason: ModerationCourse["reviewReason"];
  featured: boolean;
};

/** What needs a decision first: reported, then flagged by the filter, then unchecked */
const REASON_ORDER = { reports: 0, filter: 1, unchecked: 2 } as const;

export const getModerationCourses = async (tabInput?: string): Promise<ModerationList> => {
  await requireAdmin();
  const tab = readCourseTab(tabInput);
  const supabase = createSupabaseClient();

  const countFor = (t: CourseTab) => {
    const base = supabase.from("courses").select("id", { count: "exact", head: true });
    return t === "featured" ? base.eq("featured", true) : base.eq("visibility", t);
  };
  let listQuery = supabase.from("courses").select(COURSE_COLUMNS).order("created_at", { ascending: false }).limit(60);
  listQuery = tab === "featured" ? listQuery.eq("featured", true) : listQuery.eq("visibility", tab);

  const [list, ...counted] = await Promise.all([listQuery, ...COURSE_TABS.map(countFor)]);
  if (list.error) throw new Error("Courses not loaded");
  const rows = (list.data ?? []) as CourseRow[];
  const counts = Object.fromEntries(COURSE_TABS.map((t, i) => [t, counted[i].count ?? 0])) as Record<CourseTab, number>;

  const ids = rows.map((r) => r.id);
  const [reports, authors] = await Promise.all([
    ids.length
      ? supabase
          .from("course_reports")
          .select("course_id, reason, note, reporter_is_adult, created_at")
          .eq("status", "open")
          .in("course_id", ids)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { course_id: string; reason: string; note: string | null; reporter_is_adult: boolean; created_at: string }[] }),
    usersById(rows.map((r) => r.author)),
  ]);

  const courses: ModerationCourse[] = rows.map((r) => {
    const author = authors.get(r.author);
    return {
      id: r.id,
      name: r.name,
      subject: r.subject,
      topic: r.topic,
      language: r.language,
      createdAt: r.created_at,
      authorName: author?.name ?? "",
      authorEmail: author?.email ?? "",
      authorRole: author?.role ?? "student",
      visibility: r.visibility,
      reviewReason: r.review_reason,
      featured: r.featured,
      reports: (reports.data ?? [])
        .filter((rep) => rep.course_id === r.id)
        .map((rep) => ({
          reason: rep.reason as ReportReason,
          note: rep.note ?? "",
          adult: rep.reporter_is_adult,
          createdAt: rep.created_at,
        })),
    };
  });

  if (tab === "review") {
    courses.sort(
      (a, b) =>
        REASON_ORDER[a.reviewReason ?? "unchecked"] - REASON_ORDER[b.reviewReason ?? "unchecked"] ||
        b.createdAt.localeCompare(a.createdAt)
    );
  }
  return { tab, counts, courses };
};

/** One admin decision on a course; the database writes the admin log line */
export const moderateCourse = async (input: { courseId: string; action: ModerationAction }) => {
  await requireAdmin();
  const parsed = moderationSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid decision");
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("admin_moderate_course", {
    p_course: parsed.data.courseId,
    p_action: parsed.data.action,
    p_note: null,
  });
  if (error) throw new Error("Decision not saved");
  refresh();
  return data as "ok" | "not_found" | "not_public" | "invalid";
};

/** Visibility of one course, for the admin bar on the lesson preview */
export const getCourseModeration = async (courseId: string) => {
  await requireAdmin();
  if (!isUuid(courseId)) return null;
  const supabase = createSupabaseClient();
  const { data } = await supabase
    .from("courses")
    .select("visibility, review_reason, featured")
    .eq("id", courseId)
    .maybeSingle();
  if (!data) return null;
  return {
    visibility: data.visibility as ModerationCourse["visibility"],
    reviewReason: data.review_reason as ModerationCourse["reviewReason"],
    featured: data.featured as boolean,
  };
};

// ─── Lesson safety ───────────────────────────────────────────────────────────

export interface AdminSafety {
  stats: {
    drift: number;
    violation: number;
    help: number;
    helpSeen: number;
    unassigned: number;
    violationMonth: number;
    helpMonth: number;
  };
  violations: {
    id: string;
    category: "override" | "inappropriate" | "hurtful";
    createdAt: string;
    seen: boolean;
    falseAlarm: boolean;
    studentName: string;
    studentEmail: string;
    courseName: string;
  }[];
}

/**
 * Rule breaks in lessons with the student's name; drift and help only as
 * numbers (a child asking for help is their school's business).
 */
export const getAdminSafety = async (): Promise<AdminSafety> => {
  await requireAdmin();
  const supabase = createSupabaseClient();
  const [stats, rows] = await Promise.all([
    supabase.rpc("admin_safety_stats").single(),
    supabase.rpc("admin_lesson_violations"),
  ]);
  if (stats.error || !stats.data || rows.error) {
    console.error("Lesson safety not loaded:", stats.error?.message ?? rows.error?.message ?? "no data");
    throw new Error("Safety not loaded");
  }
  const s = stats.data as Record<string, number>;
  const list = (rows.data ?? []) as {
    id: string;
    category: AdminSafety["violations"][number]["category"];
    created_at: string;
    acknowledged_at: string | null;
    false_alarm: boolean;
    student_id: string | null;
    course_name: string | null;
  }[];
  const people = await usersById(list.map((r) => r.student_id ?? ""));
  return {
    stats: {
      drift: s.drift_30d ?? 0,
      violation: s.violation_30d ?? 0,
      help: s.help_30d ?? 0,
      helpSeen: s.help_seen_30d ?? 0,
      unassigned: s.unassigned_30d ?? 0,
      violationMonth: s.violation_month ?? 0,
      helpMonth: s.help_month ?? 0,
    },
    violations: list.map((r) => {
      const person = r.student_id ? people.get(r.student_id) : undefined;
      return {
        id: r.id,
        category: r.category,
        createdAt: r.created_at,
        seen: r.acknowledged_at != null,
        falseAlarm: r.false_alarm,
        studentName: person?.name ?? "",
        studentEmail: person?.email ?? "",
        courseName: r.course_name ?? "",
      };
    }),
  };
};

export interface AdminSafetyOpen {
  /** Rule breaks no teacher has opened yet (30 days) */
  violations: number;
  /** Calls for help no teacher has opened yet (30 days), a number only */
  help: number;
  /** Reports from calls that could not be linked to a student (30 days) */
  unassigned: number;
  /** When the newest of the above came, or null */
  latestAt: string | null;
}

/**
 * What still needs someone's eyes, for the alert bar on every admin page
 * and the admin's home. Numbers only.
 */
export const getAdminSafetyOpen = async (): Promise<AdminSafetyOpen> => {
  await requireAdmin();
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("admin_safety_open").single();
  if (error || !data) {
    console.error("Lesson safety counts not loaded:", error?.message ?? "no data");
    throw new Error("Safety not loaded");
  }
  const row = data as { violation_open?: number; help_open?: number; unassigned_30d?: number; latest_at?: string | null };
  return {
    violations: row.violation_open ?? 0,
    help: row.help_open ?? 0,
    unassigned: row.unassigned_30d ?? 0,
    latestAt: row.latest_at ?? null,
  };
};
