import React from "react";
import Image from "next/image";
import Link from "next/dist/client/link";

interface CourseCardProps {
  id: string;
  title: string;
  topic: string;
  subject: string;
  duration: number;
  color: string;
}

const CourseCard = ({
  id,
  title,
  topic,
  subject,
  duration,
  color,
}: CourseCardProps) => {
  return (
    <article className="course-card" style={{ backgroundColor: color }}>
      <div className="flex justify-between items-center">
        <div className="subject-badge">{subject}</div>
        <button className="course-bookmark" aria-label="Bookmark Course">
          <Image
            src="/icons/bookmark.svg"
            alt="Bookmark Icon"
            width={12.5}
            height={15}
          />
        </button>
      </div>

      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm">{topic}</p>
      <div className="flex items-center gap-2 ">
        <Image
          src="/icons/clock.svg"
          alt="duration"
          width={13.5}
          height={13.5}
        />
        <p className="text-sm">{duration} minutes</p>
      </div>

      <Link href={`/courses/${id}`} className="w-full">
        <button className="w-full btn-primary justify-center">
            Launch Lesson
        </button>
      </Link>
    </article>
  );
};

export default CourseCard;
