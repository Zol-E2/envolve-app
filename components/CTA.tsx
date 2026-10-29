import Image from "next/image";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const CTA = () => {
  const t = useTranslations("CTA");

  return (
    <section className="cta-section" data-tour="home-create">
      <div className="cta-badge">{t("badge")}</div>
      <h2 className="text-[26px] leading-tight font-extrabold">{t("title")}</h2>
      <p className="text-lg text-white/85">{t("description")}</p>
      <Image src="/images/cta.svg" alt="" width={300} height={192} className="max-sm:w-[220px]" />
      <Link href="/courses/new" className="btn-primary w-full">
        <Plus className="size-5" aria-hidden />
        {t("button")}
      </Link>
    </section>
  );
};

export default CTA;
