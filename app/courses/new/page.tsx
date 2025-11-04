import CourseForm from "@/components/CourseForm";
import React from "react";

const NewCourse = () => {
  return (
    <main className="lg:w-1/3 md:w-2/3 items-center justify-center">
      <article className="w-full gap-4 flex flex-col">
        <h1>Course Builder</h1>

        <CourseForm />
      </article>
    </main>
  );
};

export default NewCourse;
