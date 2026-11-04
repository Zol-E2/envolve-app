"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { vapi } from "./vapi.sdk";
import { getLessonOutcome, registerLessonCall } from "./actions/safety.actions";
import { lessonEventSchema, type LessonEventKind } from "./validation";

/**
 * Lesson safety in the browser (supabase/migrations/20261107_lesson_safety.sql).
 *
 * The tutor reports drift, a rule break or a call for help with its
 * "jelentes" tool and then ends the call; the server stores the report and
 * tells the teacher. Here we only:
 *   - link the call to the signed-in student right after it starts (no link,
 *     no lesson: the call is stopped);
 *   - show the right closing screen (the tool call also reaches the browser);
 *   - stop the call ourselves if the tutor has not hung up a few seconds
 *     after reporting.
 * The browser's view is only for the screen. What the teacher sees comes
 * from the server.
 */

const TOOL_NAMES = new Set(["jelentes", "report_lesson_event"]);
/** Time for the tutor's closing sentence before we hang up ourselves */
const STOP_AFTER_MS = 12_000;
const RANK: Record<LessonEventKind, number> = { help: 0, violation: 1, drift: 2 };

const stronger = (a: LessonEventKind | null, b: LessonEventKind) => (!a || RANK[b] < RANK[a] ? b : a);

/** The kind of report in a Vapi "tool-calls" message, if it has one */
const reportIn = (message: unknown): LessonEventKind | null => {
  const m = message as { type?: string; toolCallList?: { function?: { name?: string; arguments?: unknown } }[] };
  if (m?.type !== "tool-calls" || !Array.isArray(m.toolCallList)) return null;
  let found: LessonEventKind | null = null;
  for (const call of m.toolCallList) {
    if (!call?.function?.name || !TOOL_NAMES.has(call.function.name)) continue;
    let args = call.function.arguments;
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        args = null;
      }
    }
    const parsed = lessonEventSchema.safeParse(args);
    if (parsed.success) found = stronger(found, parsed.data.kind);
  }
  return found;
};

export const useLessonSafety = () => {
  const [outcome, setOutcome] = useState<LessonEventKind | null>(null);
  const outcomeRef = useRef<LessonEventKind | null>(null);
  const callId = useRef<string | null>(null);
  const stopTimer = useRef<number | null>(null);

  const note = useCallback((kind: LessonEventKind) => {
    const next = stronger(outcomeRef.current, kind);
    outcomeRef.current = next;
    setOutcome(next);
  }, []);

  useEffect(() => {
    const clearTimer = () => {
      if (stopTimer.current != null) window.clearTimeout(stopTimer.current);
      stopTimer.current = null;
    };
    const onMessage = (message: unknown) => {
      const kind = reportIn(message);
      if (!kind) return;
      note(kind);
      if (stopTimer.current == null) {
        stopTimer.current = window.setTimeout(() => vapi.stop(), STOP_AFTER_MS);
      }
    };
    const onCallEnd = () => {
      clearTimer();
      const id = callId.current;
      if (!id) return;
      // The server has the final word (the browser may have missed a message)
      window.setTimeout(() => {
        void getLessonOutcome(id)
          .then((kind) => kind && note(kind))
          .catch(() => undefined);
      }, 2000);
    };
    vapi.on("message", onMessage);
    vapi.on("call-end", onCallEnd);
    return () => {
      vapi.off("message", onMessage);
      vapi.off("call-end", onCallEnd);
      clearTimer();
    };
  }, [note]);

  /**
   * Starts tracking a call that is being started. Resolves to false (and
   * stops the call) when it cannot be linked to the student.
   */
  const track = useCallback(
    async (
      starting: Promise<{ id?: string } | null>,
      link: { courseId?: string | null; attemptId?: Promise<string | null> | null } = {}
    ) => {
      outcomeRef.current = null;
      setOutcome(null);
      callId.current = null;
      const call = await starting.catch(() => null);
      if (!call?.id) return false;
      callId.current = call.id;
      const attemptId = link.attemptId ? await link.attemptId.catch(() => null) : null;
      const linked = await registerLessonCall({ callId: call.id, courseId: link.courseId ?? null, attemptId }).catch(
        () => false
      );
      if (!linked) {
        vapi.stop();
        return false;
      }
      return true;
    },
    []
  );

  return { outcome, outcomeRef, track };
};
