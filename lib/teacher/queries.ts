import { cache } from "react";
import { getClassDetail, getTeacherClasses } from "@/lib/actions/teacher.actions";

// One database round per request, shared by the teacher layout (sidebar)
// and the page underneath it
export const loadTeacherClasses = cache(() => getTeacherClasses().catch(() => []));
export const loadClassDetail = cache((id: string) => getClassDetail(id).catch(() => null));
