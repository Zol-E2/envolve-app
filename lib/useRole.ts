"use client";

import { useUser } from "@clerk/nextjs";
import { canTeach, readRole } from "./roles";

/**
 * The role for showing or hiding UI (the "Classes" menu item). Only a
 * convenience: the pages, server actions and database check the role again.
 */
export const useRole = () => {
  const { user } = useUser();
  const role = readRole(user?.publicMetadata?.role);
  return { role, isTeacher: canTeach(role) };
};
