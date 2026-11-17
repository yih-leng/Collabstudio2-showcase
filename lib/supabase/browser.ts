'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDemoBrowserClient } from '../demo/client';
import { isDemoMode } from '../demo/config';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

let client: SupabaseClient | null = null;

/** The browser client: Supabase, or the local demo. Null when neither is available. */
export function getBrowserClient(): SupabaseClient | null {
  if (client) return client;
  if (isSupabaseConfigured) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  else if (isDemoMode) client = createDemoBrowserClient();
  return client;
}
