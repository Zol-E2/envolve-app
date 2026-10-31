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
  getLessonCount,
} from "@/lib/actions/course.actions";
import Image from "next/image";
import { Bookmark, Check, GraduationCap } from "lucide-react";
import CourseList from "@/components/CourseList";
import PageTour from "@/components/onboarding/PageTour";
import ComfortSettings from "@/components/ComfortSettings";
import { getMyClasses } from "@/lib/actions/class.actions";
import { Link } from "@/i18n/navigation";
import { isTeacher } from "@/lib/roles.server";
import { readTeacherProfile } from "@/lib/validation";
import TeacherProfileForm from "@/components/teacher/TeacherProfileForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("profile") };
}

const Profile = async () => {
  const user = await currentUser();
  const locale = await getLocale();

  if (!user) redirect({ href: "/sign-in", locale });

  // Teachers: only what their work needs (lib/views.ts). The name students
  // see, the school, display settings and the account; no student statistics
  if (await isTeacher()) {
    const tTeacher = await getTranslations("TeacherProfile");
    const profile = readTeacherProfile(user.unsafeMetadata, user.firstName, user.lastName);
    return (
      <main>
        <PageTour id="teacherProfile" />
        <section className="profile-head">
          <Image src={user.imageUrl} alt="" width={80} height={80} className="profile-avatar" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1>{profile.name}</h1>
            <p className="text-base break-all text-muted-foreground">
              {[tTeacher("role"), profile.school].filter(Boolean).join(" · ")}
            </p>
          </div>
        </section>
        <div className="profile-grid is-teacher">
          <ComfortSettings />
          <div className="profile-lists">
            <TeacherProfileForm name={profile.name} school={profile.school} />
          </div>
        </div>
      </main>
    );
  }

  // Independent queries run in parallel instead of one after another
  const [t, courses, sessionHistory, bookmarkedCourses, lessonCount, myClasses] = await Promise.all([
    getTranslations("Profile"),
    getUserCourses(user.id),
    getUserSessions(user.id),
    getBookmarkedCourses(user.id),
    getLessonCount(user.id),
    getMyClasses(),
  ]);

  const stats = [
    { key: "lessonsCompleted", value: lessonCount, icon: Check, color: "text-ok" },
    { key: "coursesOwn", value: courses.length, icon: GraduationCap, color: "text-primary" },
    { key: "coursesSaved", value: bookmarkedCourses.length, icon: Bookmark, color: "text-turn" },
  ] as const;

  return (
    <main>
      <PageTour id="profile" />
      <section className="profile-head">
        <Image
          src={user.imageUrl}
          alt=""
          width={80}
          height={80}
          className="profile-avatar"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h1>{[user.firstName, user.lastName].filter(Boolean).join(" ") || t("title")}</h1>
          <p className="text-base break-all text-muted-foreground">
            {user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress}
          </p>
        </div>
      </section>

      {/* Plain numbers, no comparison with other students */}
      <section className="profile-stats" aria-label={t("statsLabel")} data-tour="profile-stats">
        {stats.map(({ key, value, icon: Icon, color }) => (
          <div key={key} className="profile-stat">
            <p className="profile-stat-value">
              <Icon className={`size-6 ${color}`} aria-hidden />
              {value}
            </p>
            <p className="text-base leading-snug font-bold hyphens-auto text-muted-foreground max-sm:text-[0.9375rem]">{t(key)}</p>
          </div>
        ))}
      </section>

      <div className="profile-grid">
        <ComfortSettings />
        <div className="profile-lists">
          {/* Recent lessons open by default, so the page never looks empty */}
          <Accordion type="multiple" defaultValue={["recent"]}>
            <AccordionItem value="classes" data-tour="profile-classes">
              <AccordionTrigger className="text-2xl font-bold max-sm:text-xl">
                {t("myClasses")} ({myClasses.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="course-list">
                  {myClasses.length === 0 ? (
                    <p className="text-lg">{t("noClasses")}</p>
                  ) : (
                    <ul className="flex flex-col">
                      {myClasses.map((c) => (
                        <li key={c.id} className="course-row">
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-lg leading-snug font-bold">{c.name}</span>
                            <span className="text-[0.9375rem] text-muted-foreground">{c.teacherName}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href="/join" className="btn-soft w-fit">
                    {t("joinClass")}
                  </Link>
                </div>
              </AccordionContent>
            </AccordionItem>
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
        </div>
      </div>
    </main>
  );
};
export default Profile;
