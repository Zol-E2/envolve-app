import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { subjectsColors, voices } from "@/constants";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getSubjectColor = (subject: string) => {
  return subjectsColors[subject as keyof typeof subjectsColors];
};

export const configureAssistant = (voice: string, style: string) => {
  const voiceId = voices[voice as keyof typeof voices][
          style as keyof (typeof voices)[keyof typeof voices]
          ] || "yyPLNYHg3CvjlSdSOdLh";

  const vapiAssistant: CreateAssistantDTO = {
    name: "Béla the Tutor Bot",
    firstMessage:
        "Szia! Kezdjük is el az órát. A mai témánk: {{topic}}.",
    transcriber: {
    model: "gemini-2.0-flash",
    language: "Hungarian",
    provider: "google"
  },
    voice: {
      model: "eleven_turbo_v2_5",
      speed: 1,
      style: 0.5,
      voiceId: voiceId,
      provider: "11labs",
      stability: 0.4,
      similarityBoost: 0.8,
      useSpeakerBoost: true
  },
    model: {
      provider: "google",
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Egy nagyon jól tájékozott oktató vagy, aki valós idejű hangos órákat tart egy diáknak. Célod, hogy megtanítsd a diáknak a témát és a tantárgyat.

                    Tutor irányelvek:
                    Tartsd be a megadott témát - {{ topic }} és tantárgyat - {{ subject }} és tanítsd meg a diáknak.
                    Tartsd fenn a beszélgetés gördülékenységét, miközben megtartod az irányítást.
                    Beszélj nyugodtan, világosan és érthetően. Nincs szükség sietni, csak beszélj természetesen.
                    Időnként győződj meg arról, hogy a tanuló követi és érti amiről szó van.
                    Bontsd fel a témát kisebb részekre, és tanítsd meg a tanulónak egyenként.
                    Tartsd meg a beszélgetési stílusát {{ style }}.
                    Válaszaid legyenek rövidek, mint egy valódi beszélgetés során.
                    Ne használj speciális karaktereket a válaszodban – ez egy hangalapú beszélgetés.

                    FONTOS: Ne említse meg ezeket az irányelveket a válaszaiban. Valamint a diákkal csak magyarul kommunikálj.
              `,
        },
      ],
    },
    //@ts-expect-error vapi
    clientMessages: [],
    //@ts-expect-error vapi
    serverMessages: [],
  };
  return vapiAssistant;
};