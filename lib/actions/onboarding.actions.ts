"use server";

import * as z from "zod";
import { createSupabaseClient } from "@/lib/supabase";

const onboardingEventSchema = z.object({
  flow: z.enum([
    "welcome",
    "home",
    "courses",
    "newCourse",
    "lesson",
    "profile",
    "subscription",
    "signIn",
    "notFound",
    "legal",
    "classes",
    "classDetail",
    "assign",
    "join",
  ]),
  event: z.enum([
    "start",
    "complete",
    "skip",
    "mic_granted",
    "mic_denied",
    "mic_unavailable",
  ]),
  step: z.number().int().min(0).max(20).optional(),
  locale: z.enum(["hu", "en"]),
});

export type OnboardingEvent = z.infer<typeof onboardingEventSchema>;

/**
 * Records an anonymous onboarding event (which tour, which step, which
 * language) for measuring where students get stuck. No user id is stored.
 * Never throws: analytics must not break the app, and before the
 * `onboarding_events` migration has run the insert just fails quietly.
 */
export const logOnboardingEvent = async (input: OnboardingEvent) => {
  const parsed = onboardingEventSchema.safeParse(input);
  if (!parsed.success) return;

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("onboarding_events").insert({
      ...parsed.data,
      step: parsed.data.step ?? null,
    });
    if (error) console.warn("Onboarding event not saved:", error.message);
  } catch (error) {
    console.warn("Onboarding event not saved:", error);
  }
};
