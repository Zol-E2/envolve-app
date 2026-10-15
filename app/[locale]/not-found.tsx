import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Rendered for notFound() inside the [locale] segment and for unknown paths
// (via the [...rest] catch-all), so the 404 keeps the navbar and the language.
export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="items-center text-center">
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <Link href="/" className="btn-primary">
        {t("backHome")}
      </Link>
    </main>
  );
}
