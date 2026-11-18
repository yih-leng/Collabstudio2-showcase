'use client';

import { isTouchpointKind } from '../touchpoints';
import { NOTE_FIELDS, type DraftEstimate, type DraftUsage, type ListNames, type ParsedDeck, type ProjectDraft, type ReviewerNote } from './types';

/** Claude looks at this many pictures per deck at most; the biggest are sent first. */
const MAX_PREVIEWS = 60;

function post(mode: 'estimate' | 'draft', deck: ParsedDeck, lists: ListNames) {
  const previews = deck.assets
    .filter((a) => a.thumb && !a.decorative)
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, MAX_PREVIEWS)
    .map((a) => ({ id: a.id, data: a.thumb! }));
  return fetch('/api/import/draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode,
      fileName: deck.fileName,
      slides: deck.slides.map((s) => ({
        n: s.n,
        text: s.text,
        notes: s.notes,
        links: s.links,
        assets: s.assetIds.map((id) => {
          const a = deck.assets.find((x) => x.id === id)!;
          return { id, kind: a.kind, width: a.width, height: a.height, decorative: a.decorative };
        }),
      })),
      previews,
      lists,
    }),
  });
}

/** Prices a deck's draft without running it. Null when no AI key is set on the server. */
export async function estimateDeck(deck: ParsedDeck, lists: ListNames): Promise<DraftEstimate | null> {
  const res = await post('estimate', deck, lists);
  if (res.status === 501) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `The cost couldn't be worked out (${res.status}).`);
  return json as DraftEstimate;
}

/** An error from drafting, carrying what the failed attempt cost (it is billed all the same). */
export class DraftError extends Error {
  constructor(
    message: string,
    readonly usage?: DraftUsage,
  ) {
    super(message);
  }
}

/** Drafts with Claude through /api/import/draft. */
export async function draftDeck(deck: ParsedDeck, lists: ListNames): Promise<{ drafts: ProjectDraft[]; usage: DraftUsage }> {
  const res = await post('draft', deck, lists);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new DraftError(json.error || `Drafting failed (${res.status}).`, json.usage);
  return { drafts: (json.projects as ProjectDraft[]).map((d) => tidy(d, deck)), usage: json.usage };
}

/** Without AI: one simple draft per deck. */
export function basicDrafts(deck: ParsedDeck) {
  return [basicDraft(deck)];
}

/** Keeps a draft to the deck's own assets and links, whatever came back. */
function tidy(d: ProjectDraft, deck: ParsedDeck): ProjectDraft {
  const ids = new Set(deck.assets.map((a) => a.id));
  const asset_ids = [...new Set(d.asset_ids.filter((id) => ids.has(id)))];
  const cover = ids.has(d.cover_asset_id) && deck.assets.find((a) => a.id === d.cover_asset_id)?.kind === 'image' ? d.cover_asset_id : '';
  if (cover && !asset_ids.includes(cover)) asset_ids.unshift(cover);
  return {
    ...d,
    asset_ids,
    cover_asset_id: cover || asset_ids.find((id) => deck.assets.find((a) => a.id === id)?.kind === 'image') || '',
    video_links: d.video_links.filter((l) => deck.links.includes(l)),
    type_names: Array.isArray(d.type_names) ? d.type_names : [],
    // One of each kind, from the known list.
    touchpoints: d.touchpoints.filter((t, i, all) => isTouchpointKind(t.kind) && all.findIndex((x) => x.kind === t.kind) === i),
    // Older or odd replies may send plain strings; those are about the whole project.
    reviewer_notes: (d.reviewer_notes as (ReviewerNote | string)[]).map((n) =>
      typeof n === 'string' ? { field: 'general', note: n } : NOTE_FIELDS.includes(n.field) ? n : { ...n, field: 'general' },
    ),
  };
}

/** Without AI: one project per deck, named after the file, with every picture that isn't decoration. */
function basicDraft(deck: ParsedDeck): ProjectDraft {
  const title = deck.fileName
    .replace(/\.[^.]+$/, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const assets = deck.assets.filter((a) => !a.decorative);
  // Cover: the most detailed picture. Blank and title slides compress to small files, so file size is a fair guess.
  const biggest = [...assets].filter((a) => a.kind === 'image').sort((a, b) => b.file.size - a.file.size)[0];
  // The longest passage in the deck is usually the idea; it gives the reviewer something to edit.
  const longest = deck.slides.map((s) => s.text).sort((a, b) => b.length - a.length)[0] ?? '';
  return {
    title: title || 'Untitled project',
    client_names: [],
    type_names: [],
    year: 0,
    status: 'concept',
    one_liner: '',
    summary: longest.replace(/\n/g, ' ').slice(0, 300),
    objective: '',
    concept: '',
    touchpoints: [],
    output_summary: '',
    turnaround: '',
    deliverables: [],
    capability_names: [],
    tool_names: [],
    slides: deck.slides.map((s) => s.n),
    asset_ids: assets.map((a) => a.id),
    cover_asset_id: biggest?.id ?? '',
    video_links: deck.links,
    reviewer_notes: [
      {
        field: 'general',
        note: 'Drafted without AI, so only the title, pictures and a passage of text are filled in. Add an ANTHROPIC_API_KEY to have the fields written for you.',
      },
    ],
  };
}
