/**
 * App roles. Everyone is a student; a teacher or admin role is set only by
 * the project owner (scripts/set-role.mjs writes Clerk publicMetadata.role,
 * which browsers cannot change). The Clerk session token copies it into the
 * "app_role" claim, so the middleware, server code and database policies all
 * read the same value.
 *
 * Imported by server and client code.
 */
export const ROLES = ["teacher", "admin"] as const;
export type AppRole = (typeof ROLES)[number];

export const readRole = (value: unknown): AppRole | null =>
  (ROLES as readonly unknown[]).includes(value) ? (value as AppRole) : null;

/** Teachers and admins can run classes */
export const canTeach = (role: AppRole | null) => role === "teacher" || role === "admin";
