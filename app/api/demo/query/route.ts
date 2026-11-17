import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo/config';
import type { QuerySpec } from '@/lib/demo/query';
import { isDemoAdmin } from '@/lib/demo/server';
import { runQuery } from '@/lib/demo/store';

// Local demo only: runs a query from the admin or the enquiry form.
export async function POST(request: Request) {
  if (!isDemoMode) return new NextResponse(null, { status: 404 });
  const spec = (await request.json()) as QuerySpec;
  return NextResponse.json(runQuery(spec, await isDemoAdmin()));
}
