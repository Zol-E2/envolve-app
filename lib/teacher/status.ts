import { localDate } from "@/lib/week";

/**
 * Where a student is with one assignment, worked out from their lesson
 * attempts. Shared by the teacher's overview and the student's home card.
 *
 *   done        one attempt reached 80% of the lesson time, or the tutor
 *               closed the lesson properly
 *   stuck       the last attempt ended within 3 minutes, the microphone was
 *               blocked, or the connection broke
 *   inProgress  started, but neither of the above (or a lesson running now)
 *   notStarted  no attempt since the assignment was given
 *
 * "late" is a label on top: the due date has passed and it is not done.
 */

export type EndReason = "finished" | "left" | "mic_denied" | "error";

export interface Attempt {
  student_id: string;
  assignment_id: string;
  started_at: string;
  ended_at: string | null;
  seconds: number | null;
  end_reason: EndReason | null;
}

export type LessonStatus = "stuck" | "inProgress" | "notStarted" | "done";

export type StatusDetail =
  | { kind: "left"; minutes: number }
  | { kind: "micDenied" }
  | { kind: "connection" }
  | { kind: "learningNow" }
  | { kind: "progress"; minutes: number; total: number }
  | { kind: "doneOn"; date: string };

export interface StudentProgress {
  status: LessonStatus;
  detail?: StatusDetail;
  late: boolean;
  /** When the student last did something with this assignment */
  lastActivity?: string;
}

export const DONE_SHARE = 0.8;
export const STUCK_SECONDS = 180;
/** A lesson with no end recorded this long after its planned end broke off */
const GRACE_MINUTES = 10;

/** Order on the teacher's screen: who needs help first */
export const STATUS_ORDER: Record<LessonStatus, number> = {
  stuck: 0,
  inProgress: 1,
  notStarted: 2,
  done: 3,
};

const isLate = (dueDate: string | null, now: Date) => !!dueDate && localDate(now) > dueDate;

export const computeProgress = (
  attempts: Attempt[],
  totalMinutes: number,
  dueDate: string | null,
  now = new Date()
): StudentProgress => {
  const total = Math.max(1, totalMinutes);
  if (attempts.length === 0) return { status: "notStarted", late: isLate(dueDate, now) };

  const sorted = [...attempts].sort((a, b) => a.started_at.localeCompare(b.started_at));
  const latest = sorted[sorted.length - 1];
  const lastActivity = latest.ended_at ?? latest.started_at;

  const finished = sorted.find(
    (a) => a.end_reason === "finished" || (a.seconds ?? 0) >= total * 60 * DONE_SHARE
  );
  if (finished) {
    return {
      status: "done",
      late: false,
      detail: { kind: "doneOn", date: finished.ended_at ?? finished.started_at },
      lastActivity,
    };
  }

  const late = isLate(dueDate, now);

  if (!latest.ended_at) {
    const minutesAgo = (now.getTime() - Date.parse(latest.started_at)) / 60000;
    if (minutesAgo < total + GRACE_MINUTES) {
      return { status: "inProgress", late, detail: { kind: "learningNow" }, lastActivity };
    }
    return { status: "stuck", late, detail: { kind: "connection" }, lastActivity };
  }
  if (latest.end_reason === "mic_denied") {
    return { status: "stuck", late, detail: { kind: "micDenied" }, lastActivity };
  }
  if (latest.end_reason === "error") {
    return { status: "stuck", late, detail: { kind: "connection" }, lastActivity };
  }
  const seconds = latest.seconds ?? 0;
  if (seconds < STUCK_SECONDS) {
    return {
      status: "stuck",
      late,
      detail: { kind: "left", minutes: Math.max(1, Math.round(seconds / 60)) },
      lastActivity,
    };
  }
  const best = Math.max(...sorted.map((a) => a.seconds ?? 0));
  return {
    status: "inProgress",
    late,
    detail: { kind: "progress", minutes: Math.floor(best / 60), total },
    lastActivity,
  };
};

/** The end reason for an attempt the app is closing */
export const endReasonFor = (
  seconds: number,
  totalMinutes: number,
  { tutorClosed = false, failed = false } = {}
): EndReason => {
  if (failed) return "error";
  if (tutorClosed || seconds >= Math.max(1, totalMinutes) * 60 * DONE_SHARE) return "finished";
  return "left";
};
