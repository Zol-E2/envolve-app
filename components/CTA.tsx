import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const CTA = () => {
  const t = useTranslations("CTA");

  return (
    <section className="cta-section">
      <div className="cta-badge">{t("badge")}</div>
      <h2 className="text-3xl font-bold">{t("title")}</h2>
      <p>{t("description")}</p>
      <Image src="/images/cta.svg" alt="cta" width={362} height={232} />
      {/* Link wraps the entire button so the whole element is clickable */}
      <Link href="/courses/new" className="btn-primary">
        <Image src="/icons/plus.svg" alt="plus" width={12} height={12} />
        <p>{t("button")}</p>
      </Link>
    </section>
  );
};

export default CTA;
