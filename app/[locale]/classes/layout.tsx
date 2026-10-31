import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { isTeacher } from "@/lib/roles.server";
import { loadTeacherClasses } from "@/lib/teacher/queries";
import ClassSidebar from "@/components/teacher/ClassSidebar";

// Teacher data is personal and changes often
export const dynamic = "force-dynamic";

/** Teacher pages: a left column with the classes on desktop (see the design) */
const TeacherLayout = async ({ children }: { children: ReactNode }) => {
  // The middleware already sends students away; this is the second check
  if (!(await isTeacher())) redirect({ href: "/", locale: await getLocale() });
  const classes = await loadTeacherClasses();

  return (
    <div className="teacher-shell">
      <ClassSidebar classes={classes} />
      {children}
    </div>
  );
};

export default TeacherLayout;
