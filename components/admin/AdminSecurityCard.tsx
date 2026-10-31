"use client";

import { useTranslations } from "next-intl";
import { useClerk } from "@clerk/nextjs";
import { History, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";

/** The admin's account security: two-step verification and the admin log */
const AdminSecurityCard = ({ twoFactor }: { twoFactor: boolean }) => {
  const t = useTranslations("AdminProfile");
  const { openUserProfile } = useClerk();
  return (
    <section className="card flex flex-col gap-4" aria-labelledby="security-title" data-tour="admin-profile-2fa">
      <h2 id="security-title" className="text-2xl font-bold max-sm:text-xl">
        {t("securityTitle")}
      </h2>
      <p className={twoFactor ? "stuck-alert border-ok bg-ok-soft" : "stuck-alert"} role="status">
        {twoFactor ? (
          <ShieldCheck className="size-6 shrink-0 text-ok" aria-hidden />
        ) : (
          <ShieldAlert className="size-6 shrink-0 text-warn" aria-hidden />
        )}
        <span>{twoFactor ? t("twoFactorOn") : t("twoFactorOff")}</span>
      </p>
      <p className="text-base text-muted-foreground">{t("securityText")}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-outline text-base" onClick={() => openUserProfile()}>
          {t("account")}
        </button>
        <Link href="/admin/log" className="btn-quiet" data-tour="admin-profile-log">
          <History className="size-5" aria-hidden />
          {t("log")}
        </Link>
      </div>
    </section>
  );
};

export default AdminSecurityCard;
