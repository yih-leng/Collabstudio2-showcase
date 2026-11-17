import { NextResponse } from 'next/server';
import { detectEmbedAspect } from '@/lib/embed-aspect';
import { isRequestAdmin } from '@/lib/server-admin';

// Admin only: the shape (16:9, 9:16, 4:5, 1:1) of a YouTube, Vimeo or Drive link.
export async function POST(request: Request) {
  if (!(await isRequestAdmin())) return NextResponse.json({ error: 'Sign in as an admin first.' }, { status: 403 });
  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!url) return NextResponse.json({ aspect: null });
  return NextResponse.json({ aspect: await detectEmbedAspect(url) });
}
