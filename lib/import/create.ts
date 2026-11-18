'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MB, detectAspect, extOf, newId, uploadToStorage } from '../admin-api';
import { compressImage, compressMedia, needsCompression } from '../compress-media';
import { slugify } from '../format';
import { CUSTOM } from '../touchpoints';
import type { Aspect, Lists, Media, TagType } from '../types';
import type { DeckAsset, ProjectDraft } from './types';

// Creates a reviewed draft as a real project: names become list entries
// (reusing ones that exist), the chosen assets are shrunk and uploaded, and
// the project is saved as a draft for a final look in the editor.

type Named = { id: string; name: string };

/** Finds each name in a list (ignoring case), adding the ones that aren't there. Updates `list` in place. */
async function idsFor(
  sb: SupabaseClient,
  table: 'clients' | 'categories' | 'tags',
  list: (Named & { type?: TagType })[],
  names: string[],
  type?: TagType,
): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const found = list.find((x) => x.name.toLowerCase() === name.toLowerCase() && (!type || x.type === type));
    if (found) {
      if (!ids.includes(found.id)) ids.push(found.id);
      continue;
    }
    const row: Record<string, unknown> = { name, sort_order: list.length };
    if (type) row.type = type;
    const { data, error } = await sb.from(table).insert(row).select('id').single();
    if (error || !data) throw new Error(`Couldn't add “${name}” to the lists: ${error?.message ?? 'unknown error'}`);
    list.push({ id: data.id, name, type });
    ids.push(data.id);
  }
  return ids;
}

async function uniqueSlug(sb: SupabaseClient, title: string) {
  const base = slugify(title) || `project-${Math.random().toString(36).slice(2, 7)}`;
  // Every slug, Trash included: the column is unique across all of them.
  const { data } = await sb.from('projects').select('slug');
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export interface CreateProgress {
  label: string;
  /** 0–1 */
  value: number;
}

/**
 * Creates one project from a draft. `lists` is a working copy that this call
 * adds to, so several drafts in a row reuse each other's new clients and tags.
 * Returns the new project's id, and any assets that couldn't be added.
 */
export async function createFromDraft(
  sb: SupabaseClient,
  lists: Lists,
  draft: ProjectDraft,
  assets: DeckAsset[],
  links: string[],
  onProgress: (p: CreateProgress) => void,
): Promise<{ id: string; skipped: string[] }> {
  onProgress({ label: 'Saving the details', value: 0 });
  const [clientIds, categoryIds, capabilityIds, toolIds] = [
    await idsFor(sb, 'clients', lists.clients, draft.client_names),
    await idsFor(sb, 'categories', lists.categories, draft.type_names),
    await idsFor(sb, 'tags', lists.tags, draft.capability_names, 'capability'),
    await idsFor(sb, 'tags', lists.tags, draft.tool_names, 'tool'),
  ];

  const { data: last } = await sb.from('projects').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const id = newId();
  const { error } = await sb.from('projects').insert({
    id,
    title: draft.title.trim() || 'Untitled project',
    slug: await uniqueSlug(sb, draft.title),
    client_ids: clientIds,
    category_ids: categoryIds,
    tag_ids: [...capabilityIds, ...toolIds],
    year: draft.year >= 1990 && draft.year <= 2100 ? draft.year : null,
    status: draft.status,
    one_liner: draft.one_liner.trim() || null,
    summary: draft.summary.trim() || null,
    objective: draft.objective.trim() || null,
    concept: draft.concept.trim() || null,
    output_summary: draft.output_summary.trim() || null,
    turnaround: draft.turnaround.trim() || null,
    visibility: 'draft',
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) throw new Error(`The project couldn't be created: ${error.message}`);

  const touchpoints = draft.touchpoints
    .filter((t) => t.kind !== CUSTOM || t.label?.trim())
    .map((t, i) => ({ id: newId(), project_id: id, kind: t.kind, label: t.kind === CUSTOM ? t.label!.trim() : null, body: t.body.trim(), sort_order: i }));
  const items = draft.deliverables
    .filter((t) => t.trim())
    .map((text, i) => ({ id: newId(), project_id: id, type: 'deliverable', text: text.trim(), sort_order: i }));
  const writes = await Promise.all([
    touchpoints.length ? sb.from('ai_touchpoints').insert(touchpoints) : { error: null },
    items.length ? sb.from('list_items').insert(items) : { error: null },
  ]);
  const failed = writes.find((w) => w.error);
  if (failed?.error) throw new Error(`Some details didn't save: ${failed.error.message}`);

  // Media, in the order chosen. Uploads that fail are reported but don't stop the rest.
  const skipped: string[] = [];
  const added: { media: Media; assetId?: string }[] = [];
  const total = assets.length + links.length;
  let done = 0;
  for (const asset of assets) {
    onProgress({ label: `Uploading ${asset.file.name}`, value: done / Math.max(1, total) });
    try {
      let send = asset.file;
      if (asset.kind === 'image') send = await compressImage(send);
      if (needsCompression(send)) {
        send = await compressMedia(send, (p) => onProgress({ label: `Shrinking ${asset.file.name}`, value: (done + p * 0.9) / total }));
      }
      const limit = asset.kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (send.size > limit) throw new Error(`${(send.size / MB).toFixed(0)} MB is over the ${limit / MB} MB limit`);
      const path = `projects/${id}/${newId()}.${extOf(send)}`;
      const [aspect, url] = await Promise.all([detectAspect(send), uploadToStorage(sb, path, send)]);
      const media: Media = { id: newId(), project_id: id, kind: asset.kind, url, storage_path: path, aspect, caption: null, sort_order: added.length };
      const { error: mErr } = await sb.from('media').insert(media);
      if (mErr) throw mErr;
      added.push({ media, assetId: asset.id });
    } catch (e) {
      skipped.push(`${asset.file.name}: ${(e as Error).message}`);
    }
    done++;
  }
  for (const link of links) {
    onProgress({ label: 'Adding video links', value: done / Math.max(1, total) });
    const found = await fetch('/api/embed-aspect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: link }) })
      .then((r) => (r.ok ? r.json() : { aspect: null }))
      .catch(() => ({ aspect: null }));
    const aspect: Aspect = found.aspect ?? '16:9';
    const media: Media = { id: newId(), project_id: id, kind: 'embed', url: link, storage_path: null, aspect, caption: null, sort_order: added.length };
    const { error: mErr } = await sb.from('media').insert(media);
    if (mErr) skipped.push(`${link}: ${mErr.message}`);
    else added.push({ media });
    done++;
  }

  // Cover: the picked picture. Hero: an uploaded video if there is one (it plays in the banner), else the cover.
  const cover = added.find((a) => a.assetId === draft.cover_asset_id)?.media ?? added.find((a) => a.media.kind === 'image')?.media;
  const hero = added.find((a) => a.media.kind === 'video')?.media ?? cover;
  if (cover || hero) await sb.from('projects').update({ cover_media_id: cover?.id ?? null, hero_media_id: hero?.id ?? null }).eq('id', id);
  onProgress({ label: 'Done', value: 1 });
  return { id, skipped };
}
