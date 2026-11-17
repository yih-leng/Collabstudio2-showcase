import { isSupabaseConfigured } from '../supabase/config';

/**
 * Local demo: with no Supabase keys, `npm run dev` gives a working admin that
 * saves to a file on this computer (.demo/), so the whole flow can be tried
 * before Supabase is set up. Off in production builds, where the site stays
 * read-only on the sample projects until Supabase is connected.
 */
export const isDemoMode =
  !isSupabaseConfigured &&
  (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === '1');

/** The demo admin login. Local only: it never applies once Supabase is connected. */
export const DEMO_EMAIL = 'admin@collabstudio.test';
export const DEMO_PASSWORD = 'demo1234';
export const DEMO_USER = { id: 'demo-admin', email: DEMO_EMAIL };
export const DEMO_COOKIE = 'collabstudio_demo';
