'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@collabrium/ui';
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import type { Media } from '@/lib/types';
import { MediaFrame } from './MediaFrame';
import styles from './Gallery.module.css';

const KIND_LABEL: Record<Media['kind'], string> = { image: 'image', video: 'video', embed: 'video', audio: 'audio track' };

/**
 * Gallery: equal tiles in a grid (images, videos and audio alike). A tile
 * opens the piece on a full-screen black overlay, fitted inside one fixed
 * stage so stepping through never makes it jump; the count sits bottom centre.
 * TODO(design-system: no Lightbox component; built on a native <dialog> with tokens and DS Buttons.)
 */
export function Gallery({ items }: { items: Media[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = useCallback(() => dialogRef.current?.close(), []);
  const step = useCallback(
    (d: number) => setIndex((i) => (i === null ? i : (i + d + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClose = () => {
      setIndex((i) => {
        if (i !== null) triggerRefs.current[i]?.focus();
        return null;
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    dlg.addEventListener('close', onClose);
    dlg.addEventListener('keydown', onKey);
    return () => {
      dlg.removeEventListener('close', onClose);
      dlg.removeEventListener('keydown', onKey);
    };
  }, [step]);

  const current = index === null ? null : items[index];

  return (
    <>
      <ul className={styles.grid}>
        {items.map((m, i) => (
          <li key={m.id} className={styles.tile}>
            <button
              ref={(el) => {
                triggerRefs.current[i] = el;
              }}
              type="button"
              className={styles.open}
              onClick={() => open(i)}
              aria-label={`Open ${KIND_LABEL[m.kind]} ${i + 1} of ${items.length}${m.caption ? `: ${m.caption}` : ''}`}
            >
              <MediaFrame media={m} aspect="1:1" mode="thumb" />
            </button>
            {m.caption && m.kind !== 'audio' && <p className={styles.caption}>{m.caption}</p>}
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label="Media viewer"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        {current && (
          <div className={styles.viewer}>
            <span className={styles.close}>
              <Button variant="secondary" size="sm" iconOnly icon={X} aria-label="Close viewer" onClick={close} />
            </span>
            <div className={styles.stage}>
              {items.length > 1 && (
                <span className={styles.prev}>
                  <Button variant="secondary" iconOnly icon={CaretLeft} aria-label="Previous" onClick={() => step(-1)} />
                </span>
              )}
              <div className={styles.media}>
                <MediaFrame key={current.id} media={current} fit="contain" fill />
              </div>
              {items.length > 1 && (
                <span className={styles.next}>
                  <Button variant="secondary" iconOnly icon={CaretRight} aria-label="Next" onClick={() => step(1)} />
                </span>
              )}
            </div>
            <div className={styles.footer}>
              {current.caption && <p className={styles.viewerCaption}>{current.caption}</p>}
              {items.length > 1 && (
                <span className={styles.counter}>
                  {index! + 1} / {items.length}
                </span>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
