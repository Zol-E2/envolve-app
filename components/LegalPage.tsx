import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageTour from "@/components/onboarding/PageTour";
import { LEGAL_CONTENT, type LegalDocId } from "@/lib/legal/content";
import { LEGAL_UPDATED, isLegalDraft } from "@/lib/legal/contact";

/** Shared layout of the privacy policy and the terms of use. */
const LegalPage = async ({ doc }: { doc: LegalDocId }) => {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Legal")]);
  const content = LEGAL_CONTENT[doc][locale === "en" ? "en" : "hu"];
  const other: LegalDocId = doc === "privacy" ? "terms" : "privacy";

  return (
    <main className="max-w-3xl">
      <PageTour id="legal" />
      <article className="legal" data-tour="legal-content">
        {isLegalDraft && (
          <p className="help-box" role="note">
            {t("draft")}
          </p>
        )}
        <h1>{content.title}</h1>
        <p className="legal-updated">
          {t("updated", { date: new Date(LEGAL_UPDATED) })}
        </p>
        <p className="legal-intro">{content.intro}</p>

        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p>
          <Link href={`/${other}`} className="underline underline-offset-4">
            {t(other)}
          </Link>
        </p>
      </article>
    </main>
  );
};

export default LegalPage;
