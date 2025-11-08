"use client";
import { removeBookmark } from "@/lib/actions/course.actions";
import { addBookmark } from "@/lib/actions/course.actions";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useState } from "react";


interface CourseCardProps {
  id: string;
  name: string;
  topic: string;
  subject: string;
  duration: number;
  color: string;
  bookmarked: boolean;
}

const CourseCard = ({
  id,
  name,
  topic,
  subject,
  duration,
  color,
  bookmarked,
}: CourseCardProps) => {

const [isBookmarked, setIsBookmarked] = useState(bookmarked);
const router = useRouter();
const pathname = usePathname();

const handleBookmark = () => {
  startTransition(async () => {
    if (isBookmarked) {
      await removeBookmark(id, pathname);
      setIsBookmarked(false);
    } else {
      await addBookmark(id, pathname);
      setIsBookmarked(true);
    }
    router.refresh();
  });
};

  return (
    <article className="course-card" style={{ backgroundColor: color }}>
      <div className="flex justify-between items-center">
        <div className="subject-badge">{subject}</div>
        <button className="course-bookmark" onClick={handleBookmark} title="bookmark">
          <Image
            src={
              isBookmarked ? "/icons/bookmark-filled.svg" : "/icons/bookmark.svg"
            }
            alt="bookmark"
            width={12.5}
            height={15}
          />
        </button>
      </div>

      <h2 className="text-2xl font-bold">{name}</h2>
      <p className="text-sm">{topic}</p>
      <div className="flex items-center gap-2">
        <Image
          src="/icons/clock.svg"
          alt="duration"
          width={13.5}
          height={13.5}
        />
        <p className="text-sm">{duration} minutes</p>
      </div>

      <Link href={`/courses/${id}`} className="w-full">
        <button className="btn-primary w-full justify-center">
          Launch Lesson
        </button>
      </Link>
    </article>
  );
};

export default CourseCard;