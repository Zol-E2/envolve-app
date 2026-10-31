import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CircleCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getModerationCourses } from "@/lib/actions/admin.actions";
import { COURSE_TABS } from "@/lib/validation";
import PageTour from "@/components/onboarding/PageTour";
import CourseModerationCard from "@/components/admin/CourseModerationCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("adminCourses") };
}

/**
 * The course check: courses waiting for a decision first (reported, then
 * flagged by the automatic filter, then unchecked), and the public, featured
 * and hidden ones on their own tabs.
 */
const AdminCoursesPage = async ({ searchParams }: { searchParams: Promise<{ tab?: string }> }) => {
  const { tab: tabParam } = await searchParams;
  const [t, list] = await Promise.all([getTranslations("AdminCourses"), getModerationCourses(tabParam)]);

  return (
    <main>
      <PageTour id="adminCourses" />
      <section className="flex flex-col gap-1">
        <h1>{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-sm:text-base">{t("lead")}</p>
      </section>

      <nav className="tabs" aria-label={t("tabsLabel")} data-tour="admin-course-tabs">
        {COURSE_TABS.map((name) => (
          <Link
            key={name}
            href={name === "review" ? "/admin/courses" : `/admin/courses?tab=${name}`}
            className="tab-link"
            aria-current={list.tab === name ? "page" : undefined}
          >
            {t(`tab.${name}`)}
            {list.counts[name] > 0 && (
              <span className={name === "review" ? "attention-dot" : "text-muted-foreground tabular-nums"}>
                {list.counts[name]}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {list.courses.length === 0 ? (
        <p className="card flex items-center gap-2 text-lg">
          {list.tab === "review" && <CircleCheck className="size-6 shrink-0 text-ok" aria-hidden />}
          {t(`empty.${list.tab}`)}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {list.courses.map((course, i) => (
            <CourseModerationCard key={course.id} course={course} first={i === 0} />
          ))}
        </div>
      )}
    </main>
  );
};

export default AdminCoursesPage;
