"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getTeacherAlerts } from "@/lib/actions/safety.actions";
import { playAlertChime } from "@/lib/alertSound";
import SafetyBar from "@/components/SafetyBar";

/** How often the teacher's open app checks for new alerts */
const POLL_MS = 30_000;
/** Alerts already announced with a sound in this browser tab, so a reload does not repeat it */
const SESSION_KEY = "envolve:alertsAnnounced";

const readAnnounced = () => {
  try {
    return new Set<string>(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]"));
  } catch {
    return new Set<string>();
  }
};
const saveAnnounced = (ids: Set<string>) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // private window: announced again after a reload, which is fine
  }
};

/**
 * For teachers, on every page: a bar under the menu while any lesson alert
 * of their students is still unopened (any lesson, assigned or not), and a
 * soft sound when a rule break or a call for help arrives. The overview
 * ("Értesítések az órákról") has the names and the buttons, so the bar is
 * not shown there.
 */
const LessonAlertWatcher = () => {
  const t = useTranslations("Safety");
  const router = useRouter();
  const pathname = usePathname();
  const known = useRef<Set<string> | null>(null);
  const [open, setOpen] = useState<{ count: number; help: boolean }>({ count: 0, help: false });

  const check = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const alerts = await getTeacherAlerts().catch(() => null);
    if (!alerts) return;
    const unseen = alerts.filter((a) => !a.seen);
    setOpen({ count: unseen.length, help: unseen.some((a) => a.kind === "help") });

    // Sound only for rule breaks and calls for help that arrive while the
    // app is open (on first load the overview is already up to date)
    const first = known.current === null;
    known.current ??= readAnnounced();
    const fresh = unseen.filter((a) => a.kind !== "drift" && !known.current?.has(a.id));
    const changed = unseen.some((a) => !known.current?.has(a.id));
    for (const a of alerts) known.current.add(a.id);
    saveAnnounced(known.current);
    if (first) return;
    if (fresh.length > 0) playAlertChime();
    if (changed && pathname === "/") router.refresh();
  }, [pathname, router]);

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

  if (open.count === 0 || pathname === "/") return null;
  return (
    <SafetyBar
      tone={open.help ? "help" : "alert"}
      text={open.help ? t("bannerHelp") : t("bannerOpen", { count: open.count })}
      href="/#alerts"
      action={t("open")}
    />
  );
};

export default LessonAlertWatcher;
