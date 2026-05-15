import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * Creates an authenticated Supabase client scoped to the current Clerk session.
 * The `accessToken` callback injects the Clerk JWT so Supabase RLS policies
 * can identify the user via the `sub` claim.
 */
export const createSupabaseClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            async accessToken(){
                return ((await auth()).getToken());
            }
        }
    )
};
