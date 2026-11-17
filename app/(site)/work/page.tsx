import type { Metadata } from 'next';
import { getLists, getPublishedProjects } from '@/lib/data';
import { WorkView } from './WorkView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Our Works' };

export default async function WorkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const [projects, lists, params] = await Promise.all([getPublishedProjects(), getLists(), searchParams]);
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) query.set(k, Array.isArray(v) ? v.join(',') : v);
  return <WorkView projects={projects} lists={lists} initialQuery={query.toString()} />;
}
