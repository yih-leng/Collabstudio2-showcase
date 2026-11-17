import 'server-only';
import { isDemoMode } from './demo/config';
import { isDemoAdmin } from './demo/server';
import { isSupabaseConfigured } from './supabase/config';
import { getServerClient } from './supabase/server';

/** True when the request comes from a signed-in admin (Supabase, or the local demo login). */
export async function isRequestAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured) return isDemoMode && (await isDemoAdmin());
  const sb = await getServerClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return false;
  const { data: row } = await sb.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
  return Boolean(row);
}
