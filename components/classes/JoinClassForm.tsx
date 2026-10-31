"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { joinClass, type JoinResult } from "@/lib/actions/class.actions";

/**
 * Big, calm code field: six letters and numbers from the teacher. "card" is
 * the smaller version inside the home page's classes card.
 */
const JoinClassForm = ({ variant = "page", initialCode = "" }: { variant?: "page" | "card"; initialCode?: string }) => {
  const t = useTranslations("Join");
  const router = useRouter();
  const card = variant === "card";
  const inputId = card ? "home-join-code" : "join-code";
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, 12));
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
    <form
      className={card ? "flex flex-col gap-3" : "join-card"}
      onSubmit={submit}
      data-tour={card ? "home-join" : "join-code"}
      noValidate
    >
      <label htmlFor={inputId} className={card ? "text-lg font-bold" : "field-label"}>
        {t("codeLabel")}
      </label>
      <input
        id={inputId}
        className={card ? "join-input min-h-14 text-2xl" : "join-input"}
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
        aria-describedby={`${inputId}-hint`}
        aria-invalid={!!errorText}
      />
      <p id={`${inputId}-hint`} className={card ? "text-base text-muted-foreground" : "form-hint"}>
        {t("codeHint")}
      </p>
      <button type="submit" className="btn-primary" disabled={busy || code.replace(/[^A-Za-z0-9]/g, "").length < 6}>
        <LogIn className="size-5" aria-hidden />
        {busy ? t("joining") : t("join")}
      </button>
      <div role="status" aria-live="polite">
        {result?.status === "joined" && (
          <p className="form-message" data-tone="ok">
            {t("joined", { name: result.className, teacher: result.teacherName })}
            {!card && (
              <>
                {" "}
                <Link href="/" className="font-bold underline">
                  {t("toHome")}
                </Link>
              </>
            )}
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
