'use server';

import { auth } from "@clerk/nextjs/server"
import { createSupabaseClient } from "../supabase";

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

export const getAllCourses = async (
    { limit = 10, page = 1, subject, topic }: GetAllCourses) => {
    const supabase = createSupabaseClient();

    let query = supabase.from('courses').select();

    if (subject && subject) {
        query = query.ilike('subject', `%${subject}%`)
            .or(`topic.ilike.%${topic}%, name.ilike.%${topic}%`);
    }else if(subject){
        query = query.ilike('subject', `%${subject}%`);
    }else if(topic){
        query = query.or(`topic.ilike.%${topic}%, name.ilike.%${topic}%`);
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: courses, error } = await query;

    if (error || !courses) {
        throw new Error(error?.message || 'Failed to fetch courses');
    }

    return courses;
}

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
