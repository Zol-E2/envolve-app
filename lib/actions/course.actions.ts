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