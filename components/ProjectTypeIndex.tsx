'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@collabrium/ui';
import type { ProjectTypeSummary } from '@/lib/types';
import { MediaFrame } from './MediaFrame';
import styles from './ProjectTypeIndex.module.css';

const projects = (n: number) => `${n} ${n === 1 ? 'project' : 'projects'}`;
// How long each cover shows before the next, when a type has more than one.
const CYCLE_MS = 1400;

/**
 * The home page's project types: each type with how many published projects it
 * has, opening Our Works filtered to it. Two columns on wider screens, one under
 * the numbers on phones. Pointing at a type lights an AI glow that follows
 * the pointer along the row, and its covers show above the row, one after
 * another (not on touch screens, which have no pointer to follow).
 */
export function ProjectTypeIndex({ types }: { types: ProjectTypeSummary[] }) {
  const [active, setActive] = useState<ProjectTypeSummary | null>(null);
  const [shown, setShown] = useState(0);
  const preview = useRef<HTMLDivElement>(null);

  // Start each type on its first cover, then step through the rest.
  useEffect(() => {
    setShown(0);
    if (!active || active.covers.length < 2) return;
    const timer = window.setInterval(() => setShown((i) => (i + 1) % active.covers.length), CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [active]);

  // Both are set by hand rather than through state, so moving the pointer never
  // re-renders. The spotlight follows the pointer along the row; the covers sit
  // still just above the row, at its right end, so they never hide the row or
  // its glow (below it instead when there's no room above).
  const GAP = 12;
  const place = (row: HTMLElement) => {
    const el = preview.current;
    if (!el) return;
    const r = row.getBoundingClientRect();
    const x = Math.max(16, r.right - el.offsetWidth);
    const above = r.top - el.offsetHeight - GAP;
    const y = above >= 16 ? above : r.bottom + GAP;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const follow = (e: React.MouseEvent) => {
    const row = (e.target as HTMLElement).closest('a');
    if (!row) return;
    row.style.setProperty('--spot-x', `${e.clientX - row.getBoundingClientRect().left}px`);
    place(row);
  };

  return (
    <section aria-labelledby="types-heading" className={styles.section} onMouseMove={follow} onMouseLeave={() => setActive(null)}>
      {/* Read out everywhere; shown on phones only, where the list sits under the numbers. */}
      <h2 id="types-heading" className={styles.heading}>
        Projects by type
      </h2>
      <ul className={styles.list}>
        {types.map((t) => (
          <li key={t.id}>
            <Link
              href={`/work?category=${encodeURIComponent(t.id)}`}
              className={styles.row}
              aria-label={`${t.name}, ${projects(t.count)}`}
              onMouseEnter={(e) => {
                setActive(t);
                place(e.currentTarget);
              }}
            >
              <span className={styles.name}>{t.name}</span>
              <span className={styles.count}>
                <Badge variant="neutral">{String(t.count)}</Badge>
              </span>
              <span className={styles.go} aria-hidden>
                See the work →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div ref={preview} className={styles.preview} data-on={(active && active.covers.length > 0) || undefined} aria-hidden>
        {active?.covers.map((m, i) => (
          <div key={m.id} className={styles.slide} data-shown={i === shown || undefined}>
            <MediaFrame media={m} aspect="16:9" mode="thumb" placeholderLabel="" />
          </div>
        ))}
      </div>
    </section>
  );
}
