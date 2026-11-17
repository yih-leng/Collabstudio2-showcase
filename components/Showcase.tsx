'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@collabrium/ui';
import { useReducedMotion, WordReveal } from '@collabrium/ui/motion';
import { CaretLeft, CaretRight, FilmSlate, Pause, Play, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { toBackgroundEmbedUrl } from '@/lib/format';
import type { ShowcaseSlide } from '@/lib/types';
import { MediaFrame } from './MediaFrame';
import styles from './Showcase.module.css';

// How long a slide stays up. An uploaded video stays for its own length (within limits).
const IMAGE_MS = 6000;
const EMBED_MS = 14000;
const VIDEO_MIN_MS = 6000;
const VIDEO_MAX_MS = 30000;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The home page banner: one piece of work full width, playing silently, with
 * a strip of thumbnails under it that moves on to the next piece by itself.
 * TODO(design-system: no media carousel; built from Button and motion tokens).
 */
export function Showcase({ slides }: { slides: ShowcaseSlide[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false); // pointer or keyboard focus inside: hold the slide
  const [muted, setMuted] = useState(true);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const stripRef = useRef<HTMLOListElement>(null);

  // Under reduced motion nothing moves on by itself; the person steps through.
  useEffect(() => {
    if (reduce) setPlaying(false);
  }, [reduce]);

  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);

  // Keep the active thumbnail in view without scrolling the page.
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !el) return;
    const left = el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2;
    strip.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
  }, [index, reduce]);

  if (!count) {
    return (
      <div className={styles.empty}>
        <FilmSlate weight="fill" aria-hidden />
        <span>Published work plays here.</span>
      </div>
    );
  }

  const slide = slides[index];
  const durationFor = (s: ShowcaseSlide) =>
    durations[s.id] ?? (!s.media || s.media.kind === 'image' ? IMAGE_MS : EMBED_MS);
  const running = playing && !held && count > 1;
  const open = (s: ShowcaseSlide) => router.push(s.slug ? `/work/${s.slug}` : '/work');

  return (
    <section
      className={styles.showcase}
      aria-roledescription="carousel"
      aria-label="Our work"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setHeld(false);
      }}
    >
      <div className={styles.stage}>
        <div className={styles.glow} aria-hidden />
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={styles.slide}
            data-active={i === index || undefined}
            aria-hidden={i !== index}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${s.title}`}
          >
            <SlideMedia
              slide={s}
              active={i === index}
              playing={playing}
              muted={muted}
              onDuration={(ms) =>
                setDurations((d) => (d[s.id] === ms ? d : { ...d, [s.id]: ms }))
              }
            />
          </div>
        ))}
        <div className={styles.scrim} aria-hidden />
        {/* The whole banner opens the piece on show. */}
        <Link
          href={slide.slug ? `/work/${slide.slug}` : '/work'}
          className={styles.stageLink}
          aria-label={slide.slug ? `View project: ${slide.title}` : 'See all work'}
        />

        <div className={styles.caption} key={slide.id} aria-live={running ? 'off' : 'polite'}>
          {slide.eyebrow && <p className={styles.eyebrow}>{slide.eyebrow}</p>}
          <h2 className={styles.title}>
            <WordReveal text={slide.title} />
          </h2>
          {slide.one_liner && <p className={styles.lede}>{slide.one_liner}</p>}
          <div className={styles.cta}>
            <Button variant="secondary" size="lg" trailingArrow="right" tabIndex={-1} onClick={() => open(slide)}>
              {slide.slug ? 'View project' : 'See all work'}
            </Button>
          </div>
        </div>

        <div className={styles.controls}>
          {slide.media?.kind === 'video' && (
            <Button
              variant="secondary"
              size="sm"
              iconOnly
              icon={muted ? SpeakerSlash : SpeakerHigh}
              aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
              onClick={() => setMuted((m) => !m)}
            />
          )}
          {count > 1 && (
            <>
              <Button variant="secondary" size="sm" iconOnly icon={CaretLeft} aria-label="Previous work" onClick={() => go(index - 1)} />
              <Button
                variant="secondary"
                size="sm"
                iconOnly
                icon={playing ? Pause : Play}
                aria-label={playing ? 'Pause the slideshow' : 'Play the slideshow'}
                onClick={() => setPlaying((p) => !p)}
              />
              <Button variant="secondary" size="sm" iconOnly icon={CaretRight} aria-label="Next work" onClick={next} />
            </>
          )}
        </div>
      </div>

      {count > 1 && (
        <ol className={styles.strip} ref={stripRef} aria-label="Choose a piece of work">
          {slides.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={styles.thumb}
                data-active={i === index || undefined}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
              >
                <span className={styles.thumbMedia}>
                  <MediaFrame media={s.media} aspect="16:9" mode="thumb" placeholderLabel="" />
                </span>
                <span className={styles.thumbText}>
                  <span className={styles.thumbIndex}>{pad(i + 1)}</span>
                  <span className={styles.thumbTitle}>{s.title}</span>
                </span>
                <span className={styles.progress} aria-hidden>
                  {i === index && (
                    <span
                      key={`${s.id}-${index}`}
                      className={styles.progressBar}
                      data-running={running || undefined}
                      style={{ animationDuration: `${durationFor(s)}ms` }}
                      onAnimationEnd={next}
                    />
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function SlideMedia({
  slide,
  active,
  playing,
  muted,
  onDuration,
}: {
  slide: ShowcaseSlide;
  active: boolean;
  playing: boolean;
  muted: boolean;
  onDuration: (ms: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const media = slide.media;

  // Play the active video from the top; rest the others.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active && playing) {
      if (v.currentTime > 0 && v.ended) v.currentTime = 0;
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active, playing]);

  useEffect(() => {
    const v = videoRef.current;
    if (v && active) v.currentTime = 0;
  }, [active]);

  if (!media || media.kind === 'audio') {
    return (
      <div className={styles.placeholder}>
        <span>{slide.title}</span>
      </div>
    );
  }

  if (media.kind === 'video') {
    return (
      <video
        ref={videoRef}
        className={styles.media}
        src={media.url}
        muted={muted}
        loop
        playsInline
        disablePictureInPicture
        controlsList="nodownload"
        preload={active ? 'auto' : 'metadata'}
        onLoadedMetadata={(e) => {
          const ms = e.currentTarget.duration * 1000;
          if (Number.isFinite(ms)) onDuration(Math.min(VIDEO_MAX_MS, Math.max(VIDEO_MIN_MS, ms)));
        }}
      />
    );
  }

  if (media.kind === 'embed') {
    const src = toBackgroundEmbedUrl(media.url);
    // Only the slide on show loads its player, so it starts from the top each time.
    return active && src ? (
      <iframe
        className={styles.embed}
        src={src}
        title={media.caption ?? slide.title}
        tabIndex={-1}
        allow="autoplay; encrypted-media; picture-in-picture"
      />
    ) : (
      <div className={styles.placeholder} />
    );
  }

  return <img className={styles.media} data-kenburns src={media.url} alt={media.caption ?? ''} />;
}
