import { useTranslations } from "next-intl";
import { UsersRound } from "lucide-react";
import type { StudentClass } from "@/lib/teacher/types";
import JoinClassForm from "./JoinClassForm";

/**
 * Always on the student's home page: their classes, and a code field to join
 * a new one, so nobody has to look for it in the profile.
 */
const HomeClassesCard = ({ classes }: { classes: StudentClass[] }) => {
  const t = useTranslations("HomeClasses");

  return (
    <article className="card flex flex-col gap-4" aria-labelledby="home-classes-title" data-tour="home-classes">
      <h2 id="home-classes-title" className="flex items-center gap-2 text-2xl font-bold max-sm:text-xl">
        <UsersRound className="size-7 text-turn" aria-hidden />
        {t("title")}
      </h2>
      {classes.length === 0 ? (
        <p className="text-base text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col">
          {classes.map((c) => (
            <li key={c.id} className="course-row py-2">
              <span className="flex min-w-0 flex-col">
                <span className="text-lg leading-snug font-bold">{c.name}</span>
                <span className="text-[0.9375rem] text-muted-foreground">{c.teacherName}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-border pt-4">
        <JoinClassForm variant="card" />
      </div>
    </article>
  );
};

export default HomeClassesCard;
