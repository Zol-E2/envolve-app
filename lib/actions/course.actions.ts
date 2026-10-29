'use server';

import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  LIMITS,
  cleanSearch,
  cleanSubject,
  courseInputSchema,
  isUuid,
  safeAppPath,
} from "../validation";

// Every function in this file is a server action: a browser can call it
// directly with any arguments it likes. So each one checks who is signed in
// and validates its input itself, and the database policies (RLS) are the
// last line of defence behind that.

/** The signed-in user id, or null */
const currentUserId = async () => (await auth()).userId ?? null;

// ─── Course CRUD ──────────────────────────────────────────────────────────────

/** Creates a new course row owned by the currently authenticated user. */
export const createCourse = async (formData: CreateCourse) => {
    const author = await currentUserId();
    if (!author) throw new Error("Not signed in");

    // Validate and clean on the server: lengths, known subjects, voices,
    // languages and a sensible lesson length
    const parsed = courseInputSchema.safeParse(formData);
    if (!parsed.success) throw new Error("Invalid course data");

    const supabase = createSupabaseClient();

    // A simple brake on scripted spam: at most N new courses per day
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('author', author)
      .gte('created_at', since);
    if (countError) throw new Error('Failed to create course');
    if ((count ?? 0) >= LIMITS.coursesPerDay) throw new Error('Too many new courses today');

    const { data, error } = await supabase
    .from('courses')
    .insert({ ...parsed.data, author })
    .select();

    if (error || !data) {
        throw new Error('Failed to create course');
    }

    return data[0];
}

/**
 * Returns a paginated, optionally filtered list of courses.
 * Bookmark status is resolved for the logged-in user in a single extra query.
 */
export const getAllCourses = async (
  { limit = 10, page = 1, subject, topic }: GetAllCourses
) => {
  const supabase = createSupabaseClient();

  // Search text comes from the URL, so it is cleaned before it becomes part
  // of a query (see cleanSearch); the subject must be one we know
  const safeSubject = cleanSubject(subject);
  const safeTopic = cleanSearch(topic);
  const safeLimit = Math.min(Math.max(Math.trunc(Number(limit)) || 10, 1), 50);
  const safePage = Math.max(Math.trunc(Number(page)) || 1, 1);

  let query = supabase.from("courses").select();

  if (safeSubject) query = query.eq("subject", safeSubject);
  if (safeTopic) {
    query = query.or(`topic.ilike.%${safeTopic}%,name.ilike.%${safeTopic}%`);
  }

  query = query
    .order("created_at", { ascending: false })
    .range((safePage - 1) * safeLimit, safePage * safeLimit - 1);

  const { data: courses, error } = await query;
  if (error || !courses) {
    throw new Error(error?.message || "Failed to fetch courses");
  }

  const userId = await currentUserId();
  if (!userId || courses.length === 0) {
    return courses.map((c) => ({ ...c, bookmarked: false }));
  }

  // Fetch all bookmark entries for the current user in one query
  const ids = courses.map((c) => c.id);
  const { data: marks, error: mErr } = await supabase
    .from("bookmarks")
    .select("course_id")
    .eq("user_id", userId)
    .in("course_id", ids);

  if (mErr) {
    return courses.map((c) => ({ ...c, bookmarked: false }));
  }

  const marked = new Set((marks ?? []).map((m) => m.course_id as string));
  return courses.map((c) => ({ ...c, bookmarked: marked.has(c.id) }));
};

/** Fetches a single course by its UUID. Throws if not found. */
export const getCourseById = async (id: string) => {
    // Ids come from the URL; anything that is not a UUID cannot be a course
    if (!isUuid(id)) return null;
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
    .from('courses')
    .select()
    .eq('id', id);

    if (error || !data) {
        throw new Error(error?.message || 'Failed to fetch course');
    }

    return data[0];
}

// ─── Session History ──────────────────────────────────────────────────────────

/**
 * Records (or updates) a session history entry for the given course.
 * Uses upsert so repeated visits only refresh the timestamp.
 */
export const addToSessionHistory = async (courseId: string) => {
  const userId = await currentUserId();
  if (!userId || !isUuid(courseId)) return null;
  const supabase = createSupabaseClient();

  // Confirm the course exists before inserting the history row
  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!course) {
    throw new Error(
      `addToSessionHistory: unknown courseId (${courseId})`
    );
  }

  const { data, error } = await supabase
    .from("session_history")
    .upsert(
      {
        course_id: courseId,
        user_id: userId,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id, course_id",
      }
    )
    .select("id");

  if (error) {
    if ((error as PostgrestError)?.code === "23503") {
      throw new Error(
        `Foreign key failed: course_id (${courseId}) not found in courses.`
      );
    }
    throw new Error(error.message);
  }
  return data;
};

/** Returns the session history for a specific user (for the profile page). */
export const getUserSessions = async (userId: string, limit = 10) => {
    // Only your own history, whatever id a caller passes in
    if (userId !== (await currentUserId())) return [];
    const supabase = createSupabaseClient();
    const {data, error} = await supabase
    .from('session_history')
    .select(`courses:course_id (*)`)
    .eq('user_id', userId)
    .order('created_at', {ascending: false})
    .limit(limit)

    if(error){
        throw new Error(error.message)
    }
    // Cast is safe: Supabase returns a single course object per row for this many-to-one join
    return uniqueCourses(data.map(({ courses }) => courses as unknown as Course | null));
}

/**
 * When the user had lessons since `since` (for the home page's week row).
 * session_history keeps one row per course with its latest time, so a course
 * repeated on several days counts for the last of them.
 */
export const getLessonTimes = async (userId: string, since: Date) => {
    if (userId !== (await currentUserId())) return [];
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
    .from('session_history')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString());

    if (error) return [];
    return data.map(({ created_at }) => created_at as string);
}

/** Drops missing (deleted) courses and keeps only the first row per course id. */
const uniqueCourses = (rows: (Course | null)[]) => {
    const seen = new Set<string>();
    return rows.filter((course): course is Course => {
        if (!course || seen.has(course.id)) return false;
        seen.add(course.id);
        return true;
    });
}

/** Returns all courses created by the given user. */
export const getUserCourses = async (userId: string) => {
    if (userId !== (await currentUserId())) return [];
    const supabase = createSupabaseClient();
    const {data, error} = await supabase
    .from('courses')
    .select()
    .eq('author', userId)

    if(error){
        throw new Error(error.message)
    }
    return data;
}

/* export const newCoursePermissions = async () => {
    const { userId, has } = await auth();
    const supabase = createSupabaseClient();

    let limit = 0;

    if(has({ plan: 'pro' })) {
        return true;
    } else if(has({ feature: "3_course_limit" })) {
        limit = 3;
    } else if(has({ feature: "10_course_limit" })) {
        limit = 10;
    }

    const { data, error } = await supabase
        .from('courses')
        .select('id', { count: 'exact' })
        .eq('author', userId)

    if(error) throw new Error(error.message);

    const courseCount = data?.length;

    if(courseCount >= limit) {
        return false
    } else {
        return true;
    }
} */

// ─── Bookmarks ────────────────────────────────────────────────────────────────

/**
 * Adds a bookmark for the current user.
 * Silently ignores duplicate key errors (idempotent).
 */
export const addBookmark = async (courseId: string, path: string) => {
  const userId = await currentUserId();
  if (!userId || !isUuid(courseId)) return;

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({ course_id: courseId, user_id: userId });

  if (error && !/duplicate key value/.test(error.message)) {
    throw new Error(error.message);
  }

  const safePath = safeAppPath(path);
  if (safePath) revalidatePath(safePath);
  return data;
};

/** Removes the bookmark for the current user and revalidates the given path. */
export const removeBookmark = async (courseId: string, path: string) => {
  const userId = await currentUserId();
  if (!userId || !isUuid(courseId)) return;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("course_id", courseId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  const safePath = safeAppPath(path);
  if (safePath) revalidatePath(safePath);
  return data;
};

/** Returns all courses bookmarked by the given user (for the profile page). */
export const getBookmarkedCourses = async (userId: string) => {
  if (userId !== (await currentUserId())) return [];
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .select(`courses:course_id (*)`)
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  // Cast is safe: Supabase returns a single course object per row for this many-to-one join
  return data.map(({ courses }) => courses as unknown as Course);
};
