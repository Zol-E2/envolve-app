import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { ANIMAL_KEYS, readClassAccount, type Animal } from "./classAccounts";
import { createSupabaseClient } from "./supabase";

/**
 * Secrets for class accounts. Server only: the password and the card key are
 * shown to the teacher once, on the printed card, and never stored readable
 * (Clerk keeps the password hash, the card key's hash lives in the user's
 * private metadata).
 */

// Short, everyday words without accents, so a child can read them off the
// card and type them on any keyboard
const WORDS = {
  hu: [
    "alma", "hold", "nap", "kert", "tej", "vaj", "sajt", "labda", "sapka", "zokni",
    "ceruza", "toll", "kocka", "maci", "mese", "dal", "domb", "csillag", "macska", "kutya",
    "medve", "sas", "hal", "kacsa", "liba", "ablak", "asztal", "kifli", "torta", "keksz",
    "dinnye", "barack", "szilva", "eper", "meggy", "tenger", "sziget", "hegy", "patak", "tavasz",
    "piros", "lila", "barna", "erdei", "felleg", "hinta", "vonat", "busz", "kalap", "bogar",
  ],
  en: [
    "apple", "moon", "sun", "garden", "milk", "bread", "cheese", "ball", "hat", "sock",
    "pencil", "pen", "block", "teddy", "story", "song", "hill", "star", "cat", "dog",
    "bear", "eagle", "fish", "duck", "goose", "window", "table", "cake", "cookie", "melon",
    "peach", "plum", "berry", "cherry", "sea", "island", "river", "spring", "red", "purple",
    "brown", "cloud", "swing", "train", "bus", "boat", "kite", "frog", "leaf", "tree",
  ],
} as const;

const pick = <T>(list: readonly T[]) => list[randomInt(list.length)];

/** "alma-hold-42": easy to read and type, and long enough with Clerk's sign-in limits */
export const newPassword = (locale: "hu" | "en") => {
  const words = WORDS[locale];
  const first = pick(words);
  let second = pick(words);
  while (second === first) second = pick(words);
  return `${first}-${second}-${randomInt(10, 100)}`;
};

/** "lili-k-482" from "Lili K.": plain letters only, as Clerk usernames need */
export const newUsername = (displayName: string) => {
  const slug = displayName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20)
    .replace(/-+$/g, "");
  return `${slug || "diak"}-${randomInt(100, 1000)}`;
};

/** The secret half of a card key */
export const newCardSecret = () => randomBytes(24).toString("base64url");

export const hashCardSecret = (secret: string) => createHash("sha256").update(secret).digest("hex");

/** Compares a card secret with the stored hash without leaking timing */
export const cardSecretMatches = (secret: string, storedHash: unknown) => {
  if (typeof storedHash !== "string" || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(hashCardSecret(secret), "hex"), Buffer.from(storedHash, "hex"));
};

/** Different pictures for the students in one batch, as far as there are enough */
export const pickAnimals = (count: number, taken: readonly string[] = []): Animal[] => {
  const free = ANIMAL_KEYS.filter((a) => !taken.includes(a));
  const pool = [...(free.length ? free : ANIMAL_KEYS)];
  const result: Animal[] = [];
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) pool.push(...ANIMAL_KEYS);
    result.push(pool.splice(randomInt(pool.length), 1)[0]);
  }
  return result;
};

/**
 * A class account's first sign-in: joins the class it was made for. The
 * class comes from Clerk's publicMetadata, which only our server writes.
 * Called from the student home page with the signed-in user's own data;
 * does nothing for other accounts. Not a server action, so a browser cannot
 * call it with made-up metadata.
 */
export const claimClassAccount = async (publicMetadata: unknown, memberOf: readonly string[]) => {
  const meta = readClassAccount(publicMetadata);
  if (!meta || memberOf.includes(meta.classId)) return false;
  const supabase = createSupabaseClient();
  const { data } = await supabase.rpc("claim_class_account", { p_class: meta.classId });
  return data === "ok";
};
