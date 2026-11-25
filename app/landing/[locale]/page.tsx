import { Brain, Ear, EyeOff, Puzzle, ShieldCheck, Sparkles, UserLock, Zap } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import LandingHeader from "@/components/landing/LandingHeader";
import TrackedLink from "@/components/landing/TrackedLink";
import { LessonMock, TeacherMock } from "@/components/landing/AppMocks";
import { CONTACT_EMAIL } from "@/lib/site";

interface LandingPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * The landing page: what eNvolve is, for teachers and schools first.
 * Signed-out visitors see it at /hu and /en (proxy.ts, lib/views.ts);
 * signed-in users get their own home page there instead.
 *
 * No tips and no Help button: like the sign-in page it is for visitors
 * without an account, mostly adults (AGENTS.md, section 2).
 */
export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const tLegal = await getTranslations("Legal");

  const signIn = `/${locale}/sign-in`;
  const mail = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("eNvolve pilot")}`;

  const who = [
    { key: "autism", icon: Puzzle },
    { key: "adhd", icon: Zap },
    { key: "dyslexia", icon: Ear },
  ] as const;
  const safety = [
    { key: "topic", icon: ShieldCheck },
    { key: "noTranscript", icon: EyeOff },
    { key: "aiNotice", icon: Sparkles },
    { key: "privacy", icon: UserLock },
  ] as const;
  const faq = [1, 2, 3, 4, 5] as const;

  return (
    <>
      <a href="#content" className="skip-link">{t("skip")}</a>
      <LandingHeader />

      <main id="content" className="landing">
        {/* 1. Hero */}
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="flex flex-col gap-4">
            <h1 id="hero-title">{t("hero.title")}</h1>
            <p className="landing-lead">{t("hero.lead")}</p>
            <div className="flex flex-wrap gap-3">
              <TrackedLink href={signIn} className="btn-primary" event="landing_sign_in" place="hero">
                {t("hero.signIn")}
              </TrackedLink>
              <TrackedLink href={mail} className="btn-outline" event="landing_contact" place="hero">
                {t("hero.contact")}
              </TrackedLink>
            </div>
            <p className="text-base text-muted-foreground">{t("hero.note")}</p>
          </div>
          <figure className="landing-visual" aria-label={t("hero.mockLabel")}>
            <LessonMock />
            <TeacherMock compact />
          </figure>
        </section>

        {/* 2. Who it is for */}
        <section className="landing-section" aria-labelledby="who-title">
          <h2 id="who-title">{t("who.title")}</h2>
          <p className="landing-lead">{t("who.lead")}</p>
          <ul className="landing-grid">
            {who.map(({ key, icon: Icon }) => (
              <li key={key} className="card landing-card">
                <span className="landing-icon bg-primary-soft text-primary-deep"><Icon aria-hidden="true" /></span>
                <h3>{t(`who.${key}.title`)}</h3>
                <p>{t(`who.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. How it works */}
        <section id="how" className="landing-section" aria-labelledby="how-title">
          <h2 id="how-title">{t("how.title")}</h2>
          <ol className="landing-grid landing-steps">
            {([1, 2, 3] as const).map((n) => (
              <li key={n} className="card landing-card">
                <h3>{t(`how.step${n}.title`)}</h3>
                <p>{t(`how.step${n}.text`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 4. For teachers */}
        <section id="teachers" className="landing-section landing-split" aria-labelledby="teachers-title">
          <figure className="landing-visual landing-visual-phone" aria-label={t("teachers.mockLabel")}>
            <TeacherMock />
          </figure>
          <div className="flex flex-col gap-4">
            <h2 id="teachers-title">{t("teachers.title")}</h2>
            <p className="landing-lead">{t("teachers.lead")}</p>
            <ul className="landing-checks">
              {([1, 2, 3, 4] as const).map((n) => (
                <li key={n}>{t(`teachers.item${n}`)}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5. Safety and privacy */}
        <section id="safety" className="landing-section" aria-labelledby="safety-title">
          <h2 id="safety-title">{t("safety.title")}</h2>
          <ul className="landing-grid landing-grid-4">
            {safety.map(({ key, icon: Icon }) => (
              <li key={key} className="card landing-card">
                <span className="landing-icon bg-ok-soft text-ok"><Icon aria-hidden="true" /></span>
                <h3>{t(`safety.${key}.title`)}</h3>
                <p>{t(`safety.${key}.text`)}</p>
                {key === "privacy" && (
                  <a href={`/${locale}/privacy`} className="landing-link">{t("safety.privacy.link")}</a>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Parents and 7. the story behind it */}
        <section className="landing-section landing-grid landing-grid-2" aria-label={`${t("parents.title")} · ${t("story.title")}`}>
          <div className="card landing-card">
            <h2 className="landing-h3">{t("parents.title")}</h2>
            <p>{t("parents.text")}</p>
            <TrackedLink href={mail} className="landing-link" event="landing_contact" place="parents">
              {t("parents.link")}
            </TrackedLink>
          </div>
          <div className="card landing-card">
            <span className="landing-icon bg-turn-soft text-turn-deep"><Brain aria-hidden="true" /></span>
            <h2 className="landing-h3">{t("story.title")}</h2>
            <p>{t("story.text")}</p>
          </div>
        </section>

        {/* 8. FAQ: native disclosure, no JavaScript */}
        <section id="faq" className="landing-section" aria-labelledby="faq-title">
          <h2 id="faq-title">{t("faq.title")}</h2>
          <div className="landing-faq">
            {faq.map((n) => (
              <details key={n}>
                <summary>{t(`faq.q${n}`)}</summary>
                <p>{t(`faq.a${n}`)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 9. Closing call to action */}
        <section className="landing-cta" aria-labelledby="cta-title">
          <div>
            <h2 id="cta-title">{t("cta.title")}</h2>
            <p>{t("cta.text")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <TrackedLink href={mail} className="landing-cta-primary" event="landing_contact" place="cta">
              {t("cta.contact")}
            </TrackedLink>
            <TrackedLink href={signIn} className="landing-cta-secondary" event="landing_sign_in" place="cta">
              {t("cta.signIn")}
            </TrackedLink>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <nav aria-label={tLegal("footerLabel")} className="flex flex-wrap gap-x-6 gap-y-2">
          <a href={`/${locale}/privacy`}>{tLegal("privacy")}</a>
          <a href={`/${locale}/terms`}>{tLegal("terms")}</a>
          <a href={`mailto:${CONTACT_EMAIL}`}>{t("footer.contact")}</a>
        </nav>
        <p>© {new Date().getFullYear()} eNvolve</p>
      </footer>
    </>
  );
}
