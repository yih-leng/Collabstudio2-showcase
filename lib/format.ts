import type { Aspect, ProjectStatus, Visibility } from './types';

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  live: 'Live',
  approved: 'Approved',
  in_progress: 'In progress',
  concept: 'Concept',
};

export const STATUS_BADGE: Record<ProjectStatus, 'success' | 'info' | 'warning' | 'neutral'> = {
  live: 'success',
  approved: 'info',
  in_progress: 'warning',
  concept: 'neutral',
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  published: 'Published',
  draft: 'Draft',
  hidden: 'Hidden',
};

export const VISIBILITY_BADGE: Record<Visibility, 'success' | 'warning' | 'neutral'> = {
  published: 'success',
  draft: 'warning',
  hidden: 'neutral',
};

export const ASPECTS: Aspect[] = ['16:9', '9:16', '4:5', '1:1'];

export const ASPECT_LABEL: Record<Aspect, string> = {
  '16:9': '16:9 horizontal',
  '9:16': '9:16 vertical',
  '4:5': '4:5 portrait',
  '1:1': '1:1 square',
};

/** CSS aspect-ratio value for an aspect. */
export const aspectRatio = (a: Aspect) => a.replace(':', ' / ');

export function statusText(status: ProjectStatus, note?: string | null) {
  return note ? `${STATUS_LABEL[status]} (${note})` : STATUS_LABEL[status];
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/×/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Turns a YouTube, Vimeo or Google Drive share link into its embeddable URL.
 * Returns null for anything else.
 */
/**
 * The embed URL set up to play silently on a loop with no controls, for the
 * home page banner. Google Drive can't autoplay, so it plays as a normal embed.
 */
export function toBackgroundEmbedUrl(raw: string): string | null {
  const embed = toEmbedUrl(raw);
  if (!embed) return null;
  const yt = embed.match(/youtube-nocookie\.com\/embed\/([\w-]+)/);
  if (yt) {
    return `${embed}?autoplay=1&mute=1&controls=0&loop=1&playlist=${yt[1]}&playsinline=1&modestbranding=1&rel=0`;
  }
  if (embed.includes('player.vimeo.com')) {
    return `${embed}${embed.includes('?') ? '&' : '?'}background=1&autoplay=1&muted=1&loop=1`;
  }
  return embed;
}

export function toEmbedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = url.searchParams.get('v');
    if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
    const m = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/);
    return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = url.pathname.match(/(\d{6,})(?:\/(\w+))?/);
    if (!m) return null;
    const hash = url.searchParams.get('h') ?? m[2];
    return `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ''}`;
  }
  if (host === 'drive.google.com') {
    const m = url.pathname.match(/\/file\/d\/([\w-]+)/) ?? null;
    const id = m?.[1] ?? url.searchParams.get('id');
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  return null;
}

export function embedProvider(raw: string) {
  const u = raw.toLowerCase();
  if (u.includes('youtu')) return 'YouTube';
  if (u.includes('vimeo')) return 'Vimeo';
  if (u.includes('drive.google')) return 'Google Drive';
  return 'Video';
}
