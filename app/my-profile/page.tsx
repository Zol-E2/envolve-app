import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  getUserCourses,
  getUserSessions,
  getBookmarkedCourses,
} from "@/lib/actions/course.actions";
import Image from "next/image";
import CourseList from "@/components/CourseList";

const Profile = async () => {
  const user = await currentUser();

  if (!user) redirect("/sign-in");

  const courses = await getUserCourses(user.id);
  const sessionHistory = await getUserSessions(user.id);
  const bookmarkedCourses = await getBookmarkedCourses(user.id);

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
          <div className="border border-black rouded-lg p-3 gap-2 flex flex-col h-fit">
            <div className="flex gap-2 items-center">
              <Image
                src="/icons/check.svg"
                alt="checkmark"
                width={22}
                height={22}
              />
              <p className="text-2xl font-bold">{sessionHistory.length}</p>
            </div>
            <div>Lessons completed</div>
          </div>
          <div className="border border-black rouded-lg p-3 gap-2 flex flex-col h-fit">
            <div className="flex gap-2 items-center">
              <Image src="/icons/cap.svg" alt="cap" width={22} height={22} />
              <p className="text-2xl font-bold">{courses.length}</p>
            </div>
            <div>Courses created</div>
          </div>
        </div>
      </section>
      <Accordion type="multiple">
        <AccordionItem value="bookmarks">
          <AccordionTrigger className="text-2xl font-bold">
            Bookmarked Courses {`(${bookmarkedCourses.length})`}
          </AccordionTrigger>
          <AccordionContent>
            <CourseList
              courses={bookmarkedCourses}
              title="Bookmarked Courses"
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="recent">
          <AccordionTrigger className="text-2xl font-bold">
            Recent Sessions
          </AccordionTrigger>
          <AccordionContent>
            <CourseList
              title="Recent Sessions"
              courses={sessionHistory}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="courses">
          <AccordionTrigger className="text-2xl font-bold">
            My Courses {`(${courses.length})`}
          </AccordionTrigger>
          <AccordionContent>
            <CourseList title="My Courses" courses={courses} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </main>
  );
};
export default Profile;