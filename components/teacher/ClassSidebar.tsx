"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import type { ClassSummary } from "@/lib/teacher/types";

/** The teacher's classes beside the page, on desktop only */
const ClassSidebar = ({ classes }: { classes: ClassSummary[] }) => {
  const t = useTranslations("Classes");
  const pathname = usePathname();

  return (
    <nav className="class-sidebar" aria-label={t("sidebarLabel")}>
      <p className="class-sidebar-title">{t("title")}</p>
      {classes.map((c) => (
        <Link
          key={c.id}
          href={`/classes/${c.id}`}
          className="class-sidebar-link"
          aria-current={pathname.startsWith(`/classes/${c.id}`) ? "page" : undefined}
        >
          <span className="min-w-0 truncate">{c.name}</span>
          {c.stuckCount > 0 && (
            <span className="attention-dot" title={t("stuckCount", { count: c.stuckCount })}>
              {c.stuckCount}
            </span>
          )}
        </Link>
      ))}
      <Link
        href="/classes"
        className="class-sidebar-link"
        aria-current={pathname === "/classes" ? "page" : undefined}
      >
        <span className="flex items-center gap-2">
          <Plus className="size-5" aria-hidden />
          {t("allAndNew")}
        </span>
      </Link>
    </nav>
  );
};

export default ClassSidebar;
