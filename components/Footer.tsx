import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Small footer with the legal pages, which sign-up links to as well. */
const Footer = () => {
  const t = useTranslations("Legal");

  return (
    <footer className="site-footer">
      <nav aria-label={t("footerLabel")} className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/privacy">{t("privacy")}</Link>
        <Link href="/terms">{t("terms")}</Link>
      </nav>
      <p>© {new Date().getFullYear()} eNvolve</p>
    </footer>
  );
};

export default Footer;
