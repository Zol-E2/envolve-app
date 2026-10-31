import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAuditLog } from "@/lib/actions/admin.actions";
import PageTour from "@/components/onboarding/PageTour";
import AuditLogList from "@/components/admin/AuditLogList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("adminLog") };
}

/** Every admin decision, newest first. Nobody can change or delete a line */
const AdminLogPage = async () => {
  const [t, entries] = await Promise.all([getTranslations("AdminLog"), getAuditLog(100)]);
  return (
    <main>
      <PageTour id="adminLog" />
      <section className="flex flex-col gap-1">
        <h1>{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-sm:text-base">{t("lead")}</p>
      </section>
      <div data-tour="admin-log-list">
        <AuditLogList entries={entries} />
      </div>
    </main>
  );
};

export default AdminLogPage;
