import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  Ear,
  GraduationCap,
  Heart,
  LineChart,
  Puzzle,
  School,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { routing } from "@/i18n/routing";
import LandingHeader from "@/components/landing/LandingHeader";
import TrackedLink from "@/components/landing/TrackedLink";
import { BrowserShot, CardShot, PhoneShot, SafetyBadge } from "@/components/landing/AppMocks";
import { CONTACT_EMAIL } from "@/lib/site";

interface LandingPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * The landing page: what eNvolve is, for teachers and schools first.
 * Signed-out visitors see it at /hu and /en (proxy.ts, lib/views.ts);
 * signed-in users get their own home page there instead.
 *
 * Layout follows what school-facing learning products do well: one clear
 * promise with the product right under it, a path for each audience, the
 * steps of a lesson with what protects the child at each, and honest
 * credibility (research and pilot) instead of invented numbers.
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

  const audience = [
    { key: "teachers", icon: GraduationCap, href: "#teachers", tracked: false },
    { key: "leaders", icon: School, href: "#safety", tracked: false },
    { key: "parents", icon: Heart, href: mail, tracked: true },
  ] as const;
  const who = [
    { key: "autism", icon: Puzzle },
    { key: "adhd", icon: Zap },
    { key: "dyslexia", icon: Ear },
  ] as const;
  const features = [
    { key: "f1", icon: ClipboardList },
    { key: "f2", icon: LineChart },
    { key: "f3", icon: SlidersHorizontal },
    { key: "f4", icon: BookOpen },
  ] as const;

  return (
    <>
      <a href="#content" className="skip-link">{t("skip")}</a>
      <LandingHeader />

      <main id="content" className="landing">
        {/* 1. Hero: one promise, two buttons, the product right under it */}
        <section className="lp-hero" aria-labelledby="hero-title">
          <div className="lp-wrap lp-hero-text">
            <p className="lp-pill">
              <span className="lp-pill-dot" aria-hidden="true" />
              {t("hero.eyebrow")}
            </p>
            <h1 id="hero-title">{t("hero.title")}</h1>
            <p className="lp-lead">{t("hero.lead")}</p>
            <div className="lp-actions">
              <TrackedLink href={signIn} className="btn-primary" event="landing_sign_in" place="hero">
                {t("hero.signIn")}
                <ArrowRight className="size-5" aria-hidden="true" />
              </TrackedLink>
              <TrackedLink href={mail} className="btn-outline" event="landing_contact" place="hero">
                {t("hero.contact")}
              </TrackedLink>
            </div>
            <ul className="lp-trust">
              {(["trust1", "trust2", "trust3"] as const).map((key) => (
                <li key={key}>
                  <Check className="size-4" aria-hidden="true" />
                  {t(`hero.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          <figure className="lp-wrap lp-showcase" aria-label={t("hero.mockLabel")}>
            <BrowserShot shot="lesson" priority />
            <PhoneShot shot="student-phone" className="lp-showcase-phone" />
            <SafetyBadge />
          </figure>
        </section>

        {/* 2. A path for each audience */}
        <section className="lp-wrap lp-audience-section" aria-label={t("audience.label")}>
          <ul className="lp-audience">
            {audience.map(({ key, icon: Icon, href, tracked }) => {
              const link = (
                <>
                  {t(`audience.${key}.link`)}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              );
              return (
                <li key={key}>
                  <Icon className="lp-audience-icon" aria-hidden="true" />
                  <h2>{t(`audience.${key}.title`)}</h2>
                  <p>{t(`audience.${key}.text`)}</p>
                  {tracked ? (
                    <TrackedLink href={href} className="lp-more" event="landing_contact" place="parents">
                      {link}
                    </TrackedLink>
                  ) : (
                    <a href={href} className="lp-more">{link}</a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* 3. Who it helps */}
        <section className="lp-wrap lp-split" aria-labelledby="who-title">
          <div className="lp-head">
            <p className="lp-eyebrow">{t("who.eyebrow")}</p>
            <h2 id="who-title">{t("who.title")}</h2>
            <p className="lp-lead">{t("who.lead")}</p>
          </div>
          <ul className="lp-rows">
            {who.map(({ key, icon: Icon }) => (
              <li key={key}>
                <span className="lp-icon"><Icon aria-hidden="true" /></span>
                <div>
                  <h3>{t(`who.${key}.title`)}</h3>
                  <p>{t(`who.${key}.text`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. How it works */}
        <section id="how" className="lp-band" aria-labelledby="how-title">
          <div className="lp-wrap">
            <div className="lp-head lp-head-center">
              <p className="lp-eyebrow">{t("how.eyebrow")}</p>
              <h2 id="how-title">{t("how.title")}</h2>
            </div>
            <ol className="lp-steps">
              {([1, 2, 3] as const).map((n) => (
                <li key={n}>
                  <h3>{t(`how.step${n}.title`)}</h3>
                  <p>{t(`how.step${n}.text`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5. For teachers */}
        <section id="teachers" className="lp-wrap lp-split lp-split-media" aria-labelledby="teachers-title">
          <div className="flex flex-col gap-6">
            <div className="lp-head">
              <p className="lp-eyebrow">{t("teachers.eyebrow")}</p>
              <h2 id="teachers-title">{t("teachers.title")}</h2>
              <p className="lp-lead">{t("teachers.lead")}</p>
            </div>
            <ul className="lp-features">
              {features.map(({ key, icon: Icon }) => (
                <li key={key}>
                  <span className="lp-icon lp-icon-sm"><Icon aria-hidden="true" /></span>
                  <h3>{t(`teachers.${key}.title`)}</h3>
                  <p>{t(`teachers.${key}.text`)}</p>
                </li>
              ))}
            </ul>
          </div>
          <figure className="lp-teacher-shot" aria-label={t("teachers.mockLabel")}>
            <BrowserShot shot="teacher" />
          </figure>
        </section>

        {/* 6. Safety: the steps of one lesson, on a dark band */}
        <section id="safety" className="lp-dark" aria-labelledby="safety-title">
          <div className="lp-wrap">
            <div className="lp-head lp-head-center">
              <p className="lp-eyebrow">{t("safety.eyebrow")}</p>
              <h2 id="safety-title">{t("safety.title")}</h2>
              <p className="lp-lead">{t("safety.lead")}</p>
            </div>
            <figure className="lp-alert-shot" aria-label={t("safety.alertLabel")}>
              <CardShot shot="alert" />
              <figcaption>{t("safety.alertCaption")}</figcaption>
            </figure>
            <ol className="lp-timeline">
              {([1, 2, 3, 4] as const).map((n) => (
                <li key={n}>
                  <p className="lp-timeline-label">{t(`safety.s${n}.label`)}</p>
                  <h3>{t(`safety.s${n}.title`)}</h3>
                  <p>{t(`safety.s${n}.text`)}</p>
                </li>
              ))}
            </ol>
            <ul className="lp-pledges">
              <li><Check className="size-4" aria-hidden="true" />{t("safety.pledge1")}</li>
              <li><Check className="size-4" aria-hidden="true" />{t("safety.pledge2")}</li>
              <li>
                <Check className="size-4" aria-hidden="true" />
                <a href={`/${locale}/privacy`}>{t("safety.pledge3")}</a>
              </li>
            </ul>
          </div>
        </section>

        {/* 7. Research and pilot: honest credibility */}
        <section className="lp-wrap lp-split" aria-labelledby="story-title">
          <div className="lp-head">
            <p className="lp-eyebrow">{t("story.eyebrow")}</p>
            <h2 id="story-title">{t("story.title")}</h2>
            <p className="lp-lead">{t("story.text")}</p>
          </div>
          <dl className="lp-facts">
            {([1, 2, 3] as const).map((n) => (
              <div key={n}>
                <dt>{t(`story.fact${n}.label`)}</dt>
                <dd>{t(`story.fact${n}.value`)}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 8. FAQ: native disclosure, no JavaScript */}
        <section id="faq" className="lp-wrap lp-split lp-split-faq" aria-labelledby="faq-title">
          <div className="lp-head">
            <p className="lp-eyebrow">{t("faq.eyebrow")}</p>
            <h2 id="faq-title">{t("faq.title")}</h2>
            <p className="lp-lead">{t("faq.lead")}</p>
          </div>
          <div className="lp-faq">
            {([1, 2, 3, 4, 5, 6] as const).map((n) => (
              <details key={n}>
                <summary>{t(`faq.q${n}`)}</summary>
                <p>{t(`faq.a${n}`)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 9. Closing call to action */}
        <section className="lp-wrap" aria-labelledby="cta-title">
          <div className="lp-cta">
            <h2 id="cta-title">{t("cta.title")}</h2>
            <p>{t("cta.text")}</p>
            <div className="lp-actions justify-center">
              <TrackedLink href={mail} className="lp-cta-primary" event="landing_contact" place="cta">
                {t("cta.contact")}
                <ArrowRight className="size-5" aria-hidden="true" />
              </TrackedLink>
              <TrackedLink href={signIn} className="lp-cta-secondary" event="landing_sign_in" place="cta">
                {t("cta.signIn")}
              </TrackedLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-grid">
          <div className="flex flex-col gap-3">
            <Image src="/images/logo.png" alt="eNvolve" width={480} height={92} sizes="120px" className="h-auto w-[120px]" />
            <p>{t("footer.tagline")}</p>
          </div>
          <nav aria-label={t("footer.product")}>
            <h2>{t("footer.product")}</h2>
            <a href="#how">{t("nav.how")}</a>
            <a href="#teachers">{t("nav.teachers")}</a>
            <a href="#safety">{t("nav.safety")}</a>
            <a href="#faq">{t("nav.faq")}</a>
          </nav>
          <nav aria-label={tLegal("footerLabel")}>
            <h2>{t("footer.legal")}</h2>
            <a href={`/${locale}/privacy`}>{tLegal("privacy")}</a>
            <a href={`/${locale}/terms`}>{tLegal("terms")}</a>
          </nav>
          <div>
            <h2>{t("footer.contact")}</h2>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </div>
        </div>
        <p className="lp-wrap lp-copy">© {new Date().getFullYear()} eNvolve</p>
      </footer>
    </>
  );
}
