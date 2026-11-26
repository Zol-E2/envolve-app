"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { vapi } from "./vapi.sdk";
import { getLessonOutcome, registerLessonCall, reportLessonEvent } from "./actions/safety.actions";
import { lessonEventSchema, type LessonEventCategory, type LessonEventKind } from "./validation";

/**
 * Lesson safety in the browser (supabase/migrations/20261107_lesson_safety.sql).
 *
 * The tutor reports drift, a rule break or a call for help with its
 * "jelentes" tool. Vapi then says the fixed closing sentence of that kind
 * (set on the tool, docs/vapi-lesson-safety.md) and ends the call; the
 * server stores the report and tells the teacher. Here we only:
 *   - link the call to the signed-in student right after it starts (no link,
 *     no lesson: the call is stopped);
 *   - show the right closing screen (the tool call also reaches the browser);
 *   - stop the call ourselves if it is still running after the report or
 *     after one of the fixed closing sentences. Nothing else ever stops it.
 * The browser's view is only for the screen. What the teacher sees comes
 * from the server.
 */

const TOOL_NAMES = new Set(["jelentes", "report_lesson_event"]);
/**
 * After a report: time for the closing sentence (the help one is long, and
 * slower with "slower speech") before we hang up ourselves
 */
const STOP_AFTER_MS = 25_000;
/** After a closing sentence: hang up this soon after the tutor stops talking */
const STOP_AFTER_SPEECH_MS = 3_000;
/** ...or at the latest this long after the sentence, if the speech never ends */
const STOP_AFTER_SENTENCE_MS = 15_000;
const RANK: Record<LessonEventKind, number> = { help: 0, violation: 1, drift: 2 };

const stronger = (a: LessonEventKind | null, b: LessonEventKind) => (!a || RANK[b] < RANK[a] ? b : a);

interface Report {
  kind: LessonEventKind;
  category: LessonEventCategory;
}

/**
 * The fixed closing sentences Vapi says after a report (one part of each,
 * in both lesson languages). Only these ever make the browser hang up.
 */
const CLOSING_SENTENCES: { kind: LessonEventKind; parts: string[] }[] = [
  { kind: "help", parts: ["szólok a tanárodnak", "let your teacher know"] },
  { kind: "violation", parts: ["ezt itt nem tudom folytatni", "can't continue with this here"] },
  { kind: "drift", parts: ["elkalandoztunk, ezért befejezzük", "drifted off topic, so let's stop"] },
];

const normalize = (text: string) => text.toLowerCase().replace(/[‘’`]/g, "'").replace(/\s+/g, " ");

/** The kind whose closing sentence the tutor just said, if any */
const closingIn = (message: unknown): LessonEventKind | null => {
  const m = message as { type?: string; role?: string; transcript?: unknown };
  if (m?.type !== "transcript" || m.role !== "assistant" || typeof m.transcript !== "string") return null;
  const said = normalize(m.transcript.slice(0, 2000));
  return CLOSING_SENTENCES.find(({ parts }) => parts.some((part) => said.includes(part)))?.kind ?? null;
};

/** The reports in a Vapi "tool-calls" message, if it has any */
const reportsIn = (message: unknown): Report[] => {
  const m = message as { type?: string; toolCallList?: { function?: { name?: string; arguments?: unknown } }[] };
  if (m?.type !== "tool-calls" || !Array.isArray(m.toolCallList)) return [];
  const found: Report[] = [];
  for (const call of m.toolCallList.slice(0, 10)) {
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
    if (parsed.success) found.push({ kind: parsed.data.kind, category: parsed.data.category as LessonEventCategory });
  }
  return found;
};

export const useLessonSafety = () => {
  const [outcome, setOutcome] = useState<LessonEventKind | null>(null);
  const outcomeRef = useRef<LessonEventKind | null>(null);
  const callId = useRef<string | null>(null);
  const stopTimer = useRef<number | null>(null);
  /** Set once a closing sentence was heard: hang up when the tutor stops talking */
  const closing = useRef(false);
  const afterSpeech = useRef<number | null>(null);
  /** Reports not yet confirmed by the server, one per kind */
  const pending = useRef(new Map<LessonEventKind, LessonEventCategory>());

  /** Sends the reports still waiting; kept for a retry until the server answers */
  const flush = useCallback(() => {
    const id = callId.current;
    if (!id) return; // sent once the call is linked (track)
    for (const [kind, category] of pending.current) {
      void reportLessonEvent({ callId: id, kind, category })
        .then((status) => {
          // "unknown": the link to the student is not stored yet; try again later
          if (status !== "unknown" && status !== "error") pending.current.delete(kind);
        })
        .catch(() => undefined);
    }
  }, []);

  const note = useCallback((kind: LessonEventKind) => {
    const next = stronger(outcomeRef.current, kind);
    outcomeRef.current = next;
    setOutcome(next);
  }, []);

  useEffect(() => {
    const clearTimer = () => {
      if (stopTimer.current != null) window.clearTimeout(stopTimer.current);
      if (afterSpeech.current != null) window.clearTimeout(afterSpeech.current);
      stopTimer.current = null;
      afterSpeech.current = null;
      closing.current = false;
    };
    const onMessage = (message: unknown) => {
      const said = closingIn(message);
      if (said) {
        // Vapi says this sentence only after a report and hangs up itself;
        // this is the safety net if the call keeps running anyway
        note(said);
        // A call for help must reach the teacher even if the report was
        // missed here. The server keeps the first report of each kind, and
        // Vapi's own (with the exact category) arrives before the sentence.
        if (said === "help" && !pending.current.has("help")) {
          pending.current.set("help", "danger");
          flush();
        }
        if (said === "drift" && !pending.current.has("drift")) {
          pending.current.set("drift", "off_topic");
          flush();
        }
        if (!closing.current) {
          closing.current = true;
          if (stopTimer.current != null) window.clearTimeout(stopTimer.current);
          stopTimer.current = window.setTimeout(() => vapi.stop(), STOP_AFTER_SENTENCE_MS);
        }
        return;
      }
      const reports = reportsIn(message);
      if (reports.length === 0) return;
      for (const report of reports) {
        note(report.kind);
        if (!pending.current.has(report.kind)) pending.current.set(report.kind, report.category);
      }
      flush();
      if (stopTimer.current == null) {
        stopTimer.current = window.setTimeout(() => vapi.stop(), STOP_AFTER_MS);
      }
    };
    const onCallEnd = () => {
      clearTimer();
      const id = callId.current;
      if (!id) return;
      // One more try for a report the server had not confirmed yet
      if (pending.current.size > 0) window.setTimeout(flush, 1000);
      // The server has the final word (the browser may have missed a message)
      window.setTimeout(() => {
        void getLessonOutcome(id)
          .then((kind) => kind && note(kind))
          .catch(() => undefined);
      }, 2000);
    };
    const onSpeechStart = () => {
      if (afterSpeech.current != null) window.clearTimeout(afterSpeech.current);
      afterSpeech.current = null;
    };
    const onSpeechEnd = () => {
      if (!closing.current) return;
      if (afterSpeech.current != null) window.clearTimeout(afterSpeech.current);
      afterSpeech.current = window.setTimeout(() => vapi.stop(), STOP_AFTER_SPEECH_MS);
    };
    vapi.on("message", onMessage);
    vapi.on("call-end", onCallEnd);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    return () => {
      vapi.off("message", onMessage);
      vapi.off("call-end", onCallEnd);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      clearTimer();
    };
  }, [note, flush]);

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
      pending.current.clear();
      closing.current = false;
      const call = await starting.catch(() => null);
      if (!call?.id) return false;
      const attemptId = link.attemptId ? await link.attemptId.catch(() => null) : null;
      const linked = await registerLessonCall({ callId: call.id, courseId: link.courseId ?? null, attemptId }).catch(
        () => false
      );
      if (!linked) {
        vapi.stop();
        return false;
      }
      // Reports that came while the call was being linked go out now
      callId.current = call.id;
      flush();
      return true;
    },
    [flush]
  );

  return { outcome, outcomeRef, track };
};
