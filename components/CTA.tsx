import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/** Invitation to build an own course, kept small and calm next to the week card. */
const CTA = () => {
  const t = useTranslations("CTA");

  return (
    <section className="cta-section" data-tour="home-create">
      <h2 className="text-2xl leading-tight font-extrabold">{t("title")}</h2>
      <p className="text-base text-white/85">{t("description")}</p>
      <Link href="/courses/new" className="btn-primary w-full">
        <Plus className="size-5" aria-hidden />
        {t("button")}
      </Link>
    </section>
  );
};

export default CTA;
