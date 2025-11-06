import CourseCard from "@/components/CourseCard";
import { getAllCourses } from "@/lib/actions/course.actions";
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
        <h1>Course Library</h1>
        <div className="flex gap-4 ">
          <SearchInput />
          <SubjectFilter />
        </div>
      </section>
      <section className="course-grid">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            {...course}
            color={getSubjectColor(course.subject)}
          />
        ))}
      </section>
    </main>
  );
};

export default Courses;
