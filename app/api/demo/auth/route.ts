import { NextResponse } from 'next/server';
import { DEMO_COOKIE, DEMO_EMAIL, DEMO_PASSWORD, DEMO_USER, isDemoMode } from '@/lib/demo/config';
import { isDemoAdmin } from '@/lib/demo/server';

// Local demo only: sign the demo admin in and out with a cookie.

export async function GET() {
  if (!isDemoMode) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ user: (await isDemoAdmin()) ? DEMO_USER : null });
}

export async function POST(request: Request) {
  if (!isDemoMode) return new NextResponse(null, { status: 404 });
  const { email, password } = (await request.json()) as { email?: string; password?: string };
  if (email?.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: { message: 'Invalid login credentials' } });
  }
  const res = NextResponse.json({ error: null });
  res.cookies.set(DEMO_COOKIE, 'admin', { httpOnly: true, sameSite: 'lax', path: '/' });
  return res;
}

export async function DELETE() {
  if (!isDemoMode) return new NextResponse(null, { status: 404 });
  const res = NextResponse.json({ error: null });
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
