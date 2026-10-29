import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  getUserCourses,
  getUserSessions,
  getBookmarkedCourses,
} from "@/lib/actions/course.actions";
import Image from "next/image";
import { Check, GraduationCap } from "lucide-react";
import CourseList from "@/components/CourseList";
import PageTour from "@/components/onboarding/PageTour";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("profile") };
}

const Profile = async () => {
  const user = await currentUser();
  const locale = await getLocale();

  if (!user) redirect({ href: "/sign-in", locale });

  // Independent queries run in parallel instead of one after another
  const [t, courses, sessionHistory, bookmarkedCourses] = await Promise.all([
    getTranslations("Profile"),
    getUserCourses(user.id),
    getUserSessions(user.id),
    getBookmarkedCourses(user.id),
  ]);

  return (
    <main>
      <PageTour id="profile" />
      <section className="flex justify-between gap-5 max-md:flex-col md:items-center">
        <div className="flex gap-4 items-center">
          <Image
            src={user.imageUrl}
            alt={user.firstName!}
            width={96}
            height={96}
            className="rounded-full size-24 max-sm:size-16"
          />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl max-sm:text-2xl">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-base text-muted-foreground break-all">
              {user.emailAddresses[0].emailAddress}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:w-[420px]" data-tour="profile-stats">
          <div className="card flex flex-col gap-1">
            <div className="flex gap-2 items-center">
              <Check className="size-6 text-ok" aria-hidden />
              <p className="font-display text-3xl font-extrabold">{sessionHistory.length}</p>
            </div>
            <p className="text-base font-bold text-muted-foreground">{t("lessonsCompleted")}</p>
          </div>
          <div className="card flex flex-col gap-1">
            <div className="flex gap-2 items-center">
              <GraduationCap className="size-6 text-primary" aria-hidden />
              <p className="font-display text-3xl font-extrabold">{courses.length}</p>
            </div>
            <p className="text-base font-bold text-muted-foreground">{t("coursesCreated")}</p>
          </div>
        </div>
      </section>
      <Accordion type="multiple">
        <AccordionItem value="bookmarks" data-tour="profile-bookmarks">
          <AccordionTrigger className="text-2xl font-bold max-sm:text-xl">
            {t("bookmarkedCourses")} ({bookmarkedCourses.length})
          </AccordionTrigger>
          <AccordionContent>
            <CourseList
              courses={bookmarkedCourses}
              title={t("bookmarkedCourses")}
              emptyMessage={t("bookmarksEmpty")}
              emptyAction={{ href: "/courses", label: t("browseCourses") }}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="recent" data-tour="profile-recent">
          <AccordionTrigger className="text-2xl font-bold max-sm:text-xl">
            {t("recentSessions")}
          </AccordionTrigger>
          <AccordionContent>
            <CourseList
              title={t("recentSessions")}
              courses={sessionHistory}
              emptyMessage={t("recentEmpty")}
              emptyAction={{ href: "/courses", label: t("browseCourses") }}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="courses" data-tour="profile-courses">
          <AccordionTrigger className="text-2xl font-bold max-sm:text-xl">
            {t("myCourses")} ({courses.length})
          </AccordionTrigger>
          <AccordionContent>
            <CourseList
              title={t("myCourses")}
              courses={courses}
              emptyMessage={t("myCoursesEmpty")}
              emptyAction={{ href: "/courses/new", label: t("createCourse") }}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </main>
  );
};
export default Profile;
