"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { regenerateJoinCode } from "@/lib/actions/teacher.actions";

/** The class code to read out or write on the board, with copy and "new code" */
const JoinCodeBox = ({ classId, code }: { classId: string; code: string }) => {
  const t = useTranslations("ClassDetail");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is on screen to type
    }
  };

  const renew = async () => {
    setBusy(true);
    try {
      await regenerateJoinCode(classId);
      router.refresh();
    } finally {
      setBusy(false);
      setAsking(false);
    }
  };

  return (
    <div className="code-box" data-tour="class-code">
      <KeyRound className="size-6 text-muted-foreground" aria-hidden />
      <div className="flex flex-col">
        <span className="text-[0.9375rem] font-bold text-muted-foreground">{t("codeLabel")}</span>
        <span className="code-value">
          {code}
        </span>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <button type="button" className="btn-quiet" onClick={copy}>
          {copied ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
          <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
        </button>
        {asking ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold">{t("renewQuestion")}</span>
            <button type="button" className="btn-danger" onClick={renew} disabled={busy}>
              {t("renewConfirm")}
            </button>
            <button type="button" className="btn-quiet" onClick={() => setAsking(false)}>
              {t("cancel")}
            </button>
          </span>
        ) : (
          <button type="button" className="btn-quiet" onClick={() => setAsking(true)} data-tour="class-code-renew">
            <RefreshCw className="size-5" aria-hidden />
            {t("renew")}
          </button>
        )}
      </div>
    </div>
  );
};

export default JoinCodeBox;
