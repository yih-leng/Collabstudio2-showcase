'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, InfoBanner, InputField } from '@collabrium/ui';
import { getBrowserClient } from '@/lib/supabase/browser';
import { DEMO_EMAIL, DEMO_PASSWORD, isDemoMode } from '@/lib/demo/config';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import styles from './login.module.css';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(isDemoMode ? DEMO_EMAIL : '');
  const [password, setPassword] = useState(isDemoMode ? DEMO_PASSWORD : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getBrowserClient();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError("That email and password don't match an admin account.");
      return;
    }
    const next = params.get('next');
    router.replace(next && next.startsWith('/admin') ? next : '/admin');
    router.refresh();
  };

  return (
    <main className={styles.page}>
      <div className={styles.box}>
        <img src="/brand/collabStudio.svg" alt="CollabStudio" className={styles.logo} />
        <Card>
          <form className={styles.form} onSubmit={submit}>
            <h1 className={styles.title}>Sign in to the admin</h1>
            {isDemoMode ? (
              <InfoBanner tone="info">
                Local demo: sign in with {DEMO_EMAIL} and password {DEMO_PASSWORD}. Changes save on this computer only.
              </InfoBanner>
            ) : (
              !isSupabaseConfigured && (
                <InfoBanner tone="warning">Supabase isn&apos;t connected yet. Add your keys to .env.local first.</InfoBanner>
              )
            )}
            {error && <InfoBanner tone="danger">{error}</InfoBanner>}
            <InputField
              label="Email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <InputField
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button variant="primary" type="submit" loading={busy} disabled={!isSupabaseConfigured && !isDemoMode}>
              Sign in
            </Button>
          </form>
        </Card>
        <p className={styles.note}>
          {isDemoMode ? 'Once Supabase is connected, admins are added there.' : "Admins are added in Supabase. There's no public sign-up."}
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
