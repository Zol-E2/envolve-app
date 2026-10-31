"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { joinClass, type JoinResult } from "@/lib/actions/class.actions";

/** Big, calm code field: six letters and numbers from the teacher */
const JoinClassForm = () => {
  const t = useTranslations("Join");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<JoinResult | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const outcome = await joinClass(code);
      setResult(outcome);
      if (outcome.status === "joined") {
        setCode("");
        router.refresh();
      }
    } catch {
      setResult({ status: "error" });
    }
    setBusy(false);
  };

  const errorText =
    result && result.status !== "joined"
      ? result.status === "invalid_code"
        ? t("invalidCode")
        : result.status === "own_class"
          ? t("ownClass")
          : result.status === "too_many_attempts"
            ? t("tooMany")
            : t("error")
      : null;

  return (
    <form className="join-card" onSubmit={submit} data-tour="join-code" noValidate>
      <label htmlFor="join-code" className="field-label">
        {t("codeLabel")}
      </label>
      <input
        id="join-code"
        className="join-input"
        value={code}
        onChange={(event) => {
          setCode(event.target.value.toUpperCase().slice(0, 12));
          setResult(null);
        }}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        placeholder="ABC234"
        aria-describedby="join-hint"
        aria-invalid={!!errorText}
      />
      <p id="join-hint" className="form-hint">
        {t("codeHint")}
      </p>
      <button type="submit" className="btn-primary" disabled={busy || code.replace(/[^A-Za-z0-9]/g, "").length < 6}>
        <LogIn className="size-5" aria-hidden />
        {busy ? t("joining") : t("join")}
      </button>
      <div role="status" aria-live="polite">
        {result?.status === "joined" && (
          <p className="form-message" data-tone="ok">
            {t("joined", { name: result.className, teacher: result.teacherName })}{" "}
            <Link href="/" className="font-bold underline">
              {t("toHome")}
            </Link>
          </p>
        )}
        {errorText && (
          <p className="form-message" data-tone="error">
            {errorText}
          </p>
        )}
      </div>
    </form>
  );
};

export default JoinClassForm;
