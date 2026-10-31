"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, CircleCheck, UserMinus } from "lucide-react";
import type { Support } from "@/lib/validation";
import type { ClassMember } from "@/lib/teacher/types";
import { removeStudent, setStudentSupport } from "@/lib/actions/teacher.actions";
import ConfirmAction from "./ConfirmAction";
import AppSelect from "@/components/ui/AppSelect";

const SHORTER_OPTIONS = [5, 10, 15, 20] as const;

/** One student on the Students tab: support switches and removal */
const StudentSupportRow = ({ classId, member, first }: { classId: string; member: ClassMember; first?: boolean }) => {
  const t = useTranslations("ClassDetail");
  const [open, setOpen] = useState(false);
  const [support, setSupport] = useState<Support>(member.support);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");

  const save = async (patch: Partial<Support>) => {
    const next = { ...support, ...patch };
    setSupport(next);
    try {
      setSupport(await setStudentSupport(classId, member.studentId, next));
      setState("saved");
    } catch {
      setSupport(support);
      setState("error");
    }
  };

  const summary = [
    support.slowerSpeech && t("supportSlower"),
    support.shorterMinutes && t("supportShorterShort", { minutes: support.shorterMinutes }),
    support.autoRead && t("supportAutoRead"),
  ].filter(Boolean) as string[];
  const panelId = `support-${member.studentId}`;

  return (
    <li className="person-row">
      <span className="person-avatar" aria-hidden>
        {member.displayName.charAt(0).toUpperCase()}
      </span>
      <span className="person-name">
        {member.displayName}
        <span className="person-detail block">
          {summary.length ? summary.join(" · ") : t("supportNone")}
        </span>
      </span>
      <button
        type="button"
        className="btn-outline min-h-11 px-4 text-base"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        data-tour={first ? "class-support" : undefined}
      >
        {t("supportButton")}
        <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div id={panelId} className="support-panel">
          <div className="comfort-row border-t-0">
            <div className="comfort-row-text">
              <span id={`${panelId}-slow`} className="comfort-row-label">{t("supportSlower")}</span>
              <span className="comfort-row-hint">{t("supportSlowerHint")}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!support.slowerSpeech}
              aria-labelledby={`${panelId}-slow`}
              className="switch comfort-control"
              onClick={() => save({ slowerSpeech: !support.slowerSpeech })}
            />
          </div>
          <div className="comfort-row">
            <div className="comfort-row-text">
              <label htmlFor={`${panelId}-short`} className="comfort-row-label">{t("supportShorter")}</label>
              <span className="comfort-row-hint">{t("supportShorterHint")}</span>
            </div>
            <AppSelect
              id={`${panelId}-short`}
              size="sm"
              className="comfort-control w-auto min-w-44"
              value={support.shorterMinutes ? String(support.shorterMinutes) : "off"}
              onValueChange={(value) => save({ shorterMinutes: value === "off" ? null : Number(value) })}
              options={[
                { value: "off", label: t("supportShorterOff") },
                ...SHORTER_OPTIONS.map((minutes) => ({
                  value: String(minutes),
                  label: t("supportShorterShort", { minutes }),
                })),
              ]}
            />
          </div>
          <div className="comfort-row">
            <div className="comfort-row-text">
              <span id={`${panelId}-read`} className="comfort-row-label">{t("supportAutoRead")}</span>
              <span className="comfort-row-hint">{t("supportAutoReadHint")}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!support.autoRead}
              aria-labelledby={`${panelId}-read`}
              className="switch comfort-control"
              onClick={() => save({ autoRead: !support.autoRead })}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
            <p className="comfort-saved" role="status" aria-live="polite">
              {state === "saved" && (
                <>
                  <CircleCheck className="size-5" aria-hidden />
                  {t("saved")}
                </>
              )}
              {state === "error" && <span className="text-destructive">{t("saveError")}</span>}
            </p>
            <ConfirmAction
              label={t("remove")}
              question={t("removeQuestion", { name: member.displayName })}
              confirmLabel={t("removeConfirm")}
              action={() => removeStudent(classId, member.studentId)}
              icon={<UserMinus className="size-5" aria-hidden />}
            />
          </div>
        </div>
      )}
    </li>
  );
};

export default StudentSupportRow;
