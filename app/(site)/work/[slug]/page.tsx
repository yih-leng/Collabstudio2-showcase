import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProjectDetail } from '@/lib/data';
import { ProjectView } from './ProjectView';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProjectDetail((await params).slug);
  return project ? { title: project.title, description: project.one_liner ?? undefined } : {};
}

export default async function ProjectPage({ params }: Props) {
  const project = await getProjectDetail((await params).slug);
  if (!project) notFound();
  return <ProjectView project={project} />;
}
