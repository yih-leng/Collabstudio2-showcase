'use client';

import { FilmSlate, MusicNotes, Play } from '@phosphor-icons/react';
import { aspectRatio, toEmbedUrl } from '@/lib/format';
import type { Aspect, Media, MediaKind } from '@/lib/types';
import styles from './MediaFrame.module.css';

type FrameMedia = Pick<Media, 'kind' | 'url' | 'aspect' | 'caption'>;

/**
 * One piece of media at its aspect ratio: an image, an uploaded video or an
 * embedded player or an audio track. `mode="thumb"` never plays (cards, gallery tiles).
 */
export function MediaFrame({
  media,
  aspect,
  mode = 'player',
  placeholderLabel = 'Media coming soon',
  fit = 'cover',
  fill = false,
}: {
  media: FrameMedia | null;
  aspect?: Aspect;
  mode?: 'player' | 'thumb';
  placeholderLabel?: string;
  fit?: 'cover' | 'contain';
  /** Fill the parent's box instead of keeping an aspect ratio (viewers with a fixed-size stage). */
  fill?: boolean;
}) {
  const ratio = aspectRatio(aspect ?? media?.aspect ?? '16:9');

  if (!media) {
    return (
      <div className={styles.placeholder} style={fill ? { height: '100%' } : { aspectRatio: ratio }}>
        <FilmSlate weight="fill" aria-hidden />
        <span>{placeholderLabel}</span>
      </div>
    );
  }

  return (
    <div className={styles.frame} style={fill ? { height: '100%' } : { aspectRatio: ratio }} data-fit={fit}>
      <MediaBody media={media} mode={mode} />
      {mode === 'thumb' && media.kind !== 'image' && (
        <span className={styles.playBadge} aria-hidden>
          <Play weight="fill" />
        </span>
      )}
    </div>
  );
}

function MediaBody({ media, mode }: { media: FrameMedia; mode: 'player' | 'thumb' }) {
  const alt = media.caption ?? '';
  if (media.kind === 'audio') return <AudioBody media={media} mode={mode} />;
  if (media.kind === 'image') return <img src={media.url} alt={alt} loading="lazy" />;

  if (media.kind === 'video') {
    return mode === 'player' ? (
      <video src={media.url} controls playsInline preload="metadata" aria-label={media.caption ?? 'Video'} />
    ) : (
      <video src={`${media.url}#t=0.5`} muted playsInline preload="metadata" aria-hidden tabIndex={-1} />
    );
  }

  const embed = toEmbedUrl(media.url);
  if (!embed) return <EmbedFallback kind={media.kind} />;
  if (mode === 'thumb') {
    const yt = embed.match(/youtube-nocookie\.com\/embed\/([\w-]+)/);
    if (yt) return <img src={`https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`} alt={alt} loading="lazy" />;
    return <EmbedFallback kind={media.kind} />;
  }
  return (
    <iframe
      src={embed}
      title={media.caption ?? 'Embedded video'}
      loading="lazy"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
    />
  );
}

function EmbedFallback({ kind }: { kind: MediaKind }) {
  return (
    <div className={styles.embedFallback}>
      <FilmSlate weight="fill" aria-hidden />
      <span>{kind === 'embed' ? 'Video' : 'Media'}</span>
    </div>
  );
}

/** Audio: a square "record sleeve" with its title, and the player when it can play. */
function AudioBody({ media, mode }: { media: FrameMedia; mode: 'player' | 'thumb' }) {
  return (
    <div className={styles.audio}>
      <span className={styles.audioDisc} aria-hidden>
        <MusicNotes weight="fill" />
      </span>
      <span className={styles.audioTitle}>{media.caption || 'Audio track'}</span>
      {mode === 'player' && (
        // Native controls: play, scrub, volume and download, all keyboard-reachable.
        <audio className={styles.audioPlayer} src={media.url} controls preload="metadata" aria-label={media.caption ?? 'Audio track'} />
      )}
    </div>
  );
}
