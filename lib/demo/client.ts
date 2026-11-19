'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { DemoQuery, type QueryResult, type QuerySpec } from './query';

// The browser side of the local demo: the same calls as the Supabase client,
// sent to the /api/demo routes, which keep the data in .demo/ on this computer.

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return res.json() as Promise<T>;
}

const exec = (spec: QuerySpec) => post<QueryResult>('/api/demo/query', spec);

export function createDemoBrowserClient(): SupabaseClient {
  const client = {
    from: (table: string) => new DemoQuery(table, exec),
    auth: {
      getUser: async () => {
        const res = await fetch('/api/demo/auth', { cache: 'no-store' });
        return { data: await res.json(), error: null };
      },
      // Supabase's getSession, in the same shape: the demo login's user, if any.
      getSession: async () => {
        const res = await fetch('/api/demo/auth', { cache: 'no-store' });
        const { user } = (await res.json()) as { user: unknown };
        return { data: { session: user ? { user } : null }, error: null };
      },
      signInWithPassword: (creds: { email: string; password: string }) =>
        post<{ error: { message: string } | null }>('/api/demo/auth', creds),
      signOut: async () => {
        await fetch('/api/demo/auth', { method: 'DELETE' });
        return { error: null };
      },
    },
    storage: {
      from: () => ({
        upload: async (path: string, file: File) => {
          const form = new FormData();
          form.set('path', path);
          form.set('file', file);
          const res = await fetch('/api/demo/upload', { method: 'POST', body: form });
          return res.json() as Promise<{ error: { message: string } | null }>;
        },
        remove: (paths: string[]) => post<{ error: null }>('/api/demo/upload?remove=1', { paths }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `/api/demo/file/${path}` } }),
      }),
    },
  };
  return client as unknown as SupabaseClient;
}
