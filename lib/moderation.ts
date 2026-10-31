import "server-only";
import { createServiceClient } from "./supabase-admin";

export type CheckResult = "ok" | "flagged" | "unavailable";

/**
 * Asks OpenAI's free moderation model whether a text is harmful (violence,
 * sexual content, self-harm, hate, harassment). It works in Hungarian too.
 * Anything that goes wrong counts as "unavailable", never as "ok".
 */
export const checkText = async (text: string): Promise<CheckResult> => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "unavailable";
  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return "unavailable";
    const body = (await response.json()) as { results?: { flagged?: boolean }[] };
    const result = body.results?.[0];
    if (!result || typeof result.flagged !== "boolean") return "unavailable";
    return result.flagged ? "flagged" : "ok";
  } catch {
    return "unavailable";
  }
};

/**
 * The automatic check of a new course (see 20261103_admin.sql). The author
 * can use the course straight away either way; this only decides whether it
 * appears in the shared library now, or waits for an admin:
 *   ok          → public
 *   flagged     → stays in review, reason "filter" (top of the admin list)
 *   unavailable → stays in review, reason "unchecked"
 */
export const moderateCourse = async (courseId: string, name: string, topic: string) => {
  const result = await checkText(`${name}\n\n${topic}`);
  if (result === "unavailable") return result;
  const supabase = createServiceClient();
  if (!supabase) return "unavailable";
  const update = result === "ok" ? { visibility: "public", review_reason: null } : { review_reason: "filter" };
  // Only while it is still waiting: an admin may have decided in the meantime
  await supabase.from("courses").update(update).eq("id", courseId).eq("visibility", "review");
  return result;
};
