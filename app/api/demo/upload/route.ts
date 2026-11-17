import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo/config';
import { isDemoAdmin } from '@/lib/demo/server';
import { DEMO_DIR } from '@/lib/demo/store';

// Local demo only: the media bucket, as files in .demo/uploads.
const ROOT = path.join(DEMO_DIR, 'uploads');

/** Resolves a bucket path inside the uploads folder, or null if it tries to leave it. */
function resolve(p: string) {
  const full = path.resolve(ROOT, p);
  return full.startsWith(ROOT + path.sep) ? full : null;
}

export async function POST(request: Request) {
  if (!isDemoMode) return new NextResponse(null, { status: 404 });
  if (!(await isDemoAdmin())) return NextResponse.json({ error: { message: 'Sign in to upload.' } }, { status: 403 });

  if (new URL(request.url).searchParams.has('remove')) {
    const { paths } = (await request.json()) as { paths: string[] };
    for (const p of paths) {
      const full = resolve(p);
      if (full) rmSync(full, { force: true });
    }
    return NextResponse.json({ error: null });
  }

  const form = await request.formData();
  const file = form.get('file');
  const full = resolve(String(form.get('path') ?? ''));
  if (!(file instanceof File) || !full) return NextResponse.json({ error: { message: 'Nothing to upload.' } }, { status: 400 });
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ error: null });
}
