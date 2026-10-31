"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { UserCog } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { changeUserRole } from "@/lib/actions/admin.actions";
import { ROLE_CHOICES, type RoleChoice } from "@/lib/validation";
import AppSelect from "@/components/ui/AppSelect";

/**
 * Changes one person's role, with a short reason for the admin log. Your
 * own role cannot be changed here, so an admin can never lock everyone out.
 */
const RoleChanger = ({
  userId,
  role,
  label,
  isMe,
  tour,
}: {
  userId: string;
  role: RoleChoice;
  label: string;
  isMe: boolean;
  tour?: string;
}) => {
  const t = useTranslations("AdminUsers");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<RoleChoice>(role);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isMe) return <span className="text-base text-muted-foreground">{t("itsYou")}</span>;

  if (!open) {
    return (
      <button type="button" className="btn-quiet" onClick={() => setOpen(true)} data-tour={tour}>
        <UserCog className="size-5" aria-hidden />
        {t("change")}
      </button>
    );
  }

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (next === role) return setOpen(false);
    if (reason.trim().length < 3) return setError(t("reasonRequired"));
    setBusy(true);
    setError(null);
    try {
      await changeUserRole({ userId, role: next, reason });
      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError(t("saveError"));
    }
    setBusy(false);
  };

  const selectId = `role-${userId}`;
  const reasonId = `reason-${userId}`;
  return (
    <form className="role-form" onSubmit={save} aria-label={t("formLabel", { user: label })} noValidate>
      <div className="field-group">
        <label htmlFor={selectId} className="field-label text-base">
          {t("newRole")}
        </label>
        <AppSelect
          id={selectId}
          size="sm"
          value={next}
          onValueChange={(value) => setNext(value as RoleChoice)}
          options={ROLE_CHOICES.map((r) => ({ value: r, label: t(`role.${r}`), description: t(`roleHint.${r}`) }))}
        />
      </div>
      <div className="field-group flex-1 basis-56">
        <label htmlFor={reasonId} className="field-label text-base">
          {t("reason")}
        </label>
        <input
          id={reasonId}
          className="field"
          maxLength={120}
          placeholder={t("reasonPlaceholder")}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <div className="flex gap-2 self-end">
        <button type="button" className="btn-quiet" onClick={() => setOpen(false)} disabled={busy}>
          {t("cancel")}
        </button>
        <button type="submit" className="btn-primary text-base" disabled={busy}>
          {busy ? t("saving") : t("save")}
        </button>
      </div>
      {next === "admin" && role !== "admin" && <p className="form-hint w-full">{t("adminWarning")}</p>}
      {error && (
        <p className="field-error w-full" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export default RoleChanger;
