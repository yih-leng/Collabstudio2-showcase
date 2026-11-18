'use client';

import type { AssetKind, DeckAsset, DeckFormat, DeckSlide, ParsedDeck } from './types';

// Reads a deck in the browser. Nothing is uploaded here: a 100 MB PowerPoint
// is opened locally, and only small previews and the slide text go on to the
// drafting step. PowerPoint and OpenDocument files are zips of XML and media;
// a PDF is rendered page by page.

export const DECK_EXTENSIONS: Record<string, DeckFormat> = { pptx: 'pptx', pdf: 'pdf', odp: 'odp' };

export function deckFormat(file: File): DeckFormat | null {
  return DECK_EXTENSIONS[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? null;
}

const MEDIA_TYPES: Record<string, [AssetKind, string]> = {
  jpg: ['image', 'image/jpeg'],
  jpeg: ['image', 'image/jpeg'],
  png: ['image', 'image/png'],
  gif: ['image', 'image/gif'],
  webp: ['image', 'image/webp'],
  mp4: ['video', 'video/mp4'],
  m4v: ['video', 'video/mp4'],
  mov: ['video', 'video/quicktime'],
  webm: ['video', 'video/webm'],
  mp3: ['audio', 'audio/mpeg'],
  m4a: ['audio', 'audio/mp4'],
  wav: ['audio', 'audio/wav'],
};

/** A file used on this many slides or more is treated as a logo or background. */
const REPEATED_ON = 3;
const MIN_EDGE = 200;
const THUMB_EDGE = 320;

// ---------- Shared helpers ----------

type RawAsset = { key: string; name: string; blob: Blob; slide: number };

/** Turns the media found on each slide into deck assets: one per distinct file, with size, preview and a decorative guess. */
async function buildAssets(raw: RawAsset[], slides: DeckSlide[]): Promise<DeckAsset[]> {
  // The same picture is often stored twice (or used on every slide): merge by content.
  const byHash = new Map<string, DeckAsset>();
  const assets: DeckAsset[] = [];
  for (const r of raw) {
    const ext = r.name.split('.').pop()?.toLowerCase() ?? '';
    const type = MEDIA_TYPES[ext];
    if (!type) continue; // EMF, WMF, TIFF and SVG copies don't show on the web.
    const hash = await digest(r.blob);
    let asset = byHash.get(hash);
    if (!asset) {
      const file = new File([r.blob], r.name.split('/').pop()!, { type: type[1] });
      const { width, height, thumb } = await inspect(file, type[0]);
      asset = { id: `a${assets.length + 1}`, kind: type[0], file, width, height, slides: [], decorative: false, thumb };
      byHash.set(hash, asset);
      assets.push(asset);
    }
    if (!asset.slides.includes(r.slide)) asset.slides.push(r.slide);
  }
  for (const a of assets) {
    a.decorative = isDecorative(a);
    for (const n of a.slides) slides.find((s) => s.n === n)?.assetIds.push(a.id);
  }
  return assets;
}

function isDecorative(a: DeckAsset) {
  if (a.kind !== 'image') return false;
  if (a.slides.length >= REPEATED_ON) return true;
  if (!a.width || !a.height) return false;
  const short = Math.min(a.width, a.height);
  const ratio = Math.max(a.width, a.height) / short;
  return short < MIN_EDGE || ratio > 6;
}

async function digest(blob: Blob) {
  const buf = await crypto.subtle.digest('SHA-1', await blob.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Size and a small JPEG preview. Videos get a frame from a second in. */
async function inspect(file: File, kind: AssetKind): Promise<{ width: number; height: number; thumb: string | null }> {
  if (kind === 'audio') return { width: 0, height: 0, thumb: null };
  if (kind === 'image') {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return { width: 0, height: 0, thumb: null };
    const out = { width: bitmap.width, height: bitmap.height, thumb: toThumb(bitmap, bitmap.width, bitmap.height) };
    bitmap.close();
    return out;
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    const done = (thumb: string | null) => {
      URL.revokeObjectURL(url);
      resolve({ width: v.videoWidth, height: v.videoHeight, thumb });
    };
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
    };
    v.onseeked = () => done(toThumb(v, v.videoWidth, v.videoHeight));
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

function toThumb(source: CanvasImageSource, w: number, h: number) {
  if (!w || !h) return null;
  const scale = Math.min(1, THUMB_EDGE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; // transparent PNGs preview on white
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}

/** Keeps video links only, unwraps Google's redirect links and tidies Drive links. */
export function videoLink(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.hostname === 'www.google.com' && url.pathname === '/url' && url.searchParams.get('q')) return videoLink(url.searchParams.get('q')!);
  const host = url.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be' || host === 'vimeo.com' || host === 'player.vimeo.com') return url.toString();
  if (host === 'youtube.com') {
    const embed = url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1];
    if (embed) return `https://www.youtube.com/watch?v=${embed}`;
    return url.searchParams.get('v') ? `https://www.youtube.com/watch?v=${url.searchParams.get('v')}` : null;
  }
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1];
    return id ? `https://drive.google.com/file/d/${id}/view` : null;
  }
  return null;
}

const clean = (lines: string[]) =>
  lines
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

const xml = (text: string) => new DOMParser().parseFromString(text, 'application/xml');

function resolvePath(base: string, target: string) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

// ---------- PowerPoint (.pptx) ----------

const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

type Rel = { id: string; type: string; target: string; external: boolean };

async function readRels(zip: import('jszip'), path: string): Promise<Rel[]> {
  const file = zip.file(path);
  if (!file) return [];
  const doc = xml(await file.async('text'));
  return Array.from(doc.getElementsByTagNameNS(REL, 'Relationship'), (r) => ({
    id: r.getAttribute('Id') ?? '',
    type: (r.getAttribute('Type') ?? '').split('/').pop() ?? '',
    target: r.getAttribute('Target') ?? '',
    external: r.getAttribute('TargetMode') === 'External',
  }));
}

function paragraphs(doc: Document) {
  return Array.from(doc.getElementsByTagNameNS(A, 'p'), (p) =>
    Array.from(p.childNodes)
      .map((n) => {
        const el = n as Element;
        if (el.localName === 'br') return '\n';
        return Array.from(el.getElementsByTagNameNS?.(A, 't') ?? [], (t) => t.textContent ?? '').join('');
      })
      .join(''),
  );
}

async function parsePptx(file: File): Promise<Omit<ParsedDeck, 'id' | 'fileName' | 'format'>> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const pres = zip.file('ppt/presentation.xml');
  if (!pres) throw new Error("This doesn't look like a PowerPoint file.");
  const presRels = await readRels(zip, 'ppt/_rels/presentation.xml.rels');
  const order = Array.from(xml(await pres.async('text')).getElementsByTagNameNS(P, 'sldId'), (s) => s.getAttributeNS(R, 'id'));

  const slides: DeckSlide[] = [];
  const raw: RawAsset[] = [];
  const links = new Set<string>();
  let n = 0;
  for (const rid of order) {
    const rel = presRels.find((r) => r.id === rid);
    if (!rel) continue;
    const path = resolvePath('ppt/presentation.xml', rel.target);
    const text = await zip.file(path)?.async('text');
    if (!text) continue;
    const doc = xml(text);
    if (doc.documentElement.getAttribute('show') === '0') continue; // hidden slide
    n += 1;
    const slide: DeckSlide = { n, text: clean(paragraphs(doc)), notes: '', assetIds: [], links: [] };
    const rels = await readRels(zip, path.replace(/([^/]+)$/, '_rels/$1.rels'));
    for (const r of rels) {
      // Only what the slide actually uses: a relationship can be left behind after an edit.
      if (!text.includes(`"${r.id}"`) && r.type !== 'notesSlide') continue;
      if (r.external) {
        const v = videoLink(r.target);
        if (v) slide.links.push(v);
        continue;
      }
      const target = resolvePath(path, r.target);
      if (r.type === 'notesSlide') {
        const notes = await zip.file(target)?.async('text');
        // Notes pages repeat the slide number in a placeholder; keep the sentences.
        if (notes) slide.notes = clean(paragraphs(xml(notes)).filter((t) => !/^\d+$/.test(t.trim())));
      } else if (['image', 'video', 'media', 'audio'].includes(r.type)) {
        const blob = await zip.file(target)?.async('blob');
        if (blob) raw.push({ key: target, name: target, blob, slide: n });
      }
    }
    slide.links = [...new Set(slide.links)];
    slide.links.forEach((l) => links.add(l));
    slides.push(slide);
  }
  return { slides, assets: await buildAssets(raw, slides), links: [...links] };
}

// ---------- OpenDocument (.odp, e.g. from Google Slides or Keynote export) ----------

const DRAW = 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0';
const TEXT = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0';
const PRES = 'urn:oasis:names:tc:opendocument:xmlns:presentation:1.0';
const XLINK = 'http://www.w3.org/1999/xlink';

async function parseOdp(file: File): Promise<Omit<ParsedDeck, 'id' | 'fileName' | 'format'>> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const content = await zip.file('content.xml')?.async('text');
  if (!content) throw new Error("This doesn't look like an OpenDocument presentation.");
  const doc = xml(content);
  const slides: DeckSlide[] = [];
  const raw: RawAsset[] = [];
  const links = new Set<string>();
  let n = 0;
  for (const page of Array.from(doc.getElementsByTagNameNS(DRAW, 'page'))) {
    if (page.getAttributeNS(PRES, 'visibility') === 'hidden') continue;
    n += 1;
    const notesEl = page.getElementsByTagNameNS(PRES, 'notes')[0];
    const inNotes = (el: Element) => Boolean(notesEl?.contains(el));
    const lines = (els: Element[]) => els.map((p) => p.textContent ?? '');
    const textEls = [...Array.from(page.getElementsByTagNameNS(TEXT, 'h')), ...Array.from(page.getElementsByTagNameNS(TEXT, 'p'))];
    const slide: DeckSlide = {
      n,
      text: clean(lines(textEls.filter((p) => !inNotes(p)))),
      notes: clean(lines(textEls.filter(inNotes))),
      assetIds: [],
      links: [],
    };
    for (const a of Array.from(page.getElementsByTagNameNS(TEXT, 'a'))) {
      const v = videoLink(a.getAttributeNS(XLINK, 'href') ?? '');
      if (v) slide.links.push(v);
    }
    for (const tag of ['image', 'plugin']) {
      for (const el of Array.from(page.getElementsByTagNameNS(DRAW, tag))) {
        if (inNotes(el)) continue;
        const href = el.getAttributeNS(XLINK, 'href') ?? '';
        const v = videoLink(href);
        if (v) {
          slide.links.push(v);
          continue;
        }
        const blob = await zip.file(href.replace(/^\.\//, ''))?.async('blob');
        if (blob) raw.push({ key: href, name: href, blob, slide: n });
      }
    }
    slide.links = [...new Set(slide.links)];
    slide.links.forEach((l) => links.add(l));
    slides.push(slide);
  }
  return { slides, assets: await buildAssets(raw, slides), links: [...links] };
}

// ---------- PDF ----------

/** Pages render at this width: sharp on a laptop, and under the image upload limit. */
const PDF_PAGE_WIDTH = 1920;

async function parsePdf(file: File): Promise<Omit<ParsedDeck, 'id' | 'fileName' | 'format'>> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const slides: DeckSlide[] = [];
  const assets: DeckAsset[] = [];
  const links = new Set<string>();
  const base = file.name.replace(/\.[^.]+$/, '');
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    let text = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      text += item.str + (item.hasEOL ? '\n' : ' ');
    }
    const slide: DeckSlide = { n, text: clean(text.split('\n')), notes: '', assetIds: [], links: [] };
    for (const ann of await page.getAnnotations()) {
      const v = ann.subtype === 'Link' && ann.url ? videoLink(ann.url) : null;
      if (v) slide.links.push(v);
    }
    slide.links = [...new Set(slide.links)];
    slide.links.forEach((l) => links.add(l));

    // A PDF's pictures can't be lifted out reliably, so each page becomes one picture.
    const viewport = page.getViewport({ scale: PDF_PAGE_WIDTH / page.getViewport({ scale: 1 }).width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, viewport }).promise;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
    if (blob) {
      const id = `a${assets.length + 1}`;
      assets.push({
        id,
        kind: 'image',
        file: new File([blob], `${base}-page-${n}.jpg`, { type: 'image/jpeg' }),
        width: canvas.width,
        height: canvas.height,
        slides: [n],
        decorative: false,
        thumb: toThumb(canvas, canvas.width, canvas.height),
      });
      slide.assetIds.push(id);
    }
    page.cleanup();
    slides.push(slide);
  }
  await pdf.cleanup();
  return { slides, assets, links: [...links] };
}

// ---------- Entry ----------

export async function parseDeck(file: File): Promise<ParsedDeck> {
  const format = deckFormat(file);
  if (!format) throw new Error('Use a PowerPoint (.pptx), PDF or OpenDocument (.odp) file.');
  const read = format === 'pptx' ? parsePptx : format === 'odp' ? parseOdp : parsePdf;
  const deck = await read(file);
  if (!deck.slides.length) throw new Error('No slides found in this file.');
  return { id: crypto.randomUUID(), fileName: file.name, format, ...deck };
}
