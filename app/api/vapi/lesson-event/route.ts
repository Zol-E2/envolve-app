import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-admin";
import { isCallId, lessonEventSchema } from "@/lib/validation";

/**
 * Vapi calls this when the tutor uses its "jelentes" (report) tool: the
 * lesson left its topic (drift), someone tried to break the rules
 * (violation), or the student may need help (help). See
 * supabase/migrations/20261107_lesson_safety.sql for what is stored and who
 * sees it.
 *
 * Only Vapi may call it: every request must carry VAPI_TOOL_SECRET, either
 * as a bearer token (a Vapi "Bearer Token" credential on the tool) or in
 * the x-vapi-secret header. Nothing from the conversation is stored, only
 * the kind and category the tutor chose, and only if they are on the list.
 */

const TOOL_NAMES = new Set(["jelentes", "report_lesson_event"]);
const MAX_BODY = 256 * 1024;

const secretMatches = (given: string | null, expected: string) => {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

type ToolCall = { id?: unknown; function?: { name?: unknown; arguments?: unknown } };

/** Arguments arrive as an object or as a JSON string, depending on the model */
const readArguments = (value: unknown) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  return value;
};

export async function POST(request: Request) {
  const secret = process.env.VAPI_TOOL_SECRET;
  // Not configured yet: refuse everything rather than accept anything
  if (!secret || secret.length < 24) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const header = request.headers.get("x-vapi-secret");
  if (!secretMatches(bearer, secret) && !secretMatches(header, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const message = (body as { message?: Record<string, unknown> } | null)?.message;
  const callId = (message?.call as { id?: unknown } | undefined)?.id;
  const fromList = Array.isArray(message?.toolCallList) ? (message.toolCallList as ToolCall[]) : [];
  const fromTools = Array.isArray(message?.toolWithToolCallList)
    ? (message.toolWithToolCallList as { toolCall?: ToolCall }[]).map((item) => item?.toolCall ?? {})
    : [];
  const toolCalls = (fromList.length > 0 ? fromList : fromTools).slice(0, 10);

  const supabase = createServiceClient();
  const results: { toolCallId: string; result: string }[] = [];

  for (const call of toolCalls) {
    const toolCallId = typeof call.id === "string" ? call.id.slice(0, 100) : "";
    if (!toolCallId) continue;
    const name = call.function?.name;
    if (typeof name !== "string" || !TOOL_NAMES.has(name)) {
      results.push({ toolCallId, result: "Unknown tool." });
      continue;
    }
    const parsed = lessonEventSchema.safeParse(readArguments(call.function?.arguments));
    if (!parsed.success || !isCallId(callId) || !supabase) {
      // The tutor still ends the lesson as its instructions say
      results.push({ toolCallId, result: "Noted. End the lesson now as instructed." });
      continue;
    }
    const { error } = await supabase.rpc("record_lesson_event", {
      p_call_id: callId,
      p_kind: parsed.data.kind,
      p_category: parsed.data.category,
    });
    if (error) console.error("lesson event not recorded", error.message);
    results.push({ toolCallId, result: "Recorded. Say your closing sentence and end the call." });
  }

  // Vapi expects 200 with a result for each tool call
  return NextResponse.json({ results });
}
