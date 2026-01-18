import { getAllCourses } from "@/lib/actions/course.actions";
import CourseCard from "@/components/CourseCard";
import { getSubjectColor } from "@/lib/utils";
import SearchInput from "@/components/Searchinput";
import SubjectFilter from "@/components/SubjectFilter";

const Courses = async ({ searchParams }: SearchParams) => {
  const filters = await searchParams;
  const subject = filters.subject ? filters.subject : "";
  const topic = filters.topic ? filters.topic : "";

  const courses = await getAllCourses({ subject, topic });

  return (
    <main>
      <section className="flex justify-between gap-4 max-sm:flex-col">
        <h1>Kurzus Könyvtár</h1>
        <div className="flex gap-4">
          <SearchInput />
          <SubjectFilter />
        </div>
      </section>
      <section className="courses-grid">
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
    </main>
  );
};

export default Courses;
