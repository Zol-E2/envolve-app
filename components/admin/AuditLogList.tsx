import { getFormatter, getTranslations } from "next-intl/server";
import type { AuditEntry } from "@/lib/admin/types";

/** Admin log lines: who did what, to whom, when, and why */
const AuditLogList = async ({ entries }: { entries: AuditEntry[] }) => {
  const [t, format] = await Promise.all([getTranslations("AdminLog"), getFormatter()]);
  if (entries.length === 0) return <p className="card text-lg text-muted-foreground">{t("empty")}</p>;
  return (
    <ul className="person-list">
      {entries.map((entry) => (
        <li key={entry.id} className="person-row">
          <span className="person-avatar" aria-hidden>
            {entry.actorName.charAt(0).toUpperCase()}
          </span>
          <span className="person-name">
            {t(`action.${entry.action}`, { actor: entry.actorName, target: entry.targetLabel || entry.targetId })}
            {entry.detail && <span className="person-detail block break-words">{entry.detail}</span>}
          </span>
          <time className="text-base text-muted-foreground tabular-nums" dateTime={entry.createdAt}>
            {format.dateTime(new Date(entry.createdAt), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </time>
        </li>
      ))}
    </ul>
  );
};

export default AuditLogList;
