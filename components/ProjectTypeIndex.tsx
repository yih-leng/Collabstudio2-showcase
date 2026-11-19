'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@collabrium/ui';
import type { ProjectTypeSummary } from '@/lib/types';
import { MediaFrame } from './MediaFrame';
import styles from './ProjectTypeIndex.module.css';

const projects = (n: number) => `${n} ${n === 1 ? 'project' : 'projects'}`;

/**
 * The home page's project types: each type with how many published projects it
 * has, opening Our Works filtered to it. Two columns on wider screens, one under
 * the numbers on phones. Pointing at a type shows a preview of its work beside
 * the pointer (not on touch screens, which have no pointer to follow).
 */
export function ProjectTypeIndex({ types }: { types: ProjectTypeSummary[] }) {
  const [active, setActive] = useState<ProjectTypeSummary | null>(null);
  const preview = useRef<HTMLDivElement>(null);

  // Moved by hand rather than through state, so following the pointer never re-renders.
  const follow = (e: React.MouseEvent) => {
    const el = preview.current;
    if (!el) return;
    const x = Math.min(e.clientX, window.innerWidth - el.offsetWidth - 32);
    el.style.transform = `translate(${x + 20}px, ${e.clientY - el.offsetHeight / 2}px)`;
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
              onMouseEnter={() => setActive(t)}
              onFocus={() => setActive(null)}
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

      <div ref={preview} className={styles.preview} data-on={(active?.lead && true) || undefined} aria-hidden>
        {active?.lead && (
          <>
            <MediaFrame media={active.lead.cover} aspect="16:9" mode="thumb" placeholderLabel="" />
            <p className={styles.previewText}>
              <strong>{active.lead.title}</strong>
              {active.count > 1 ? ` and ${active.count - 1} more` : ''}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
