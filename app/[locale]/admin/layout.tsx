import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { adminAccess } from "@/lib/admin/access";
import TwoFactorRequired from "@/components/admin/TwoFactorRequired";

// Admin data changes all the time and belongs to nobody else
export const dynamic = "force-dynamic";

/**
 * Admin pages: the proxy (proxy.ts) already sends everyone else away; this is the
 * second check, plus two-step verification (lib/admin/access.ts).
 */
const AdminLayout = async ({ children }: { children: ReactNode }) => {
  const access = await adminAccess();
  if (!access.ok && access.reason === "not_admin") redirect({ href: "/", locale: await getLocale() });
  if (!access.ok) return <TwoFactorRequired />;
  return children;
};

export default AdminLayout;
