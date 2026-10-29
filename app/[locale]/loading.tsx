import { useTranslations } from "next-intl";

/**
 * Shown straight away while the next page loads on the server, so a tap
 * always gets an immediate response instead of a frozen screen. The header
 * and tab bar stay in place; only the content area shows placeholders.
 */
export default function Loading() {
  const t = useTranslations("Common");

  return (
    <main aria-busy="true">
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <div className="skeleton h-10 w-2/3 max-w-sm rounded-2xl" />
      <div className="courses-grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="course-card" aria-hidden>
            <div className="flex items-center gap-3">
              <div className="skeleton size-14 rounded-2xl" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="skeleton h-5 w-3/4 rounded-lg" />
                <div className="skeleton h-4 w-1/3 rounded-lg" />
              </div>
            </div>
            <div className="skeleton h-4 w-full rounded-lg" />
            <div className="skeleton h-4 w-2/3 rounded-lg" />
            <div className="skeleton mt-2 h-12 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </main>
  );
}
