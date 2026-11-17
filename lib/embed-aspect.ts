import 'server-only';
import type { Aspect } from './types';

// Works out a video link's shape without asking the admin: YouTube and Vimeo
// report the video's size (oEmbed), and for Google Drive the size of its
// thumbnail gives the same ratio. Only these known hosts are contacted.

const TIMEOUT_MS = 6000;

export function closestAspect(w: number, h: number): Aspect {
  if (!w || !h) return '16:9';
  const r = w / h;
  const options: [Aspect, number][] = [
    ['16:9', 16 / 9],
    ['1:1', 1],
    ['4:5', 4 / 5],
    ['9:16', 9 / 16],
  ];
  return options.reduce((best, cur) => (Math.abs(cur[1] - r) < Math.abs(best[1] - r) ? cur : best))[0];
}

/** Width and height from a PNG, JPEG or WebP file's header. */
function imageSize(b: Uint8Array): [number, number] | null {
  if (b[0] === 0x89 && b[1] === 0x50) return [(b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19], (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = (b[i + 2] << 8) | b[i + 3];
      // Start-of-frame markers carry the size.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return [(b[i + 7] << 8) | b[i + 8], (b[i + 5] << 8) | b[i + 6]];
      }
      i += 2 + len;
    }
    return null;
  }
  if (b[0] === 0x52 && b[8] === 0x57 && b[12] === 0x56 && b[13] === 0x50 && b[14] === 0x38 && b[15] === 0x20) {
    return [((b[27] << 8) | b[26]) & 0x3fff, ((b[29] << 8) | b[28]) & 0x3fff];
  }
  return null;
}

async function get(url: string) {
  return fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': 'Mozilla/5.0 (compatible; CollabStudio/1.0)' } });
}

/** The shape of a YouTube, Vimeo or Google Drive video, or null when it can't be told. */
export async function detectEmbedAspect(raw: string): Promise<Aspect | null> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  try {
    if (host === 'youtube.com' || host === 'youtu.be') {
      // Shorts are always vertical; oEmbed reports them that way too.
      if (url.pathname.startsWith('/shorts/')) return '9:16';
      const res = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.href)}`);
      if (!res.ok) return null;
      const { width, height } = (await res.json()) as { width?: number; height?: number };
      return width && height ? closestAspect(width, height) : null;
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const res = await get(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url.href)}`);
      if (!res.ok) return null;
      const { width, height } = (await res.json()) as { width?: number; height?: number };
      return width && height ? closestAspect(width, height) : null;
    }
    if (host === 'drive.google.com') {
      const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? url.searchParams.get('id');
      if (!id || !/^[\w-]+$/.test(id)) return null;
      const res = await get(`https://drive.google.com/thumbnail?id=${id}&sz=w400`);
      if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return null;
      const size = imageSize(new Uint8Array(await res.arrayBuffer()));
      return size ? closestAspect(size[0], size[1]) : null;
    }
  } catch {
    return null;
  }
  return null;
}
