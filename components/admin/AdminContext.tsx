'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { EmptyState } from '@collabrium/ui';
import { Database, LockKey } from '@phosphor-icons/react';
import { getBrowserClient } from '@/lib/supabase/browser';
import { isDemoMode } from '@/lib/demo/config';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Lists } from '@/lib/types';
import styles from './admin.module.css';
import { FileDropFix } from './FileDropFix';

interface AdminCtx {
  sb: SupabaseClient;
  user: User;
  lists: Lists;
  refreshLists: () => Promise<void>;
  unread: number;
  refreshUnread: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdmin must be used inside AdminProvider');
  return v;
}

type Gate = 'loading' | 'unconfigured' | 'not-admin' | 'ready';

/** Checks the session and admin rights once, then gives every admin page the client and the lists. */
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // The client is created in the browser only, so the server and first client render agree.
  const [sb, setSb] = useState<SupabaseClient | null>(null);
  const [gate, setGate] = useState<Gate>(isSupabaseConfigured || isDemoMode ? 'loading' : 'unconfigured');
  const [user, setUser] = useState<User | null>(null);
  const [lists, setLists] = useState<Lists>({ clients: [], categories: [], tags: [] });
  const [unread, setUnread] = useState(0);

  const refreshLists = useCallback(async () => {
    if (!sb) return;
    const [c, cat, t] = await Promise.all([
      sb.from('clients').select('*').order('sort_order').order('name'),
      sb.from('categories').select('*').order('sort_order').order('name'),
      sb.from('tags').select('*').order('sort_order').order('name'),
    ]);
    setLists({ clients: c.data ?? [], categories: cat.data ?? [], tags: t.data ?? [] });
  }, [sb]);

  const refreshUnread = useCallback(async () => {
    if (!sb) return;
    const { count } = await sb.from('enquiries').select('id', { count: 'exact', head: true }).eq('is_read', false);
    setUnread(count ?? 0);
  }, [sb]);

  const signOut = useCallback(async () => {
    await sb?.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }, [sb, router]);

  useEffect(() => {
    setSb(getBrowserClient());
  }, []);

  useEffect(() => {
    if (!sb) return;
    setGate('loading');
    (async () => {
      const { data } = await sb.auth.getUser();
      if (!data.user) {
        router.replace('/admin/login');
        return;
      }
      setUser(data.user);
      const { data: admin } = await sb.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
      if (!admin) {
        setGate('not-admin');
        return;
      }
      await Promise.all([refreshLists(), refreshUnread()]);
      setGate('ready');
    })();
  }, [sb, router, refreshLists, refreshUnread]);

  if (gate === 'unconfigured') {
    return (
      <EmptyState variant="fullpage" icon={Database} heading="Connect Supabase to start editing">
        The site is showing its built-in sample projects. Add your Supabase keys to .env.local (see the README),
        restart the server, and the admin opens here.
      </EmptyState>
    );
  }
  if (gate === 'loading') {
    return (
      <div className={styles.center} aria-busy="true">
        Opening the admin…
      </div>
    );
  }
  if (gate === 'not-admin') {
    return (
      <EmptyState
        variant="fullpage"
        icon={LockKey}
        heading="This account can't edit yet"
        primaryAction={{ label: 'Log out', onClick: signOut }}
      >
        {user?.email} is signed in but isn&apos;t on the admin list. Ask an admin to add you (README: &quot;Add an admin&quot;).
      </EmptyState>
    );
  }

  return (
    <Ctx.Provider value={{ sb: sb!, user: user!, lists, refreshLists, unread, refreshUnread, signOut }}>
      <FileDropFix />
      {children}
    </Ctx.Provider>
  );
}
