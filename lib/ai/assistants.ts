import type { AssistantOverrides, ElevenLabsVoice } from "@vapi-ai/web/dist/api";
import { voices } from "@/constants";
import huMessages from "@/messages/hu.json";
import enMessages from "@/messages/en.json";

export type LessonLanguage = "hu" | "en";

export const isLessonLanguage = (value: unknown): value is LessonLanguage =>
  value === "hu" || value === "en";

/**
 * Saved assistants in the Vapi dashboard, one per lesson language.
 * The prompt, transcriber, LLM and voice model are configured there, so they
 * can be changed (and versioned) without a redeploy. The env vars let a
 * deployment point at different assistants without a code change.
 */
export const VAPI_ASSISTANT_IDS: Record<LessonLanguage, string> = {
  hu:
    process.env.NEXT_PUBLIC_VAPI_ASSISTANT_HU ||
    "e6ed1cb3-eaa5-4173-ba9e-785e7be9d91b", // eNvolve Tanár HU
  en:
    process.env.NEXT_PUBLIC_VAPI_ASSISTANT_EN ||
    "8b18d6c9-5220-459a-8f52-c9f7ddbc00d5", // eNvolve Tutor EN
};

// Must match the voice model set on the saved assistants. Cast because the
// @vapi-ai/web 2.5 type definitions predate eleven_v4_turbo.
const VOICE_MODEL = "eleven_v4_turbo" as ElevenLabsVoice["model"];

const subjectNames = { hu: huMessages.Subjects, en: enMessages.Subjects };

/** Subject name in the lesson's language ("maths" → "Matematika" in a Hungarian lesson). */
export const getLessonSubjectLabel = (
  language: LessonLanguage,
  subject: string
) => subjectNames[language][subject as keyof typeof enMessages.Subjects] ?? subject;

interface LessonCallInput {
  language: LessonLanguage;
  voice: string;
  subject: string;
  topic: string;
}

/** Picks the saved assistant for the lesson language and fills in the lesson details. */
export const buildLessonCall = ({
  language,
  voice,
  subject,
  topic,
}: LessonCallInput): { assistantId: string; overrides: AssistantOverrides } => {
  const lang = isLessonLanguage(language) ? language : "hu";
  const gender = voice === "male" ? "male" : "female";

  return {
    assistantId: VAPI_ASSISTANT_IDS[lang],
    overrides: {
      variableValues: {
        subject: getLessonSubjectLabel(lang, subject),
        topic,
      },
      voice: {
        provider: "11labs",
        voiceId: voices[lang][gender],
        model: VOICE_MODEL,
      },
    },
  };
};
