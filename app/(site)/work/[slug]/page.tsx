import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProjectDetail } from '@/lib/data';
import { toEmbedUrl } from '@/lib/format';
import type { Media } from '@/lib/types';
import { ProjectView } from './ProjectView';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProjectDetail((await params).slug);
  if (!project) return {};
  const description = project.one_liner ?? undefined;
  const image = previewImage(project.cover ?? project.hero);
  // The link preview: the project's cover, title and one-liner.
  return {
    title: project.title,
    description,
    openGraph: { type: 'article', title: project.title, description, ...(image ? { images: [{ url: image, alt: project.title }] } : {}) },
    twitter: { card: 'summary_large_image', title: project.title, description, ...(image ? { images: [image] } : {}) },
  };
}

/** A still for link previews: the image itself, or a video link's thumbnail. */
function previewImage(m: Media | null): string | null {
  if (!m) return null;
  if (m.kind === 'image') return m.url;
  if (m.kind === 'embed') {
    const drive = m.url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)?.[1];
    if (drive) return `https://drive.google.com/thumbnail?id=${drive}&sz=w1200`;
    const yt = toEmbedUrl(m.url)?.match(/youtube-nocookie\.com\/embed\/([\w-]+)/)?.[1];
    if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  }
  return null;
}

export default async function ProjectPage({ params }: Props) {
  const project = await getProjectDetail((await params).slug);
  if (!project) notFound();
  return <ProjectView project={project} />;
}
