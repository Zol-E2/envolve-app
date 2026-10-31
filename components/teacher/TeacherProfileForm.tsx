"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, Save, UserCog } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "@/i18n/navigation";
import { updateTeacherProfile } from "@/lib/actions/teacher.actions";

/** The name students see and the school, plus the Clerk account settings */
const TeacherProfileForm = ({ name: initialName, school: initialSchool }: { name: string; school: string }) => {
  const t = useTranslations("TeacherProfile");
  const router = useRouter();
  const { openUserProfile } = useClerk();
  const [name, setName] = useState(initialName);
  const [school, setSchool] = useState(initialSchool);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error" | "nameMissing">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setState("nameMissing");
    setState("busy");
    try {
      await updateTeacherProfile({ name, school });
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  };

  return (
    <section className="card flex flex-col gap-5" aria-labelledby="teacher-profile-title" data-tour="teacher-profile-form">
      <h2 id="teacher-profile-title" className="text-2xl font-bold max-sm:text-xl">
        {t("formTitle")}
      </h2>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <div className="field-group" data-tour="teacher-profile-name">
          <label htmlFor="teacher-name" className="field-label">
            {t("name")}
          </label>
          <input
            id="teacher-name"
            className="field"
            value={name}
            maxLength={60}
            onChange={(event) => {
              setName(event.target.value);
              setState("idle");
            }}
            aria-describedby="teacher-name-hint"
            aria-invalid={state === "nameMissing"}
          />
          <span id="teacher-name-hint" className="form-hint">
            {t("nameHint")}
          </span>
        </div>
        <div className="field-group">
          <label htmlFor="teacher-school" className="field-label">
            {t("school")}
          </label>
          <input
            id="teacher-school"
            className="field"
            value={school}
            maxLength={100}
            placeholder={t("schoolPlaceholder")}
            onChange={(event) => {
              setSchool(event.target.value);
              setState("idle");
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={state === "busy"}>
            <Save className="size-5" aria-hidden />
            {state === "busy" ? t("saving") : t("save")}
          </button>
          <p role="status" aria-live="polite" className="text-base font-bold">
            {state === "saved" && (
              <span className="flex items-center gap-1.5 text-ok">
                <CircleCheck className="size-5" aria-hidden />
                {t("saved")}
              </span>
            )}
            {state === "error" && <span className="text-destructive">{t("error")}</span>}
            {state === "nameMissing" && <span className="text-destructive">{t("nameRequired")}</span>}
          </p>
        </div>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4" data-tour="teacher-profile-account">
        <div className="flex min-w-0 flex-col">
          <span className="text-lg font-bold">{t("account")}</span>
          <span className="person-detail">{t("accountHint")}</span>
        </div>
        <button type="button" className="btn-outline min-h-11 px-4 text-base" onClick={() => openUserProfile()}>
          <UserCog className="size-5" aria-hidden />
          {t("accountButton")}
        </button>
      </div>
    </section>
  );
};

export default TeacherProfileForm;
