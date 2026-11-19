import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_COOKIE, isDemoMode } from './lib/demo/config';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './lib/supabase/config';

// Refreshes the Supabase session for signed-in people and keeps /admin behind the login
// (the demo login's cookie when Supabase isn't connected).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const isAdminArea = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
  const toLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  };

  if (!isSupabaseConfigured) {
    if (isDemoMode && isAdminArea && request.cookies.get(DEMO_COOKIE)?.value !== 'admin') return toLogin();
    return response;
  }

  // Visitors without a login have nothing to refresh or check, so their pages
  // skip the round trip to Supabase entirely.
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
  if (!hasSession) return isAdminArea ? toLogin() : response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims refreshes an expired session, then checks the login's signature
  // (on the server only when the project still uses the older shared secret),
  // which is far quicker than asking the auth server on every page.
  const { data } = await supabase.auth.getClaims();

  if (isAdminArea && !data?.claims) return toLogin();
  return response;
}

export const config = {
  // Not /api: the demo routes check the login themselves, and middleware would cut
  // request bodies (uploads) off at 10 MB.
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|brand/|seed/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)'],
};
