"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { Printer, TriangleAlert } from "lucide-react";
import { ANIMALS, cardUrl, type LoginCard } from "@/lib/classAccounts";

/**
 * Printable login cards: QR code, name, username and password. They exist
 * only in this page while it is open: nothing is saved, and the passwords
 * cannot be shown again (a new card can be made instead).
 */
const LoginCards = ({ cards, onDone }: { cards: LoginCard[]; onDone: () => void }) => {
  const t = useTranslations("ClassAccounts");
  const locale = useLocale();
  const [qr, setQr] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      cards.map(async (card) => [
        card.studentId,
        await QRCode.toDataURL(cardUrl(window.location.origin, locale, card.cardKey), {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 240,
        }),
      ])
    )
      .then((pairs) => !cancelled && setQr(Object.fromEntries(pairs)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cards, locale]);

  return (
    <section className="card flex flex-col gap-4" aria-labelledby="cards-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="cards-title" className="text-2xl font-bold max-sm:text-xl">
          {t("cardsTitle", { count: cards.length })}
        </h2>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          <Printer className="size-5" aria-hidden />
          {t("print")}
        </button>
      </div>
      <p className="stuck-alert" role="note">
        <TriangleAlert className="mt-1 size-6 shrink-0 text-warn" aria-hidden />
        <span>{t("onlyOnce")}</span>
      </p>

      <ul className="login-cards" aria-label={t("cardsLabel")}>
        {cards.map((card) => (
          <li key={card.studentId} className="login-card">
            {qr[card.studentId] ? (
              // A data URL made in this page; next/image would only add work here
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr[card.studentId]} alt={t("qrAlt", { name: card.displayName })} className="login-card-qr" />
            ) : (
              <span className="login-card-qr" aria-hidden />
            )}
            <span className="flex min-w-0 flex-col gap-1">
              <span className="login-card-brand">eNvolve</span>
              <span className="login-card-name">
                <span aria-hidden>{ANIMALS[card.animal]}</span> {card.displayName}
              </span>
              <span className="login-card-field">
                {t("username")}
                <b>{card.username}</b>
              </span>
              <span className="login-card-field">
                {t("password")}
                <b>{card.password}</b>
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <span className="text-base font-bold">{t("closeQuestion")}</span>
            <button type="button" className="btn-danger" onClick={onDone}>
              {t("closeConfirm")}
            </button>
            <button type="button" className="btn-quiet" onClick={() => setConfirming(false)}>
              {t("cancel")}
            </button>
          </>
        ) : (
          <button type="button" className="btn-outline min-h-11 px-4 text-base" onClick={() => setConfirming(true)}>
            {t("close")}
          </button>
        )}
      </div>
    </section>
  );
};

export default LoginCards;
