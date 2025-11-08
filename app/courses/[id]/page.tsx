import { getCourseById } from "@/lib/actions/course.actions";
import { getSubjectColor } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import CourseComponent from "@/components/CourseComponent";

interface CourseSessionPageProps {
  params: Promise<{ id: string }>;
}

const CourseSession = async ({ params }: CourseSessionPageProps) => {
  const { id } = await params;
  const course = await getCourseById(id);
  const user = await currentUser();

  const { name, subject, topic, duration } = course;

  if (!user) {
    redirect("/sign-in");
  }
  if (!name || !subject || !topic || !duration) {
    redirect("/courses");
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
              alt={subject}
              width={35}
              height={35}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="font-bold text-2xl">{name}</p>
              <div className="subject-badge max-md:hidden">{subject}</div>
            </div>
            <p className="text-lg">{topic}</p>
          </div>
        </div>
        <div className="items-start text-2xl max-md:hidden">
          {duration} perc
        </div>
      </article>
      <CourseComponent
        {...course}
        companionId={id}
        userName={user.firstName!}
        userImage={user.imageUrl!}
      />
    </main>
  );
};

export default CourseSession;
