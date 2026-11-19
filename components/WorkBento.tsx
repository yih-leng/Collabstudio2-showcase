'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@collabrium/ui';
import { STATUS_LABEL } from '@/lib/format';
import type { ProjectCardData } from '@/lib/types';
import { MediaFrame } from './MediaFrame';
import styles from './WorkBento.module.css';

// Tile shapes, as width over height. Tiles in a row share a height.
const FULL = 2.5;
const WIDE = 16 / 11;
const SQUARE = 1;
const PORTRAIT = 4 / 5;
// After the full-width first project, rows go round these shapes.
const SHAPES = [
  [WIDE, SQUARE],
  [SQUARE, WIDE],
  [PORTRAIT, PORTRAIT, PORTRAIT],
];

/** Splits the projects into rows: the first full width, then the shapes in turn. */
function toRows(projects: ProjectCardData[]) {
  const rows: { shape: number[]; items: ProjectCardData[] }[] = [];
  if (!projects.length) return rows;
  rows.push({ shape: [FULL], items: projects.slice(0, 1) });
  let i = 1;
  for (let s = 0; i < projects.length; s++) {
    let shape = SHAPES[s % SHAPES.length];
    const left = projects.length - i;
    // Too few left for this shape: one gets a full-width tile, two a wide and a square.
    if (left < shape.length) shape = left === 1 ? [FULL] : [WIDE, SQUARE];
    rows.push({ shape, items: projects.slice(i, i + shape.length) });
    i += shape.length;
  }
  return rows;
}

/**
 * Our Works as a bento grid: full-width images in rows of different shapes. At
 * rest a tile shows its title and project type; pointing at it brings in the
 * client, year, one-liner, status and View project, placed as on the home
 * page's work slider. On phones the tiles stack, with the details showing.
 * TODO(design-system: no bento or media grid).
 */
export function WorkBento({ projects }: { projects: ProjectCardData[] }) {
  return (
    <div className={styles.bento}>
      {toRows(projects).map(({ shape, items }) => (
        <div
          key={items[0].id}
          className={styles.row}
          style={{ gridTemplateColumns: shape.map((r) => `minmax(0, ${r}fr)`).join(' ') }}
        >
          {items.map((p, k) => (
            <Tile key={p.id} project={p} ratio={shape[k]} full={shape.length === 1} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Tile({ project, ratio, full }: { project: ProjectCardData; ratio: number; full: boolean }) {
  const router = useRouter();
  const href = `/work/${project.slug}`;
  const clients = project.clients.map((c) => c.name).join(' × ');
  const status = project.status === 'live' ? null : STATUS_LABEL[project.status];

  return (
    <article
      className={styles.tile}
      data-full={full || undefined}
      style={{ aspectRatio: ratio }}
      onPointerEnter={() => router.prefetch(href)}
    >
      <span className={styles.media}>
        <MediaFrame media={project.cover} mode="thumb" fill placeholderLabel="" />
      </span>
      <span className={`${styles.shade} ${styles.rest}`} aria-hidden />
      <span className={`${styles.shade} ${styles.open}`} aria-hidden />
      {/* Clicking anywhere on the tile opens it; the View project button is the
          way in for keyboards and screen readers. */}
      <Link href={href} className={styles.link} tabIndex={-1} aria-hidden />
      <div className={styles.info}>
        <div className={`${styles.top} ${styles.later}`}>
          <span className={styles.client}>
            {clients}
            {project.year && <small>{project.year}</small>}
          </span>
          {project.one_liner && <p className={styles.line}>{project.one_liner}</p>}
        </div>
        <div className={styles.bottom}>
          <div>
            <h2 className={styles.title}>{project.title}</h2>
            {(project.categories.length > 0 || status) && (
              <span className={styles.tags}>
                {project.categories.map((c) => (
                  <span key={c.id} className={styles.tag}>
                    {c.name}
                  </span>
                ))}
                {status && <span className={`${styles.tag} ${styles.later}`}>{status}</span>}
              </span>
            )}
          </div>
          <span className={`${styles.view} ${styles.later}`}>
            <Button variant="secondary" size="sm" onClick={() => router.push(href)} aria-label={`View project: ${project.title}`}>
              View project
            </Button>
          </span>
        </div>
      </div>
    </article>
  );
}
