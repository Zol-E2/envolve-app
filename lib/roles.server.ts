import { auth } from "@clerk/nextjs/server";
import { canTeach, readRole } from "./roles";

/** The signed-in user's role from the session token, or null for students */
export const getRole = async () => readRole((await auth()).sessionClaims?.app_role);

/** True when the signed-in user may run classes */
export const isTeacher = async () => canTeach(await getRole());
