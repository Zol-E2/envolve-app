import CourseCard from "@/components/CourseCard";
import CourseList from "@/components/CourseList";
import CTA from "@/components/CTA";
import { recentSessions } from "@/constants";

const Page = () => {
  return (
    <main>
      <h1>Popular Courses</h1>

      <section className="home-section">
        <CourseCard 
          id = "1"
          subject = "science"
          name = "Neura the Brainy Explorer"
          topic = "Neural Network of the Brains"
          duration = {45}
          color = "#E5D0FF"

        />
        <CourseCard 
          id = "2"
          subject = "maths"
          name = "Countsy the Number Wizard"
          topic = "Derivatives & Integrals"
          duration = {30}
          color = "#FFDA6E"

        />
        <CourseCard 
          id = "3"
          subject = "language"
          name = "Verba the Vocabulary Builder"
          topic = "English Literature"
          duration = {60}
          color = "#BDE7FF"

        />
      </section>

      <section className="home-section">
        <CourseList 
          title="Your Recent Courses"
          courses={recentSessions}
          classNames="w-2/3 max-lg:w-full"
        />
        <CTA />
      </section>
    </main>
  );
};

export default Page;
