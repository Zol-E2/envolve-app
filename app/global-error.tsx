"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort error screen: it replaces the whole layout, so translations,
// fonts and styles are not available here. Texts are kept inline.
const TEXT = {
  hu: {
    title: "Valami hiba történt",
    description: "Ez nem a te hibád. Töltsd újra az oldalt, és ha továbbra sem működik, próbáld meg később.",
    retry: "Újratöltés",
  },
  en: {
    title: "Something went wrong",
    description: "This is not your fault. Reload the page, and if it still does not work, try again later.",
    retry: "Reload",
  },
};

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const lang =
    typeof window !== "undefined" && window.location.pathname.startsWith("/en")
      ? "en"
      : "hu";
  const text = TEXT[lang];

  return (
    <html lang={lang}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f9f9f9",
          color: "#1a1a1a",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 520, textAlign: "center" }}>
          <title>{`${text.title} · eNvolve`}</title>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>{text.title}</h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, marginBottom: 24 }}>
            {text.description}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "#fe5933",
              color: "#fff",
              border: 0,
              borderRadius: 12,
              padding: "10px 18px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {text.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
