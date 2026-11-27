"use server";

import { auth, clerkClient, type User } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "../supabase";
import { canTeach, readRole } from "../roles";
import { LIMITS, classAccountNameSchema, classAccountsInputSchema, isUserId, isUuid } from "../validation";
import {
  isAnimal,
  readClassAccount,
  type Animal,
  type ClassAccount,
  type ClassAccountMeta,
  type LoginCard,
} from "../classAccounts";
import { hashCardSecret, newCardSecret, newPassword, newUsername, pickAnimals } from "../classAccounts.server";

// Server actions for class accounts (20261112_class_accounts.sql). A browser
// can call these with any arguments, so each one checks the teacher role,
// that the class or account is theirs (in Clerk, which browsers cannot
// change, and in the database policies), and validates its input.

const requireTeacher = async () => {
  const { userId, sessionClaims } = await auth();
  if (!userId || !canTeach(readRole(sessionClaims?.app_role))) throw new Error("Not a teacher");
  return userId;
};

const refresh = () => revalidatePath("/", "layout");

/** "Lili K." → first name "Lili", last name "K.", so the student's home page says "Szia, Lili!" */
const splitName = (displayName: string) => {
  const [first, ...rest] = displayName.split(" ");
  return { firstName: first, lastName: rest.join(" ") || undefined };
};

/** The class account and its Clerk user, when this teacher created it; throws otherwise */
const requireOwnedAccount = async (studentId: string) => {
  const teacher = await requireTeacher();
  if (!isUserId(studentId)) throw new Error("Invalid student");
  const client = await clerkClient();
  const user = await client.users.getUser(studentId);
  const meta = readClassAccount(user.publicMetadata);
  if (!meta || meta.by !== teacher) throw new Error("Not your class account");
  // The policies return the row only to the teacher of its class
  const supabase = createSupabaseClient();
  const { data: row } = await supabase
    .from("class_accounts")
    .select("student_id, class_id, display_name, animal")
    .eq("student_id", studentId)
    .eq("created_by", teacher)
    .maybeSingle();
  if (!row || row.class_id !== meta.classId) throw new Error("Not your class account");
  return { client, user, meta, row: row as { student_id: string; class_id: string; display_name: string; animal: string } };
};

/** A new password and card key for an account, written to Clerk */
const issueSecrets = async (
  client: Awaited<ReturnType<typeof clerkClient>>,
  user: User,
  locale: "hu" | "en"
) => {
  const password = newPassword(locale);
  const secret = newCardSecret();
  // Signs the student out everywhere: a lost card stops working at once
  await client.users.updateUser(user.id, { password, skipPasswordChecks: true, signOutOfOtherSessions: true });
  await client.users.updateUserMetadata(user.id, {
    privateMetadata: { cardKeyHash: hashCardSecret(secret), cardIssuedAt: new Date().toISOString() },
  });
  return { password, cardKey: `${user.id}.${secret}` };
};

// ─── Reading ─────────────────────────────────────────────────────────────────

/** The class accounts of one of this teacher's classes */
export const getClassAccounts = async (classId: string): Promise<ClassAccount[]> => {
  await requireTeacher();
  if (!isUuid(classId)) return [];
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("class_accounts")
    .select("student_id, display_name, animal, created_at, joined_at")
    .eq("class_id", classId);
  if (error) return [];
  return (data ?? [])
    .map((r) => ({
      studentId: r.student_id as string,
      displayName: r.display_name as string,
      animal: (isAnimal(r.animal) ? r.animal : "fox") as Animal,
      createdAt: r.created_at as string,
      joinedAt: (r.joined_at as string | null) ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "hu"));
};

// ─── Creating ────────────────────────────────────────────────────────────────

export type CreateAccountsResult = {
  /** done: all made; partial: some made before an error; clerk_setup: Clerk does not allow accounts without e-mail yet */
  status: "done" | "partial" | "clerk_setup" | "too_many" | "error";
  cards: LoginCard[];
};

/** Clerk refuses a user without an e-mail address (or with a username) until the dashboard allows it */
const isSetupError = (error: unknown) =>
  isClerkAPIResponseError(error) &&
  error.errors.some(
    (e) =>
      ["form_param_missing", "form_param_unknown", "form_param_not_allowed"].includes(e.code) ||
      /email|username/i.test(e.meta?.paramName ?? "")
  );

const isTakenUsername = (error: unknown) =>
  isClerkAPIResponseError(error) && error.errors.some((e) => e.code === "form_identifier_exists");

export const createClassAccounts = async (input: {
  classId: string;
  names: string[];
  locale: string;
}): Promise<CreateAccountsResult> => {
  const teacher = await requireTeacher();
  const parsed = classAccountsInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", cards: [] };
  const { classId, names, locale } = parsed.data;

  const supabase = createSupabaseClient();
  const { data: cls } = await supabase.from("classes").select("id, teacher_id").eq("id", classId).maybeSingle();
  if (!cls || cls.teacher_id !== teacher) return { status: "error", cards: [] };

  const { data: existing } = await supabase.from("class_accounts").select("animal").eq("class_id", classId);
  if ((existing?.length ?? 0) + names.length > LIMITS.classAccountsPerClass) return { status: "too_many", cards: [] };

  const client = await clerkClient();
  const animals = pickAnimals(names.length, (existing ?? []).map((r) => r.animal as string));
  const meta: ClassAccountMeta = { classId, by: teacher };
  const cards: LoginCard[] = [];

  // One after another: Clerk limits how fast accounts may be created
  for (const [index, displayName] of names.entries()) {
    const password = newPassword(locale);
    const secret = newCardSecret();
    let user: User | null = null;
    try {
      for (let attempt = 0; attempt < 4 && !user; attempt++) {
        try {
          user = await client.users.createUser({
            username: newUsername(displayName),
            password,
            ...splitName(displayName),
            skipPasswordChecks: true,
            skipLegalChecks: true,
            publicMetadata: { classAccount: meta },
            privateMetadata: { cardKeyHash: hashCardSecret(secret), cardIssuedAt: new Date().toISOString() },
          });
        } catch (error) {
          if (!isTakenUsername(error)) throw error;
        }
      }
      if (!user) throw new Error("No free username");
    } catch (error) {
      console.error("class account not created", error);
      const status = cards.length ? "partial" : isSetupError(error) ? "clerk_setup" : "error";
      if (cards.length) refresh();
      return { status, cards };
    }

    const { error } = await supabase.from("class_accounts").insert({
      student_id: user.id,
      class_id: classId,
      display_name: displayName,
      animal: animals[index],
    });
    if (error) {
      // No half-made accounts: without its row the teacher could not manage it
      await client.users.deleteUser(user.id).catch(() => undefined);
      console.error("class account row not saved", error);
      if (cards.length) refresh();
      return { status: cards.length ? "partial" : "error", cards };
    }
    cards.push({
      studentId: user.id,
      displayName,
      username: user.username ?? "",
      password,
      animal: animals[index],
      cardKey: `${user.id}.${secret}`,
    });
  }

  refresh();
  return { status: "done", cards };
};

// ─── Managing ────────────────────────────────────────────────────────────────

/** A new card (new password and QR code); the old card stops working at once */
export const issueNewCard = async (input: { studentId: string; locale: string }): Promise<LoginCard> => {
  const { client, user, row } = await requireOwnedAccount(input.studentId);
  const locale = input.locale === "en" ? "en" : "hu";
  const { password, cardKey } = await issueSecrets(client, user, locale);
  return {
    studentId: user.id,
    displayName: row.display_name,
    username: user.username ?? "",
    password,
    animal: isAnimal(row.animal) ? row.animal : "fox",
    cardKey,
  };
};

export const renameClassAccount = async (input: { studentId: string; name: string }) => {
  const { client, user } = await requireOwnedAccount(input.studentId);
  const parsed = classAccountNameSchema.safeParse(input.name);
  if (!parsed.success) throw new Error("Invalid name");
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("rename_class_account", { p_student: user.id, p_name: parsed.data });
  if (error || data !== "ok") throw new Error("Not renamed");
  await client.users.updateUser(user.id, splitName(parsed.data));
  refresh();
  return parsed.data;
};

/** Deletes the account and its data for good: first our rows, then the Clerk user */
const deleteOwnedAccount = async (studentId: string) => {
  const { client, user } = await requireOwnedAccount(studentId);
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("delete_class_account", { p_student: user.id });
  if (error || data !== "ok") throw new Error("Not deleted");
  await client.users.deleteUser(user.id);
};

export const deleteClassAccount = async (studentId: string) => {
  await deleteOwnedAccount(studentId);
  refresh();
};

/**
 * Before a class is deleted: its class accounts go with it, so no account is
 * left behind that nobody can manage. Called by deleteClass.
 */
export const deleteAccountsOfClass = async (classId: string) => {
  const teacher = await requireTeacher();
  if (!isUuid(classId)) throw new Error("Invalid class");
  const supabase = createSupabaseClient();
  const { data } = await supabase
    .from("class_accounts")
    .select("student_id")
    .eq("class_id", classId)
    .eq("created_by", teacher);
  for (const row of data ?? []) await deleteOwnedAccount(row.student_id as string);
};
