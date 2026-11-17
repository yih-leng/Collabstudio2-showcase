'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@collabrium/ui';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { Media } from '@/lib/types';
import { MediaFrame } from './MediaFrame';
import styles from './HeroCarousel.module.css';

/**
 * The top of a project page: the hero first, then every other deliverable, in
 * one fixed 16:9 stage. Each piece is fitted inside it (tall ones sit on a
 * blurred copy of themselves), with arrows and a thumbnail strip to step through.
 * TODO(design-system: no media carousel; built from Button and tokens).
 */
export function HeroCarousel({ items, title }: { items: Media[]; title: string }) {
  const [index, setIndex] = useState(0);
  const stripRef = useRef<HTMLOListElement>(null);
  const count = items.length;
  const go = (i: number) => setIndex(((i % count) + count) % count);

  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.children[index] as HTMLElement | undefined;
    if (strip && el) strip.scrollTo({ left: el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
  }, [index]);

  if (!count) {
    return (
      <div className={styles.stage}>
        <MediaFrame media={null} fill placeholderLabel="Hero video or image coming soon" />
      </div>
    );
  }

  const current = items[index];
  return (
    <section className={styles.carousel} aria-roledescription="carousel" aria-label={`${title}: deliverables`}>
      <div
        className={styles.stage}
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${count}${current.caption ? `: ${current.caption}` : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(index + 1);
          if (e.key === 'ArrowLeft') go(index - 1);
        }}
      >
        {current.kind === 'image' && <img key={`bg-${current.id}`} className={styles.backdrop} src={current.url} alt="" aria-hidden />}
        <div className={styles.media} key={current.id}>
          <MediaFrame media={{ ...current, caption: current.caption ?? title }} fit="contain" fill />
        </div>
        {count > 1 && (
          <>
            <span className={styles.prev}>
              <Button variant="secondary" iconOnly icon={CaretLeft} aria-label="Previous deliverable" onClick={() => go(index - 1)} />
            </span>
            <span className={styles.next}>
              <Button variant="secondary" iconOnly icon={CaretRight} aria-label="Next deliverable" onClick={() => go(index + 1)} />
            </span>
            <span className={styles.counter} aria-hidden>
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ol className={styles.strip} ref={stripRef} aria-label="Choose a deliverable">
          {items.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                className={styles.thumb}
                data-active={i === index || undefined}
                aria-current={i === index ? 'true' : undefined}
                aria-label={`Show ${i + 1} of ${count}${m.caption ? `: ${m.caption}` : ''}`}
                onClick={() => go(i)}
              >
                <MediaFrame media={m} aspect="16:9" mode="thumb" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
