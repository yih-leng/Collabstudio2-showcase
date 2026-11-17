import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getDemoServerClient } from '../demo/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

/**
 * A server client that carries the visitor's session cookie, so row-level
 * security decides what they see: the public sees published work, a signed-in
 * admin also sees drafts and internal projects (that is how Preview works).
 * Without Supabase it reads the local demo data (or the sample projects).
 */
export async function getServerClient(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) return getDemoServerClient();
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes the session instead.
        }
      },
    },
  });
}
