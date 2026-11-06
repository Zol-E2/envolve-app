"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { getAdminSafetyOpen, type AdminSafetyOpen } from "@/lib/actions/admin.actions";
import SafetyBar from "@/components/SafetyBar";

/** Admins do not need to react within seconds; once a minute is enough */
const POLL_MS = 60_000;
/** The newest report this admin has already looked at on "Órabiztonság" (this browser) */
const SEEN_KEY = "envolve:adminSafetySeen";

const readSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
};
const saveSeen = (value: string) => {
  try {
    localStorage.setItem(SEEN_KEY, value);
  } catch {
    // private window: the bar shows again next time, which is fine
  }
};

/**
 * For admins, on every page: a bar when there is something new on
 * "Órabiztonság" since they last looked: a rule break or a call for help
 * no teacher has opened, or a report that could not be linked to a
 * student. Numbers only, never names. Opening "Órabiztonság" clears it;
 * the admin home keeps listing open rule breaks as a to-do.
 */
const AdminSafetyBar = () => {
  const t = useTranslations("AdminSafety");
  const pathname = usePathname();
  const onSafetyPage = pathname.startsWith("/admin/safety");
  const [open, setOpen] = useState<AdminSafetyOpen | null>(null);
  const [seen, setSeen] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    // No admin access (e.g. two-step verification still off): no bar
    const counts = await getAdminSafetyOpen().catch(() => null);
    setOpen(counts);
    if (counts?.latestAt && onSafetyPage) saveSeen(counts.latestAt);
    setSeen(readSeen());
  }, [onSafetyPage]);

  useEffect(() => {
    // First check right after the page has rendered, then every so often
    const soon = window.setTimeout(() => void check(), 0);
    const timer = window.setInterval(() => void check(), POLL_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(soon);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  if (!open || onSafetyPage || seen === null || !open.latestAt) return null;
  // Timestamps from the database compare correctly as dates, not as text
  if (seen && Date.parse(open.latestAt) <= Date.parse(seen)) return null;
  const parts = [
    open.violations > 0 && t("barViolations", { count: open.violations }),
    open.help > 0 && t("barHelp", { count: open.help }),
    open.unassigned > 0 && t("barUnassigned", { count: open.unassigned }),
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <SafetyBar
      tone={open.violations > 0 || open.unassigned > 0 ? "alert" : "help"}
      text={`${t("barTitle")} ${parts.join(" · ")}`}
      href="/admin/safety"
      action={t("barOpen")}
    />
  );
};

export default AdminSafetyBar;
