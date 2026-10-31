import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { listUsers } from "@/lib/actions/admin.actions";
import PageTour from "@/components/onboarding/PageTour";
import RoleChanger from "@/components/admin/RoleChanger";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("adminUsers") };
}

const ROLE_STATUS = { student: "notStarted", teacher: "inProgress", admin: "done" } as const;

/** Find people and change their role (instead of `npm run role:set`) */
const AdminUsersPage = async ({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) => {
  const { q = "", page } = await searchParams;
  const [t, format, list] = await Promise.all([
    getTranslations("AdminUsers"),
    getFormatter(),
    listUsers({ query: q, page: Number(page) || 1 }),
  ]);
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (n > 1) params.set("page", String(n));
    const query = params.toString();
    return query ? `/admin/users?${query}` : "/admin/users";
  };

  return (
    <main>
      <PageTour id="adminUsers" />
      <section className="flex flex-col gap-1">
        <h1>{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-sm:text-base">{t("lead")}</p>
      </section>

      {/* A plain form: works before the page's script has loaded */}
      <form className="flex flex-wrap gap-3" role="search" data-tour="admin-user-search">
        <label htmlFor="user-search" className="sr-only">
          {t("searchLabel")}
        </label>
        <input
          id="user-search"
          name="q"
          type="search"
          className="field flex-1 basis-64"
          defaultValue={q}
          maxLength={100}
          placeholder={t("searchPlaceholder")}
        />
        <button type="submit" className="btn-primary">
          <Search className="size-5" aria-hidden />
          {t("search")}
        </button>
      </form>

      <section className="flex flex-col gap-3" aria-labelledby="user-list-title">
        <h2 id="user-list-title" className="text-xl font-bold">
          {q ? t("results", { count: list.total }) : t("everyone", { count: list.total })}
        </h2>
        {list.users.length === 0 ? (
          <p className="card text-lg text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="person-list" data-tour="admin-user-list">
            {list.users.map((user, i) => (
              <li key={user.id} className="person-row">
                <span className="person-avatar" aria-hidden>
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </span>
                <span className="person-name">
                  <span className="break-words">{user.name || user.email}</span>
                  <span className="person-detail block break-all">
                    {user.name ? `${user.email} · ` : ""}
                    {user.lastActiveAt
                      ? t("lastActive", { date: format.dateTime(new Date(user.lastActiveAt), { month: "short", day: "numeric" }) })
                      : t("neverActive")}
                  </span>
                </span>
                <span className="status-pill" data-status={ROLE_STATUS[user.role]}>
                  {t(`role.${user.role}`)}
                </span>
                <RoleChanger
                  userId={user.id}
                  role={user.role}
                  label={user.email || user.name}
                  isMe={user.id === list.meId}
                  tour={i === 0 || (i === 1 && list.users[0].id === list.meId) ? "admin-user-role" : undefined}
                />
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <nav className="flex flex-wrap items-center gap-3" aria-label={t("pagesLabel")}>
            {list.page > 1 && (
              <Link href={pageHref(list.page - 1)} className="btn-outline text-base">
                {t("previous")}
              </Link>
            )}
            <span className="text-base text-muted-foreground">{t("pageOf", { page: list.page, pages })}</span>
            {list.page < pages && (
              <Link href={pageHref(list.page + 1)} className="btn-outline text-base">
                {t("next")}
              </Link>
            )}
          </nav>
        )}
      </section>
    </main>
  );
};

export default AdminUsersPage;
