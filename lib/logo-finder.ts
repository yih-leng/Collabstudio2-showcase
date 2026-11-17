import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Finds a brand's logo from a web address: the address itself if it is an
// image, otherwise the page's logo candidates (logo images, an inline SVG
// logo, app icons, favicons, the share image), best first.
// The fetches only reach public web addresses: private and local networks
// are refused, so the admin can't be used to probe them.

const TIMEOUT_MS = 8000;
const MAX_PAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 4;

export interface LogoCandidate {
  /** data: URL of the image, ready to preview and upload. */
  dataUrl: string;
  mime: string;
  bytes: number;
  /** Where it came from, for the admin. */
  source: string;
  label: string;
}

function isPrivateAddress(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb');
}

async function assertPublic(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Use a web address starting with https://');
  if (url.port && url.port !== '80' && url.port !== '443') throw new Error('That address uses an unusual port');
  if (url.username || url.password) throw new Error('Remove the login details from the address');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('That address is not on the public web');
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) throw new Error('That address is not on the public web');
}

/** Fetches a public URL, following redirects one by one so each hop is checked. */
async function safeFetch(raw: string, accept: string): Promise<{ res: Response; url: URL }> {
  let url = new URL(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept, 'user-agent': 'Mozilla/5.0 (compatible; CollabStudioLogoFinder/1.0)' },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url);
      continue;
    }
    if (!res.ok) throw new Error(`The site answered ${res.status}`);
    return { res, url };
  }
  throw new Error('Too many redirects');
}

async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new Error('That file is too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

const IMAGE_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/avif'];

function sniff(bytes: Uint8Array, declared: string): string | null {
  const head = Buffer.from(bytes.slice(0, 256)).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml';
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57) return 'image/webp';
  if (b[0] === 0x47 && b[1] === 0x49) return 'image/gif';
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'image/x-icon';
  return IMAGE_TYPES.includes(declared) ? declared : null;
}

/** Strips anything that could run from an SVG before it is stored and shown. */
function cleanSvg(svg: string) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '');
}

function toCandidate(bytes: Uint8Array, mime: string, source: string, label: string): LogoCandidate {
  let data = bytes;
  if (mime === 'image/svg+xml') {
    let text = cleanSvg(Buffer.from(bytes).toString('utf8'));
    if (!/xmlns=/.test(text)) text = text.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    data = new Uint8Array(Buffer.from(text, 'utf8'));
  }
  return { dataUrl: `data:${mime};base64,${Buffer.from(data).toString('base64')}`, mime, bytes: data.byteLength, source, label };
}

async function fetchImage(src: string, label: string): Promise<LogoCandidate | null> {
  try {
    const { res, url } = await safeFetch(src, 'image/*');
    const bytes = await readCapped(res, MAX_IMAGE_BYTES);
    const mime = sniff(bytes, (res.headers.get('content-type') ?? '').split(';')[0].trim());
    if (!mime || bytes.byteLength < 100) return null;
    return toCandidate(bytes, mime, url.href, label);
  } catch {
    return null;
  }
}

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(2).find((v) => v !== undefined) ?? null;

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

type Found = { src?: string; svg?: string; score: number; label: string };

function findInPage(html: string, base: URL): Found[] {
  const found: Found[] = [];
  const abs = (v: string | null) => {
    if (!v || v.startsWith('data:')) return null;
    try {
      return new URL(decode(v.trim()), base).href;
    } catch {
      return null;
    }
  };
  const headerEnd = html.search(/<\/header>/i);

  // <img> that says it is the logo, by its src, alt, class or id. Earlier on the page scores higher.
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const hay = `${attr(tag, 'src') ?? ''} ${attr(tag, 'alt') ?? ''} ${attr(tag, 'class') ?? ''} ${attr(tag, 'id') ?? ''}`.toLowerCase();
    if (!hay.includes('logo')) continue;
    const src = abs(attr(tag, 'src') ?? attr(tag, 'data-src'));
    if (!src) continue;
    const inHeader = headerEnd > 0 && (m.index ?? 0) < headerEnd;
    found.push({ src, score: 80 + (src.toLowerCase().endsWith('.svg') ? 8 : 0) + (inHeader ? 6 : 0) - found.length, label: 'Logo on the page' });
  }
  // An inline <svg> logo, often in the header.
  for (const m of html.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)) {
    const open = m[0].match(/<svg\b[^>]*>/i)?.[0] ?? '';
    const parentBit = html.slice(Math.max(0, (m.index ?? 0) - 300), m.index).toLowerCase();
    const hay = `${attr(open, 'class') ?? ''} ${attr(open, 'id') ?? ''} ${attr(open, 'aria-label') ?? ''}`.toLowerCase();
    if (!hay.includes('logo') && !/logo[^>]*>\s*(<a[^>]*>)?\s*$/.test(parentBit)) continue;
    if (m[0].length > 200_000) continue;
    // A <use> that points into a sprite elsewhere on the page draws nothing on its own.
    if (/<use\b/i.test(m[0]) && !/<(path|rect|circle|ellipse|polygon|polyline|line|image)\b/i.test(m[0])) continue;
    found.push({ svg: m[0], score: 84 - found.length, label: 'Logo drawn on the page (SVG)' });
    if (found.filter((f) => f.svg).length >= 2) break;
  }
  // Icons declared in <head>.
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = (attr(tag, 'rel') ?? '').toLowerCase();
    const href = abs(attr(tag, 'href'));
    if (!href || !/icon/.test(rel)) continue;
    const sizes = Number((attr(tag, 'sizes') ?? '').split('x')[0]) || 0;
    const isSvg = (attr(tag, 'type') ?? '').includes('svg') || href.toLowerCase().endsWith('.svg');
    if (rel.includes('apple-touch-icon')) found.push({ src: href, score: 55, label: 'App icon' });
    else if (rel.includes('mask-icon')) found.push({ src: href, score: 40, label: 'Pinned-tab icon' });
    else found.push({ src: href, score: isSvg ? 60 : sizes >= 128 ? 50 : 25, label: 'Site icon' });
  }
  // The share image: sometimes the logo, often a banner.
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const prop = (attr(tag, 'property') ?? attr(tag, 'name') ?? '').toLowerCase();
    if (prop === 'og:logo' || prop === 'og:image') {
      const src = abs(attr(tag, 'content'));
      if (src) found.push({ src, score: prop === 'og:logo' ? 78 : 15, label: prop === 'og:logo' ? 'Logo (page info)' : 'Share image' });
    }
  }
  found.push({ src: new URL('/favicon.ico', base).href, score: 10, label: 'Favicon' });
  return found;
}

/** Up to `max` logo candidates for a web address, best first. */
export async function findLogos(raw: string, max = 6): Promise<LogoCandidate[]> {
  const input = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  const { res, url } = await safeFetch(input, 'text/html,image/*;q=0.9,*/*;q=0.5');
  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
  const bytes = await readCapped(res, MAX_PAGE_BYTES);

  // The address is an image itself.
  const direct = sniff(bytes, type);
  if (direct && !type.includes('html')) return [toCandidate(bytes, direct, url.href, 'The image at that address')];

  const html = Buffer.from(bytes).toString('utf8');
  const found = findInPage(html, url).sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const unique = found.filter((f) => {
    const key = f.src ?? f.svg!.slice(0, 500);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const results = await Promise.all(
    unique.slice(0, 10).map(async (f) =>
      f.svg ? toCandidate(new Uint8Array(Buffer.from(f.svg, 'utf8')), 'image/svg+xml', url.href, f.label) : fetchImage(f.src!, f.label),
    ),
  );
  const out: LogoCandidate[] = [];
  const seenData = new Set<string>();
  for (const c of results) {
    if (!c || seenData.has(c.dataUrl)) continue;
    seenData.add(c.dataUrl);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}
