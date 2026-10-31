"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { subjects } from "@/constants";
import { getSubjectLabel } from "@/lib/utils";
import { LIMITS } from "@/lib/validation";
import { createClass } from "@/lib/actions/teacher.actions";
import AppSelect from "@/components/ui/AppSelect";
import SubjectChip from "@/components/SubjectChip";

/** Name and (optional) subject: that is all a new class needs */
const NewClassForm = () => {
  const t = useTranslations("Classes");
  const tSubjects = useTranslations("Subjects");
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createClass({ name, subject });
      router.push(`/classes/${id}`);
    } catch {
      setError(t("createError"));
      setBusy(false);
    }
  };

  return (
    <form className="new-class" onSubmit={submit} data-tour="classes-new" noValidate>
      <div className="field-group">
        <label htmlFor="class-name" className="field-label">
          {t("newName")}
        </label>
        <input
          id="class-name"
          className="field"
          value={name}
          maxLength={LIMITS.className}
          placeholder={t("newNamePlaceholder")}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "class-error" : undefined}
        />
      </div>
      <div className="field-group">
        <label htmlFor="class-subject" className="field-label">
          {t("newSubject")}
        </label>
        <AppSelect
          id="class-subject"
          value={subject || "none"}
          onValueChange={(value) => setSubject(value === "none" ? "" : value)}
          options={[
            { value: "none", label: t("noSubject") },
            ...subjects.map((value) => ({
              value,
              label: getSubjectLabel(tSubjects, value),
              icon: <SubjectChip subject={value} />,
            })),
          ]}
        />
      </div>
      <button type="submit" className="btn-primary" disabled={busy}>
        <Plus className="size-5" aria-hidden />
        {busy ? t("creating") : t("create")}
      </button>
      {error && (
        <p id="class-error" className="field-error w-full" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export default NewClassForm;
