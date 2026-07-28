import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server Component / Server Action / Route Handler client.
// Uses the anon key + the caller's cookies, so RLS policies apply
// exactly as they would for a logged-in browser session.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (not an action/route handler);
            // safe to ignore since middleware refreshes the session cookie.
          }
        },
      },
    }
  );
}
