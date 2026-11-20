import { headers } from 'next/headers';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getPublishedProjects } from '@/lib/data';

// The link preview for pages without their own picture (home, Our Works): the
// work itself, no words (the chat app shows the site's name and description
// under it). One cover takes the left half and four more fill the right, in
// site order, so featured work leads and newly featured work shows up by itself.
// Project pages use their own cover instead.
// Colours are the design system's warm canvas and Neutral-9, written out because
// the image is drawn without the site's CSS.
export const alt = 'CollabStudio · AI Creative Showcase: featured work';
export const size = { width: 1200, height: 630 };
// A JPEG, kept small: WhatsApp and some other apps drop a preview image much
// over 300 KB, and a PNG of photographs is several times that.
export const contentType = 'image/jpeg';
const QUALITY = 80;

const GAP = 7;
const CANVAS = '#FCFAF5';
// The image renderer reads PNG and JPEG only.
const READABLE = /^image\/(png|jpe?g)$/;

/** A cover as a data URL the renderer can draw, or null when it can't be read. */
async function load(url: string, origin: string): Promise<string | null> {
  try {
    const res = await fetch(new URL(url, origin));
    const type = res.headers.get('content-type')?.split(';')[0] ?? '';
    if (!res.ok || !READABLE.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const projects = await getPublishedProjects();
  const urls = projects.map((p) => (p.cover?.kind === 'image' ? p.cover.url : null)).filter(Boolean) as string[];

  // Try a few spare covers in case some can't be read.
  const covers = (await Promise.all(urls.slice(0, 8).map((u) => load(u, origin)))).filter(Boolean).slice(0, 5) as string[];

  const tile = (src: string) => (
    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  );
  const [lead, ...rest] = covers;
  const rows = [rest.slice(0, 2), rest.slice(2, 4)].filter((r) => r.length);

  const png = new ImageResponse(
    lead ? (
      <div style={{ width: '100%', height: '100%', display: 'flex', gap: GAP, backgroundColor: CANVAS }}>
        <div style={{ display: 'flex', flex: rows.length ? 1 : 2, overflow: 'hidden' }}>{tile(lead)}</div>
        {rows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: GAP }}>
            {rows.map((row, i) => (
              <div key={i} style={{ display: 'flex', flex: 1, gap: GAP }}>
                {row.map((src, j) => (
                  <div key={j} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {tile(src)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    ) : (
      // No readable covers yet: the studio name on the warm canvas.
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: CANVAS,
          color: '#080808',
          fontSize: 72,
          fontWeight: 800,
        }}
      >
        CollabStudio
      </div>
    ),
    size,
  );
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'content-type': contentType } });
}
