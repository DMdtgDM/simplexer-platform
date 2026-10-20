import { createClient } from '@supabase/supabase-js';

// Cookie-free client for public content (grades, subjects, courses...).
// Because it never reads cookies, pages using it can be cached and served instantly.
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
