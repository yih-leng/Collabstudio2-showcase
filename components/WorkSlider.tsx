'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@collabrium/ui';
import { useReducedMotion } from '@collabrium/ui/motion';
import { CaretLeft, CaretRight, FilmSlate } from '@phosphor-icons/react';
import { toBackgroundEmbedUrl } from '@/lib/format';
import type { ShowcaseSlide } from '@/lib/types';
import { MediaFrame } from './MediaFrame';
import { useInView } from './useInView';
import styles from './WorkSlider.module.css';

// How long the front card stays before the next comes forward. An uploaded video
// stays for its own length (within limits).
const IMAGE_MS = 6000;
const EMBED_MS = 14000;
const VIDEO_MIN_MS = 6000;
const VIDEO_MAX_MS = 30000;
// Each place back, a card is this much smaller than the one in front of it.
const STEP = 0.82;
// How much of each card tucks behind the one in front of it.
const TUCK = 0.22;
// Portrait cards: width over height.
const PORTRAIT = 0.72;
// How far a press has to move before it counts as a drag rather than a click.
const DRAG_PX = 5;

const pad = (n: number) => String(n).padStart(2, '0');
const href = (s: ShowcaseSlide) => (s.slug ? `/work/${s.slug}` : '/work');
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Where each card sits, from how many places it is behind the front one (d):
 * its left edge, width, scale (from its left edge) and opacity. The front card is
 * 16:9; the others are portrait, each STEP smaller and tucked TUCK behind the one
 * before. Fractional places (while dragging) fall between their neighbours.
 */
function makePlacer(h: number) {
  const wf = (h * 16) / 9;
  const wp = h * PORTRAIT;
  const scale = (d: number) => Math.pow(STEP, Math.max(d, 0));
  // Left edges at whole places.
  const xs = [0];
  for (let k = 1; k <= 6; k++) {
    const prevEnd = xs[k - 1] + (k === 1 ? wf : wp * scale(k - 1));
    xs.push(prevEnd - TUCK * wp * scale(k));
  }
  return (d: number) => {
    if (d < 0) {
      // Passed: slides off to the left, shrinking and fading.
      return { x: d * wf * 0.6, width: wf, scale: 1 + d * 0.15, opacity: Math.max(0, 1 + d * 1.4), dim: 0 };
    }
    const k = Math.min(Math.floor(d), 5);
    const t = d - k;
    const width = d < 1 ? lerp(wp, wf, ease(1 - d)) : wp;
    return {
      x: lerp(xs[k], xs[k + 1], t),
      width,
      scale: scale(d),
      // The fourth card back fades away as it goes further.
      opacity: d > 3 ? Math.max(0, 1 - (d - 3)) : 1,
      dim: Math.min(d * 0.12, 0.45),
    };
  };
}

/** Card height so the front card, two behind it and half of a third fill the row exactly. */
function fitHeight(rowWidth: number, phone: boolean) {
  if (phone) return (rowWidth * 0.8 * 9) / 16;
  const s = (d: number) => Math.pow(STEP, d);
  const perHeight = 16 / 9 + PORTRAIT * ((1 - TUCK) * (s(1) + s(2)) + (0.5 - TUCK) * s(3));
  return Math.min(rowWidth / perHeight, 640);
}

/**
 * The home page's work slider. The front project is a 16:9 card on the left; the
 * next ones wait to the right as portrait cards, each smaller and tucked behind
 * the one before, and a card widens into 16:9 as it reaches the front. About three
 * and a half fill the row, which runs to the window's right edge. It moves on by
 * itself (pausing while pointed at, focused or off screen), and can be
 * dragged, stepped with the arrows or arrow keys, or a card behind clicked to
 * bring it forward. It loops. The front card plays its video; pointing at any
 * card plays its video.
 * TODO(design-system: no media carousel; built from Button and motion tokens).
 */
export function WorkSlider({ slides }: { slides: ShowcaseSlide[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const count = slides.length;
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const visible = useInView(rootRef);
  const [pos, setPos] = useState(0); // the card at the front; fractional while dragging
  const [rowWidth, setRowWidth] = useState(0);
  const [phone, setPhone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  // Plays by itself, except under reduced motion.
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false); // pointer or keyboard focus inside: hold the card
  const [durations, setDurations] = useState<Record<string, number>>({});
  const drag = useRef<{ x: number; pos: number; moved: number } | null>(null);
  const moved = useRef(0);

  // Under reduced motion nothing moves on by itself; the person steps through.
  useEffect(() => {
    if (reduce) setPlaying(false);
  }, [reduce]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      setRowWidth(el.clientWidth);
      setPhone(window.matchMedia('(max-width: 768px)').matches);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Movement switches on after the first layout, so the cards appear in place.
    const id = requestAnimationFrame(() => setReady(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(id);
    };
  }, []);

  const go = useCallback((to: number) => setPos(Math.round(to)), []);
  const front = ((Math.round(pos) % count) + count) % count;
  const running = playing && !held && !dragging && visible && count > 1;

  const h = Math.round(fitHeight(rowWidth, phone));
  const placeAt = makePlacer(h);
  const step = (h * 16) / 9 - TUCK * h * PORTRAIT * STEP; // drag distance for one card

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, pos, moved: 0 };
    moved.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > DRAG_PX) {
      if (!dragging) {
        setDragging(true);
        setHovered(null);
        stageRef.current?.setPointerCapture(e.pointerId);
      }
      setPos(d.pos - dx / step);
    }
  };
  const endDrag = () => {
    const d = drag.current;
    if (!d) return;
    moved.current = d.moved;
    drag.current = null;
    if (dragging) {
      setDragging(false);
      setPos((p) => Math.round(p));
    }
  };

  if (!count) {
    return (
      <div className={styles.empty}>
        <FilmSlate weight="fill" aria-hidden />
        <span>Published work shows here.</span>
      </div>
    );
  }

  const current = slides[front];
  const durationFor = (s: ShowcaseSlide) =>
    durations[s.id] ?? (s.media?.kind === 'embed' && !s.still ? EMBED_MS : IMAGE_MS);

  return (
    <section
      ref={rootRef}
      className={styles.slider}
      aria-roledescription="carousel"
      aria-label="Featured work"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setHeld(false);
      }}
    >
      {count > 1 && (
        <div className={styles.arrows}>
          {/* TODO(design-system: Button's icon is fixed at 16px; these want a larger bare chevron). */}
          <button type="button" className={styles.arrow} aria-label="Previous project" onClick={() => go(pos - 1)}>
            <CaretLeft aria-hidden />
          </button>
          <button type="button" className={styles.arrow} aria-label="Next project" onClick={() => go(pos + 1)}>
            <CaretRight aria-hidden />
          </button>
        </div>
      )}

      <div
        ref={stageRef}
        className={styles.stage}
        style={{ height: h || undefined }}
        data-ready={(ready && !reduce) || undefined}
        data-dragging={dragging || undefined}
        tabIndex={0}
        aria-label="Projects. Drag, or use the arrow keys."
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            go(pos + 1);
            e.preventDefault();
          } else if (e.key === 'ArrowLeft') {
            go(pos - 1);
            e.preventDefault();
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        // A drag never counts as a click on the card under it.
        onClickCapture={(e) => {
          if (moved.current > DRAG_PX) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = 0;
          }
        }}
      >
        {rowWidth > 0 &&
          slides.map((s, i) => {
            let d = (((i - pos) % count) + count) % count;
            // With enough projects, the one just passed waits off to the left; with
            // only a few, they all wait to the right.
            if (count >= 5 && d > count - 2) d -= count;
            const p = placeAt(d);
            const isFront = Math.abs(d) < 0.5;
            return (
              <div
                key={s.id}
                className={styles.card}
                data-front={isFront || undefined}
                aria-hidden={!isFront}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}: ${s.title}`}
                style={
                  {
                    width: p.width,
                    height: h,
                    opacity: p.opacity,
                    zIndex: 100 - Math.round(Math.abs(d) * 10),
                    transform: `translateX(${p.x}px) scale(${p.scale})`,
                    pointerEvents: p.opacity < 0.05 ? 'none' : undefined,
                    '--dim': p.dim,
                  } as React.CSSProperties
                }
                onPointerEnter={(e) => e.pointerType === 'mouse' && !dragging && setHovered(s.id)}
                onPointerLeave={() => setHovered((cur) => (cur === s.id ? null : cur))}
                onClick={() => {
                  // A card behind only comes to the front; it opens once it's there.
                  if (!isFront) go(Math.round(pos) + Math.round(d));
                }}
              >
                <CardMedia
                  slide={s}
                  playing={!reduce && (hovered === s.id || (isFront && playing && visible))}
                  onDuration={(ms) => setDurations((all) => (all[s.id] === ms ? all : { ...all, [s.id]: ms }))}
                />
                <span className={styles.shade} aria-hidden />
                {/* Only the front card opens its project: clicking anywhere on it, or its
                    View project button (the one keyboards and screen readers use). */}
                {isFront && (
                  <Link href={href(s)} className={styles.link} tabIndex={-1} aria-hidden draggable={false} />
                )}
                <span className={styles.info}>
                  <span className={styles.top}>
                    <span className={styles.client}>{s.client}</span>
                    {s.one_liner && <span className={styles.line}>{s.one_liner}</span>}
                  </span>
                  <span className={styles.bottom}>
                    <span>
                      <span className={styles.title}>{s.title}</span>
                      {s.tags.length > 0 && (
                        <span className={styles.tags}>
                          {s.tags.map((t) => (
                            <span key={t} className={styles.tag}>
                              {t}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                    {isFront && (
                      <span className={styles.view}>
                        <Button variant="secondary" size="sm" onClick={() => router.push(href(s))}>
                          {s.slug ? 'View project' : 'See all work'}
                        </Button>
                      </span>
                    )}
                  </span>
                </span>
              </div>
            );
          })}
      </div>

      <div className={styles.footer}>
        {count > 1 && (
          <span className={styles.progress} aria-hidden>
            <span
              key={`${current.id}-${front}`}
              className={styles.progressBar}
              data-running={running || undefined}
              style={{ animationDuration: `${durationFor(current)}ms` }}
              onAnimationEnd={() => go(Math.round(pos) + 1)}
            />
          </span>
        )}
        <p className={styles.counter} aria-live={running ? 'off' : 'polite'}>
          <b>{pad(front + 1)}</b> / {pad(count)}
        </p>
      </div>
    </section>
  );
}

/** The card's picture, and its video while it plays. */
function CardMedia({
  slide,
  playing,
  onDuration,
}: {
  slide: ShowcaseSlide;
  playing: boolean;
  onDuration: (ms: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { still, media } = slide;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.currentTime = 0;
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [playing]);

  const embed = media?.kind === 'embed' ? toBackgroundEmbedUrl(media.url) : null;

  return (
    <span className={styles.media} data-playing={playing || undefined}>
      {still ? (
        <img className={styles.still} src={still.url} alt="" draggable={false} />
      ) : media ? (
        <span className={styles.still}>
          <MediaFrame media={media} mode="thumb" fill placeholderLabel="" />
        </span>
      ) : (
        <span className={styles.placeholder}>{slide.title}</span>
      )}
      {media?.kind === 'video' && (
        <video
          ref={videoRef}
          className={styles.moving}
          src={media.url}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          aria-hidden
          tabIndex={-1}
          onLoadedMetadata={(e) => {
            const ms = e.currentTarget.duration * 1000;
            if (Number.isFinite(ms)) onDuration(Math.min(VIDEO_MAX_MS, Math.max(VIDEO_MIN_MS, ms)));
          }}
        />
      )}
      {/* An embedded player only loads while it plays. */}
      {embed && playing && (
        <iframe className={styles.moving} src={embed} title={media?.caption ?? slide.title} tabIndex={-1} aria-hidden allow="autoplay; encrypted-media" />
      )}
    </span>
  );
}
