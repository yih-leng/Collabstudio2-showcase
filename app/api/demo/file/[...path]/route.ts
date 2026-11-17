import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo/config';
import { DEMO_DIR } from '@/lib/demo/store';

// Local demo only: serves uploaded files, with range support so videos can seek.
const ROOT = path.join(DEMO_DIR, 'uploads');
const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
};

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!isDemoMode) return new NextResponse(null, { status: 404 });
  const full = path.resolve(ROOT, ...(await params).path);
  if (!full.startsWith(ROOT + path.sep) || !existsSync(full)) return new NextResponse(null, { status: 404 });

  const size = statSync(full).size;
  const type = TYPES[path.extname(full).toLowerCase()] ?? 'application/octet-stream';
  const range = request.headers.get('range')?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    const body = Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream;
    return new NextResponse(body, {
      status: 206,
      headers: { 'content-type': type, 'content-length': String(end - start + 1), 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes' },
    });
  }
  const body = Readable.toWeb(createReadStream(full)) as ReadableStream;
  return new NextResponse(body, { headers: { 'content-type': type, 'content-length': String(size), 'accept-ranges': 'bytes' } });
}
