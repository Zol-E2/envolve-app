import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { readRole } from "../roles";

export type AdminAccess = { ok: true; userId: string } | { ok: false; reason: "not_admin" | "no_2fa" };

/**
 * Whether the signed-in user may use the admin view: the admin role, and
 * two-step verification turned on for their account. An admin account can
 * change anyone's role, so a password alone is not enough.
 */
export const adminAccess = async (): Promise<AdminAccess> => {
  const { userId, sessionClaims } = await auth();
  if (!userId || readRole(sessionClaims?.app_role) !== "admin") return { ok: false, reason: "not_admin" };
  const user = await currentUser();
  if (!user?.twoFactorEnabled) return { ok: false, reason: "no_2fa" };
  return { ok: true, userId };
};

/** For server actions: the admin's id, or an error */
export const requireAdmin = async () => {
  const access = await adminAccess();
  if (!access.ok) throw new Error(access.reason === "no_2fa" ? "Two-step verification required" : "Not an admin");
  return access.userId;
};

