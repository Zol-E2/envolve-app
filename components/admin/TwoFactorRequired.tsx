"use client";

import { useTranslations } from "next-intl";
import { useClerk } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";

/**
 * Shown instead of the admin pages until the admin turns on two-step
 * verification: an admin account can change anyone's role.
 */
const TwoFactorRequired = () => {
  const t = useTranslations("TwoFactor");
  const { openUserProfile } = useClerk();
  return (
    <main>
      <section className="card flex max-w-2xl flex-col gap-4" aria-labelledby="twofactor-title">
        <ShieldAlert className="size-10 text-warn" aria-hidden />
        <h1 id="twofactor-title" className="text-3xl max-sm:text-2xl">
          {t("title")}
        </h1>
        <p className="text-lg">{t("text")}</p>
        <ol className="howto-steps">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
        </ol>
        <button type="button" className="btn-primary w-fit" onClick={() => openUserProfile()}>
          {t("open")}
        </button>
        <p className="text-base text-muted-foreground">{t("note")}</p>
      </section>
    </main>
  );
};

export default TwoFactorRequired;
