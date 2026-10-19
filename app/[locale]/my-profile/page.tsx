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
import CourseList from "@/components/CourseList";

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
    <main className="lg:w-3/4">
      <section className="flex justify-between gap-4 max-sm:flex-col items-center">
        <div className="flex gap-4 items-center">
          <Image
            src={user.imageUrl}
            alt={user.firstName!}
            width={110}
            height={110}
          />
          <div className="flex flex-col gap-2">
            <h1 className="font-bold text-2xl">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user.emailAddresses[0].emailAddress}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="border border-black rounded-lg p-3 gap-2 flex flex-col h-fit">
            <div className="flex gap-2 items-center">
              <Image
                src="/icons/check.svg"
                alt=""
                width={22}
                height={22}
              />
              <p className="text-2xl font-bold">{sessionHistory.length}</p>
            </div>
            <div>{t("lessonsCompleted")}</div>
          </div>
          <div className="border border-black rounded-lg p-3 gap-2 flex flex-col h-fit">
            <div className="flex gap-2 items-center">
              <Image src="/icons/cap.svg" alt="" width={22} height={22} />
              <p className="text-2xl font-bold">{courses.length}</p>
            </div>
            <div>{t("coursesCreated")}</div>
          </div>
        </div>
      </section>
      <Accordion type="multiple">
        <AccordionItem value="bookmarks">
          <AccordionTrigger className="text-2xl font-bold">
            {t("bookmarkedCourses")} ({bookmarkedCourses.length})
          </AccordionTrigger>
          <AccordionContent>
            <CourseList
              courses={bookmarkedCourses}
              title={t("bookmarkedCourses")}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="recent">
          <AccordionTrigger className="text-2xl font-bold">
            {t("recentSessions")}
          </AccordionTrigger>
          <AccordionContent>
            <CourseList
              title={t("recentSessions")}
              courses={sessionHistory}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="courses">
          <AccordionTrigger className="text-2xl font-bold">
            {t("myCourses")} ({courses.length})
          </AccordionTrigger>
          <AccordionContent>
            <CourseList title={t("myCourses")} courses={courses} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </main>
  );
};
export default Profile;
