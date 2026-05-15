'use server';

import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// ─── Course CRUD ──────────────────────────────────────────────────────────────

/** Creates a new course row owned by the currently authenticated user. */
export const createCourse = async (formData: CreateCourse) => {
    const { userId: author } = await auth();
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
    .from('courses')
    .insert({...formData, author })
    .select();

    if (error || !data) {
        throw new Error(error?.message || 'Failed to create course');
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

  let query = supabase.from("courses").select();

  if (subject && topic) {
    query = query
      .ilike("subject", `%${subject}%`)
      .or(`topic.ilike.%${topic}%, name.ilike.%${topic}%`);
  } else if (subject) {
    query = query.ilike("subject", `%${subject}%`);
  } else if (topic) {
    query = query.or(`topic.ilike.%${topic}%, name.ilike.%${topic}%`);
  }

  query = query.range((page - 1) * limit, page * limit - 1);

  const { data: courses, error } = await query;
  if (error || !courses) {
    throw new Error(error?.message || "Failed to fetch courses");
  }

  const { userId } = await auth();
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
  const { userId } = await auth();
  if (!userId || !courseId) return null;
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

/** Returns the most recent sessions across all users (for the home page). */
export const getRecentSessions = async (limit = 10) => {
    const supabase = createSupabaseClient();
    const {data, error} = await supabase
    .from('session_history')
    .select(`courses:course_id (*)`)
    .order('created_at', {ascending: false})
    .limit(limit)

    if(error){
        throw new Error(error.message)
    }
    // Cast is safe: Supabase returns a single course object per row for this many-to-one join
    return data.map(({ courses }) => courses as unknown as Course);
}

/** Returns the session history for a specific user (for the profile page). */
export const getUserSessions = async (userId: string, limit = 10) => {
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
    return data.map(({ courses }) => courses as unknown as Course);
}

/** Returns all courses created by the given user. */
export const getUserCourses = async (userId: string) => {
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
  const { userId } = await auth();
  if (!userId) return;

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({ course_id: courseId, user_id: userId });

  if (error && !/duplicate key value/.test(error.message)) {
    throw new Error(error.message);
  }

  revalidatePath(path);
  return data;
};

/** Removes the bookmark for the current user and revalidates the given path. */
export const removeBookmark = async (courseId: string, path: string) => {
  const { userId } = await auth();
  if (!userId) return;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("course_id", courseId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(path);
  return data;
};

/** Returns all courses bookmarked by the given user (for the profile page). */
export const getBookmarkedCourses = async (userId: string) => {
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
