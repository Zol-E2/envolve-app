import { getCourseById } from "@/lib/actions/course.actions";
import { getSubjectColor, getSubjectLabel } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import CourseComponent from "@/components/CourseComponent";

interface CourseSessionPageProps {
  params: Promise<{ id: string }>;
}

const CourseSession = async ({ params }: CourseSessionPageProps) => {
  const { id } = await params;
  // Independent lookups run in parallel instead of one after another.
  // An unknown or malformed course id makes Supabase throw; treat it as "not found".
  const [locale, t, tSubjects, course, user] = await Promise.all([
    getLocale(),
    getTranslations("CourseSession"),
    getTranslations("Subjects"),
    getCourseById(id).catch(() => null),
    currentUser(),
  ]);

  // Locale-aware redirect keeps the user on /hu/... when they were browsing in Hungarian
  if (!user) {
    redirect({ href: "/sign-in", locale });
  }
  if (!course) {
    notFound();
  }

  const { name, subject, topic, duration } = course;
  if (!name || !subject || !topic || !duration) {
    redirect({ href: "/courses", locale });
  }

  return (
    <main>
      <article
        className="
        flex 
        rounded-border 
        justify-between 
        p-6 
        max-md:flex-col"
      >
        <div className="flex items-center gap-2">
          <div
            className="
            size-[72px]
            flex
            items-center
            justify-center
            rounded-lg
            max-md:hidden"
            style={{ backgroundColor: getSubjectColor(subject) }}
          >
            <Image
              src={`/icons/${subject}.svg`}
              alt={getSubjectLabel(tSubjects, subject)}
              width={35}
              height={35}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="font-bold text-2xl">{name}</p>
              <div className="subject-badge max-md:hidden">
                {getSubjectLabel(tSubjects, subject)}
              </div>
            </div>
            <p className="text-lg">{topic}</p>
          </div>
        </div>
        <div className="items-start text-2xl max-md:hidden">
          {t("min", { count: duration })}
        </div>
      </article>
      <CourseComponent
        {...course}
        courseId={id}
        userName={user.firstName!}
        userImage={user.imageUrl!}
      />
    </main>
  );
};

export default CourseSession;
