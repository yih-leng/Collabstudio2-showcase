import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { DEMO_COOKIE, isDemoMode } from './config';
import { DemoQuery } from './query';
import { runQuery } from './store';

/** True when the demo admin is signed in on this browser. */
export async function isDemoAdmin() {
  if (!isDemoMode) return false;
  return (await cookies()).get(DEMO_COOKIE)?.value === 'admin';
}

/** Server reads without Supabase: the demo file locally, the sample projects in production. */
export async function getDemoServerClient(): Promise<SupabaseClient> {
  const admin = await isDemoAdmin();
  const client = { from: (table: string) => new DemoQuery(table, async (spec) => runQuery(spec, admin)) };
  return client as unknown as SupabaseClient;
}
