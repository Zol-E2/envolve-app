"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { IdCard, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { LIMITS } from "@/lib/validation";
import { ANIMALS, type ClassAccount, type LoginCard } from "@/lib/classAccounts";
import {
  createClassAccounts,
  deleteClassAccount,
  issueNewCard,
  renameClassAccount,
} from "@/lib/actions/class-accounts.actions";
import ConfirmAction from "./ConfirmAction";
import LoginCards from "./LoginCards";

/** Names typed one per line, without empty lines and repeats */
const readNames = (text: string) =>
  [...new Set(text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean))];

/** One class account: status, a new card, renaming and deleting */
const AccountRow = ({ account, onCard }: { account: ClassAccount; onCard: (card: LoginCard) => void }) => {
  const t = useTranslations("ClassAccounts");
  const locale = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "renaming" | "newCard">("idle");
  const [name, setName] = useState(account.displayName);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await work();
      setMode("idle");
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  return (
    <li className="person-row">
      <span className="person-avatar text-2xl" aria-hidden>
        {ANIMALS[account.animal]}
      </span>
      <span className="person-name">
        {account.displayName}
        <span className="person-detail block">{account.joinedAt ? t("joined") : t("notJoined")}</span>
      </span>

      {mode === "idle" && (
        <span className="flex flex-wrap items-center gap-1">
          <button type="button" className="btn-quiet" onClick={() => setMode("newCard")}>
            <RefreshCw className="size-5" aria-hidden />
            {t("newCard")}
          </button>
          <button type="button" className="btn-quiet" onClick={() => setMode("renaming")}>
            <Pencil className="size-5" aria-hidden />
            {t("rename")}
          </button>
          <ConfirmAction
            label={t("delete")}
            question={t("deleteQuestion", { name: account.displayName })}
            confirmLabel={t("deleteConfirm")}
            action={() => deleteClassAccount(account.studentId)}
            icon={<Trash2 className="size-5" aria-hidden />}
          />
        </span>
      )}

      {mode === "newCard" && (
        <span className="flex w-full flex-wrap items-center gap-2" role="group" aria-label={t("newCardQuestion")}>
          <span className="text-base font-bold">{t("newCardQuestion")}</span>
          <button
            type="button"
            className="btn-danger"
            disabled={busy}
            onClick={() =>
              run(async () => {
                onCard(await issueNewCard({ studentId: account.studentId, locale }));
              })
            }
          >
            {t("newCardConfirm")}
          </button>
          <button type="button" className="btn-quiet" onClick={() => setMode("idle")} disabled={busy}>
            {t("cancel")}
          </button>
        </span>
      )}

      {mode === "renaming" && (
        <form
          className="flex w-full flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              await renameClassAccount({ studentId: account.studentId, name });
              router.refresh();
            });
          }}
        >
          <label htmlFor={`rename-${account.studentId}`} className="sr-only">
            {t("renameLabel")}
          </label>
          <input
            id={`rename-${account.studentId}`}
            className="field min-h-11 max-w-xs flex-1 py-2"
            value={name}
            maxLength={LIMITS.displayName}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn-primary min-h-11 px-4 text-base" disabled={busy || !name.trim()}>
            {t("save")}
          </button>
          <button type="button" className="btn-quiet" onClick={() => setMode("idle")} disabled={busy}>
            {t("cancel")}
          </button>
        </form>
      )}

      {failed && (
        <span className="field-error w-full" role="alert">
          {t("actionError")}
        </span>
      )}
    </li>
  );
};

/**
 * Class accounts on the Students tab: the teacher types the names, prints a
 * login card for each student, and later gives a new card or deletes the
 * account. Students without an e-mail address sign in with these.
 */
const ClassAccountsPanel = ({ classId, accounts }: { classId: string; accounts: ClassAccount[] }) => {
  const t = useTranslations("ClassAccounts");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cards, setCards] = useState<LoginCard[]>([]);
  const names = readNames(text);
  const tooMany = names.length > LIMITS.classAccountsPerBatch;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (names.length === 0 || tooMany) {
      setMessage(names.length === 0 ? t("namesRequired") : t("tooManyAtOnce", { max: LIMITS.classAccountsPerBatch }));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await createClassAccounts({ classId, names, locale });
      if (result.cards.length) {
        setCards(result.cards);
        setText("");
        setOpen(false);
        router.refresh();
      }
      if (result.status !== "done") {
        setMessage(
          result.status === "partial"
            ? t("partial", { count: result.cards.length })
            : result.status === "clerk_setup"
              ? t("clerkSetup")
              : result.status === "too_many"
                ? t("tooManyInClass", { max: LIMITS.classAccountsPerClass })
                : t("createError")
        );
      }
    } catch {
      setMessage(t("createError"));
    }
    setBusy(false);
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="accounts-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="accounts-title" className="flex items-center gap-2 text-2xl font-bold max-sm:text-xl">
            <IdCard className="size-6" aria-hidden />
            {t("title")}
          </h2>
          <p className="max-w-prose text-lg text-muted-foreground max-sm:text-base">{t("lead")}</p>
        </div>
        {!open && cards.length === 0 && (
          <button type="button" className="btn-primary" onClick={() => setOpen(true)} data-tour="class-accounts-create">
            <Plus className="size-5" aria-hidden />
            {t("create")}
          </button>
        )}
      </div>

      {open && (
        <form className="card flex flex-col gap-3" onSubmit={submit} noValidate>
          <label htmlFor="account-names" className="field-label">
            {t("namesLabel")}
          </label>
          <p id="account-names-hint" className="form-hint">
            {t("namesHint")}
          </p>
          <textarea
            id="account-names"
            className="field"
            rows={6}
            value={text}
            placeholder={t("namesPlaceholder")}
            onChange={(event) => {
              setText(event.target.value);
              setMessage(null);
            }}
            aria-describedby="account-names-hint"
            aria-invalid={tooMany}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="btn-primary" disabled={busy || names.length === 0 || tooMany}>
              <Plus className="size-5" aria-hidden />
              {busy ? t("creating") : t("createCount", { count: names.length })}
            </button>
            <button type="button" className="btn-quiet" onClick={() => setOpen(false)} disabled={busy}>
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}

      {cards.length > 0 && <LoginCards cards={cards} onDone={() => setCards([])} />}

      {accounts.length > 0 ? (
        <ul className="person-list" aria-label={t("listLabel")} data-tour="class-accounts-list">
          {accounts.map((account) => (
            <AccountRow
              key={account.studentId}
              account={account}
              onCard={(card) => setCards((current) => [...current.filter((c) => c.studentId !== card.studentId), card])}
            />
          ))}
        </ul>
      ) : (
        !open && <p className="text-base text-muted-foreground">{t("empty")}</p>
      )}
    </section>
  );
};

export default ClassAccountsPanel;
