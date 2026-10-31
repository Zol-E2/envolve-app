import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase with the service role key: bypasses row level security, so it is
 * used in exactly one place, the automatic content check of new courses
 * (lib/moderation.ts), which only ever changes a course's visibility.
 * Everything else, admin pages included, uses the signed-in user's client
 * (lib/supabase.ts) and the database policies.
 *
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not set: new courses then
 * simply wait in review for an admin.
 */
export const createServiceClient = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};
