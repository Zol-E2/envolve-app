"use client";

import { createContext, createElement, useContext, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { canTeach, readRole, type AppRole } from "./roles";
import { viewFor } from "./views";

// The role the server saw for this request, so the first render (before
// Clerk loads in the browser) already shows the right menu: no flash of the
// student menu for teachers
const InitialRole = createContext<AppRole | null>(null);

export const RoleProvider = ({ role, children }: { role: AppRole | null; children: ReactNode }) =>
  createElement(InitialRole.Provider, { value: role }, children);

/**
 * The role for showing or hiding UI (menus, cards). Only a convenience: the
 * pages, server actions and database check the role again.
 */
export const useRole = () => {
  const initial = useContext(InitialRole);
  const { isLoaded, user } = useUser();
  const role = isLoaded ? readRole(user?.publicMetadata?.role) : initial;
  return { role, isTeacher: canTeach(role), view: viewFor(role) };
};
