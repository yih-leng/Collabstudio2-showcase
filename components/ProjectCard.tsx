'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Tag } from '@collabrium/ui';
import { Info, Star } from '@phosphor-icons/react';
import type { ProjectCardData } from '@/lib/types';
import { MediaFrame } from './MediaFrame';
import styles from './ProjectCard.module.css';

/**
 * A project tile: the cover runs to the card's edges, with the title, client
 * and tags below. Our own card (the design system's Card has no edge-to-edge
 * option), matching its border, radius, shadow, hover and focus halo; the
 * title's link stretches over the whole card.
 * TODO(design-system: Card with a full-bleed media slot).
 */
export function ProjectCard({ project, headingLevel = 3 }: { project: ProjectCardData; headingLevel?: 2 | 3 | 4 }) {
  const router = useRouter();
  const href = `/work/${project.slug}`;
  const clientNames = project.clients.map((c) => c.name).join(', ');
  const Heading = `h${headingLevel}` as const;

  return (
    <div className={styles.reveal}>
      <article className={styles.card}>
        <div className={styles.media}>
          <MediaFrame media={project.cover} aspect="16:9" mode="thumb" />
          {project.status === 'in_progress' && (
            <span className={styles.wip}>
              <Info weight="fill" aria-hidden />
              In progress · subject to change
            </span>
          )}
        </div>
        <div className={styles.body}>
          <Heading className={styles.title}>
            {/* Starts loading the page as soon as the pointer or focus arrives. */}
            <Link href={href} className={styles.link} onPointerEnter={() => router.prefetch(href)}>
              {project.title}
            </Link>
          </Heading>
          <div className={styles.client}>
            {clientNames}
            {project.year ? ` · ${project.year}` : ''}
          </div>
          {(project.featured || project.categories.length > 0) && (
            <div className={styles.meta}>
              {project.featured && (
                <Badge variant="selected" icon={Star}>
                  Featured
                </Badge>
              )}
              {project.categories.map((c) => (
                <Tag key={c.id} variant="neutral">
                  {c.name}
                </Tag>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
