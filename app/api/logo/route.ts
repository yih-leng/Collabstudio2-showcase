import { NextResponse } from 'next/server';
import { findLogos } from '@/lib/logo-finder';
import { isRequestAdmin } from '@/lib/server-admin';

// Admin only: finds logo options for a client from a web address.
export async function POST(request: Request) {
  if (!(await isRequestAdmin())) return NextResponse.json({ error: 'Sign in as an admin first.' }, { status: 403 });
  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!url?.trim()) return NextResponse.json({ error: 'Paste the brand’s website or a link to its logo.' }, { status: 400 });
  try {
    const candidates = await findLogos(url);
    if (!candidates.length) return NextResponse.json({ error: 'No logo found there. Try the brand’s home page, or upload the file.' }, { status: 404 });
    return NextResponse.json({ candidates });
  } catch (e) {
    const message = (e as Error).name === 'TimeoutError' ? 'The site took too long to answer.' : (e as Error).message || 'Couldn’t reach that address.';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
