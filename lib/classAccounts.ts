/**
 * Class accounts (supabase/migrations/20261112_class_accounts.sql): students
 * without an e-mail address, created by their teacher, who sign in with a
 * printed login card (QR code, username and an easy password).
 *
 * Imported by server and client code: keep it free of Node-only modules.
 */

/** Small pictures a child recognises their own card by; the database checks the same list */
export const ANIMALS = {
  fox: "🦊",
  turtle: "🐢",
  owl: "🦉",
  cat: "🐱",
  dog: "🐶",
  rabbit: "🐰",
  bear: "🐻",
  lion: "🦁",
  frog: "🐸",
  panda: "🐼",
  koala: "🐨",
  penguin: "🐧",
  hedgehog: "🦔",
  bee: "🐝",
  fish: "🐟",
  unicorn: "🦄",
} as const;
export type Animal = keyof typeof ANIMALS;
export const ANIMAL_KEYS = Object.keys(ANIMALS) as Animal[];

export const isAnimal = (value: unknown): value is Animal =>
  typeof value === "string" && (ANIMAL_KEYS as string[]).includes(value);

/** What our server writes to a class account's Clerk publicMetadata (browsers cannot change it) */
export interface ClassAccountMeta {
  classId: string;
  /** The teacher who created it, and who alone may manage it */
  by: string;
}

/** The class account marker from a Clerk user's publicMetadata, or null for everyone else */
export const readClassAccount = (publicMetadata: unknown): ClassAccountMeta | null => {
  const value =
    publicMetadata && typeof publicMetadata === "object"
      ? (publicMetadata as Record<string, unknown>).classAccount
      : null;
  if (!value || typeof value !== "object") return null;
  const { classId, by } = value as Record<string, unknown>;
  return typeof classId === "string" && typeof by === "string" ? { classId, by } : null;
};

/** The QR card key: the Clerk user id and a long random secret */
export const CARD_KEY_PATTERN = /^(user_[A-Za-z0-9]{10,64})\.([A-Za-z0-9_-]{32,64})$/;

/** The address a card's QR code opens; the key is in the #fragment, so it never reaches server logs */
export const cardUrl = (origin: string, locale: string, key: string) => `${origin}/${locale}/sign-in/card#k=${key}`;

/** The card key from a scanned QR code: a full card address or the bare key */
export const readCardKey = (text: string): string | null => {
  const trimmed = text.trim();
  const fromUrl = /[#&?]k=([^&#\s]+)/.exec(trimmed)?.[1];
  const key = fromUrl ?? trimmed;
  return CARD_KEY_PATTERN.test(key) ? key : null;
};

/** One printed card, shown to the teacher only once, right after it is made */
export interface LoginCard {
  studentId: string;
  displayName: string;
  username: string;
  password: string;
  animal: Animal;
  cardKey: string;
}

/** A class account in the teacher's list */
export interface ClassAccount {
  studentId: string;
  displayName: string;
  animal: Animal;
  createdAt: string;
  /** When the student first signed in, or null */
  joinedAt: string | null;
}
