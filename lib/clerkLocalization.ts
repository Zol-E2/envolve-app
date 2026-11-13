import { enUS, huHU } from "@clerk/localizations";

/**
 * Clerk's Hungarian texts lack a few newer keys, and Clerk shows the English
 * text for those: the sign-in box was titled "Continue to eNvolve". Fill in
 * the ones the sign-in flow can show.
 */
const hu: typeof huHU = {
  ...huHU,
  signIn: {
    ...huHU.signIn,
    start: {
      ...huHU.signIn?.start,
      titleCombined: "Bejelentkezés az {{applicationName}} fiókba",
    },
    passwordCompromised: {
      ...huHU.signIn?.passwordCompromised,
      title: "Ez a jelszó nem biztonságos",
    },
    passwordUntrusted: {
      ...huHU.signIn?.passwordUntrusted,
      title: "Ez a jelszó nem megbízható",
    },
    emailLink: {
      ...huHU.signIn?.emailLink,
      clientMismatch: {
        ...huHU.signIn?.emailLink?.clientMismatch,
        title: "Ez a link ezen az eszközön nem működik",
        subtitle:
          "A folytatáshoz azon az eszközön és böngészőben nyisd meg a linket, ahol a bejelentkezést elkezdted",
      },
    },
  },
};

export const clerkLocalization = (locale: string) => (locale === "hu" ? hu : enUS);
