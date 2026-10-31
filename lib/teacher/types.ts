import type { Support } from "@/lib/validation";
import type { StudentProgress } from "./status";

export interface ClassCourse {
  id: string;
  name: string;
  subject: string;
  duration: number;
  language: "hu" | "en";
}

export interface ClassSummary {
  id: string;
  name: string;
  subject: string | null;
  joinCode: string;
  studentCount: number;
  /** Students stuck on a recent assignment */
  stuckCount: number;
}

export interface ClassMember {
  studentId: string;
  displayName: string;
  support: Support;
  joinedAt: string;
}

export interface AssignmentProgress {
  id: string;
  createdAt: string;
  dueDate: string | null;
  message: string;
  everyone: boolean;
  course: ClassCourse;
  /** Students the assignment is for, with where each of them is */
  students: { studentId: string; displayName: string; progress: StudentProgress; minutes: number }[];
  counts: Record<StudentProgress["status"], number>;
}

export interface ClassDetail {
  id: string;
  name: string;
  subject: string | null;
  joinCode: string;
  teacherName: string;
  members: ClassMember[];
  /** Newest first */
  assignments: AssignmentProgress[];
}

export interface StudentClass {
  id: string;
  name: string;
  subject: string | null;
  teacherName: string;
}

/** An assignment as the student sees it on the home page */
export interface StudentTask {
  assignmentId: string;
  dueDate: string | null;
  message: string;
  teacherName: string;
  className: string;
  course: ClassCourse;
  /** Lesson length with the teacher's "shorter lesson" support applied */
  minutes: number;
  support: Support;
  progress: StudentProgress;
}

/** What the lesson page needs when a lesson starts from an assignment */
export interface LessonAssignment {
  assignmentId: string;
  minutes: number;
  support: Support;
}

/** The teacher's home page */
export interface TeacherOverview {
  classes: ClassSummary[];
  /** Newest first, at most 8 */
  stuck: {
    studentName: string;
    classId: string;
    className: string;
    assignmentId: string;
    courseName: string;
    progress: StudentProgress;
  }[];
  /** Due in the next two weeks, soonest first */
  deadlines: {
    assignmentId: string;
    classId: string;
    className: string;
    courseName: string;
    dueDate: string;
    done: number;
    total: number;
  }[];
}
