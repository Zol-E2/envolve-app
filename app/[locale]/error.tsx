"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Shown when a page fails to load (e.g. the database is unreachable).
 * Calm wording, no technical details, and two clear ways forward.
 */
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="items-center text-center">
      <h1>{t("title")}</h1>
      <p className="text-lg max-w-prose">{t("description")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="btn-primary" onClick={reset}>
          {t("retry")}
        </button>
        <Link href="/" className="btn-outline">
          {t("backHome")}
        </Link>
      </div>
    </main>
  );
}
