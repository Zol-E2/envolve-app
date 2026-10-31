import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LogOut, UsersRound } from "lucide-react";
import { getMyClasses, leaveClass } from "@/lib/actions/class.actions";
import { getSubjectLabel } from "@/lib/utils";
import JoinClassForm from "@/components/classes/JoinClassForm";
import ConfirmAction from "@/components/teacher/ConfirmAction";
import PageTour from "@/components/onboarding/PageTour";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Join");
  return { title: t("title") };
}

/** Joining a class with the teacher's code, and the classes already joined */
const JoinPage = async () => {
  const [t, tSubjects, classes] = await Promise.all([
    getTranslations("Join"),
    getTranslations("Subjects"),
    getMyClasses(),
  ]);

  return (
    <main>
      <PageTour id="join" />
      <section className="flex flex-col gap-1">
        <h1>{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-sm:text-base">{t("lead")}</p>
      </section>

      <JoinClassForm />

      <section className="flex flex-col gap-3" aria-labelledby="my-classes" data-tour="join-classes">
        <h2 id="my-classes" className="text-2xl font-bold max-sm:text-xl">
          {t("myClasses")}
        </h2>
        {classes.length === 0 ? (
          <p className="text-lg text-muted-foreground">{t("noClasses")}</p>
        ) : (
          <ul className="person-list">
            {classes.map((c) => (
              <li key={c.id} className="person-row">
                <span className="person-avatar" aria-hidden>
                  <UsersRound className="size-5" />
                </span>
                <span className="person-name">
                  {c.name}
                  <span className="person-detail block">
                    {[c.teacherName, c.subject && getSubjectLabel(tSubjects, c.subject)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ConfirmAction
                  label={t("leave")}
                  question={t("leaveQuestion", { name: c.name })}
                  confirmLabel={t("leaveConfirm")}
                  action={leaveClass.bind(null, c.id)}
                  icon={<LogOut className="size-5" aria-hidden />}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default JoinPage;
