'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@collabrium/ui';
import { useReducedMotion } from '@collabrium/ui/motion';
import { STATUS_LABEL, toBackgroundEmbedUrl } from '@/lib/format';
import type { Media, ProjectCardData } from '@/lib/types';
import { MediaFrame } from './MediaFrame';
import { useInView } from './useInView';
import styles from './WorkBento.module.css';

// Tile shapes, as width over height. Tiles in a row share a height.
const FULL = 2.5;
const WIDE = 16 / 11;
const SQUARE = 1;
const PORTRAIT = 4 / 5;
// Tiles in a row come in this far apart (ms), left to right, as you scroll.
const STAGGER = 90;
// When the page opens, the tiles already on screen wait for the header and the
// filter bar to arrive (OPENING_MS), then come in one by one, ONE_BY_ONE apart.
const OPENING_MS = 440;
const ONE_BY_ONE = 120;
// A tile with a video plays its first few seconds, over and over.
const PREVIEW_SECONDS = 5;
// Tiles start loading their picture this far before they scroll into view.
const PRELOAD = '400px 0px';

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
 * page's work slider. Tiles load as they near the screen and fade in one by
 * one as they arrive. On phones the tiles stack, with the details showing.
 * TODO(design-system: no bento or media grid).
 */
export function WorkBento({ projects }: { projects: ProjectCardData[] }) {
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = performance.now();
  }, []);
  let index = 0;
  return (
    <div className={styles.bento}>
      {toRows(projects).map(({ shape, items }) => (
        <div
          key={items[0].id}
          className={styles.row}
          style={{ gridTemplateColumns: shape.map((r) => `minmax(0, ${r}fr)`).join(' ') }}
        >
          {items.map((p, k) => (
            <Tile
              key={p.id}
              project={p}
              ratio={shape[k]}
              full={shape.length === 1}
              order={k}
              index={index++}
              openedAt={openedAt}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Whether the element has come near the screen (once), and then into it (once).
 * `onArrive` runs as it comes into the screen, in the same update.
 */
function useArrival<T extends Element>(onArrive: () => void) {
  const ref = useRef<T>(null);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;
  const [near, setNear] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const watch = (margin: string, done: () => void) => {
      const io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          done();
          io.disconnect();
        },
        { rootMargin: margin },
      );
      io.observe(el);
      return io;
    };
    const a = watch(PRELOAD, () => setNear(true));
    const b = watch('0px 0px -8% 0px', () => {
      arrive.current();
      setShown(true);
    });
    return () => {
      a.disconnect();
      b.disconnect();
    };
  }, []);
  return { ref, near, shown };
}

function Tile({
  project,
  ratio,
  full,
  order,
  index,
  openedAt,
}: {
  project: ProjectCardData;
  ratio: number;
  full: boolean;
  /** Place in its row. */
  order: number;
  /** Place on the page. */
  index: number;
  openedAt: React.RefObject<number>;
}) {
  const router = useRouter();
  // The picture only loads as the tile nears the screen, and the tile fades in
  // once it's on it: one by one after the header and filters when the page
  // opens, or a beat after the tile to its left when scrolled to later.
  const [delay, setDelay] = useState(0);
  const { ref, near, shown } = useArrival<HTMLElement>(() => {
    const opening = performance.now() - openedAt.current < OPENING_MS;
    setDelay(opening ? OPENING_MS + index * ONE_BY_ONE : order * STAGGER);
  });
  const href = `/work/${project.slug}`;
  const clients = project.clients.map((c) => c.name).join(' × ');
  const status = project.status === 'live' ? null : STATUS_LABEL[project.status];

  return (
    <article
      ref={ref}
      className={styles.tile}
      data-full={full || undefined}
      data-shown={shown || undefined}
      style={{ aspectRatio: ratio, '--r': ratio, '--delay': `${delay}ms` } as React.CSSProperties}
      onPointerEnter={() => router.prefetch(href)}
    >
      <span className={styles.media}>
        {near && <MediaFrame media={project.cover} mode="thumb" fill placeholderLabel="" />}
        {near && project.preview && <Preview media={project.preview} title={project.title} />}
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

/**
 * A project's clip, playing silently over its cover while the tile is on
 * screen: an uploaded video loops its first PREVIEW_SECONDS; a YouTube or
 * Vimeo link plays muted from the start. It shows only once it is playing, so
 * the cover stays until then, and rests off screen and under reduced motion.
 */
function Preview({ media, title }: { media: Media; title: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const visible = useInView(box);
  const reduce = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const on = visible && !reduce;
  const embed = media.kind === 'embed' ? toBackgroundEmbedUrl(media.url) : null;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (on) void v.play().catch(() => {});
    else v.pause();
  }, [on]);

  useEffect(() => {
    if (!on) setPlaying(false);
  }, [on]);

  return (
    <span ref={box} className={styles.preview} data-playing={(on && playing) || undefined} aria-hidden>
      {media.kind === 'video' ? (
        <video
          ref={video}
          src={media.url}
          muted
          playsInline
          preload="metadata"
          disablePictureInPicture
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime >= PREVIEW_SECONDS) e.currentTarget.currentTime = 0;
          }}
          // A clip shorter than that just loops whole.
          loop
        />
      ) : (
        embed &&
        on && <iframe src={embed} title={title} tabIndex={-1} allow="autoplay; encrypted-media" onLoad={() => setPlaying(true)} />
      )}
    </span>
  );
}
