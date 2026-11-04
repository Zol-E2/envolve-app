"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BellRing, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { getTeacherAlerts } from "@/lib/actions/safety.actions";
import { playAlertChime } from "@/lib/alertSound";

/** How often the teacher's open app checks for new alerts */
const POLL_MS = 30_000;
/** Alerts already announced in this browser tab, so a reload does not repeat them */
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
 * For teachers, on every page: checks for new lesson alerts and shows a
 * small notice with a soft sound. The notice carries no name (the screen
 * may be projected in class); the name is on the overview, under
 * "Értesítések az órákról".
 */
const LessonAlertWatcher = () => {
  const t = useTranslations("Safety");
  const router = useRouter();
  const pathname = usePathname();
  const known = useRef<Set<string> | null>(null);
  const [notice, setNotice] = useState<"help" | "other" | null>(null);

  const check = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const alerts = await getTeacherAlerts().catch(() => null);
    if (!alerts) return;
    const unseen = alerts.filter((a) => !a.seen && a.kind !== "drift");
    const first = known.current === null;
    known.current ??= readAnnounced();
    const fresh = unseen.filter((a) => !known.current?.has(a.id));
    for (const a of alerts) known.current.add(a.id);
    saveAnnounced(known.current);
    if (fresh.length === 0) return;
    setNotice(fresh.some((a) => a.kind === "help") ? "help" : "other");
    // Alerts that arrive while the app is open: a sound, and the overview
    // list updates by itself (on first load it is already up to date)
    if (!first) {
      playAlertChime();
      if (pathname === "/") router.refresh();
    }
  }, [pathname, router]);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), POLL_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  if (!notice || pathname === "/") return null;
  return (
    <div className="alert-toast" role="status" aria-live="polite">
      <BellRing className="size-6 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1 basis-48 font-bold">{notice === "help" ? t("toastHelp") : t("toastNew")}</p>
      <Link href="/#alerts" className="btn-primary text-base" onClick={() => setNotice(null)}>
        {t("open")}
      </Link>
      <button type="button" className="btn-quiet" onClick={() => setNotice(null)} aria-label={t("close")}>
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
};

export default LessonAlertWatcher;
