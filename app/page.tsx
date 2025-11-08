import CourseCard from "@/components/CourseCard";
import CourseList from "@/components/CourseList";
import CTA from "@/components/CTA";
import { getAllCourses, getRecentSessions } from "@/lib/actions/course.actions";
import { getSubjectColor } from "@/lib/utils";

const Page = async () => {
  const courses = await getAllCourses({ limit: 3 });
  const recentSessionsCourses = await getRecentSessions(10);

  return (
    <main>
      <h1>Popular Courses</h1>

      <section className="home-section">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            id={course.id}
            name={course.name}
            topic={course.topic}
            subject={course.subject}
            duration={course.duration}
            bookmarked={course.bookmarked}
            color={getSubjectColor(course.subject)}
          />
        ))}
      </section>

      <section className="home-section">
        <CourseList
          title="Your Recent Courses"
          courses={recentSessionsCourses}
          classNames="w-2/3 max-lg:w-full"
        />
        <CTA />
      </section>
    </main>
  );
};

export default Page;
