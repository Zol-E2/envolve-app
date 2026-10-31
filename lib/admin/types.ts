import type { CourseTab, ReportReason, RoleChoice } from "../validation";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: RoleChoice;
  createdAt: number;
  lastActiveAt: number | null;
}

export interface AuditEntry {
  id: number;
  actorName: string;
  action: "role_change" | "course_public" | "course_hidden" | "course_featured" | "course_unfeatured" | "course_deleted";
  targetType: "user" | "course";
  targetId: string;
  targetLabel: string;
  detail: string;
  createdAt: string;
}

export interface AdminOverview {
  users: { student: number; teacher: number; admin: number; total: number; capped: boolean };
  courses: { public: number; review: number; hidden: number };
  openReports: number;
  activeStudentsWeek: number;
  lessonsWeek: number;
  flagged: number;
  log: AuditEntry[];
}

export interface ModerationReport {
  reason: ReportReason;
  note: string;
  adult: boolean;
  createdAt: string;
}

export interface ModerationCourse {
  id: string;
  name: string;
  subject: string;
  topic: string;
  language: string;
  createdAt: string;
  authorName: string;
  authorEmail: string;
  authorRole: RoleChoice;
  visibility: "public" | "review" | "hidden";
  reviewReason: "unchecked" | "filter" | "reports" | null;
  featured: boolean;
  reports: ModerationReport[];
}

export interface ModerationList {
  tab: CourseTab;
  counts: Record<CourseTab, number>;
  courses: ModerationCourse[];
}
