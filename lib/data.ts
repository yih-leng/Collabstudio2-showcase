import 'server-only';
import { cache } from 'react';
import { STATUS_LABEL, embedProvider } from './format';
import { getServerClient } from './supabase/server';
import { touchpointLabel } from './touchpoints';
import type {
  AiTouchpoint,
  ListItemRow,
  Lists,
  Media,
  Project,
  ProjectCardData,
  ProjectDetailData,
  ProjectTypeSummary,
  ResultFigure,
  ShowcaseSlide,
  SiteSettings,
} from './types';

// Server-side reads for the public pages. Row-level security decides what
// comes back (a signed-in admin also gets drafts and internal work), whether
// that is Supabase or the local demo (lib/demo), which applies the same rules.

const DEFAULT_SETTINGS: SiteSettings = {
  hero_title: 'AI Creative Showcase',
  hero_intro: '',
  showreel: null,
  contact_email: '',
  contact_phone: '',
  contact_address: '',
};

const byOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

export async function getSettings(): Promise<SiteSettings> {
  const sb = await getServerClient();
  const rows: { key: string; value: unknown }[] = (await sb.from('settings').select('key, value')).data ?? [];
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const r of rows) if (r.value !== undefined) out[r.key] = r.value;
  return out as unknown as SiteSettings;
}

export async function getLists(): Promise<Lists> {
  const sb = await getServerClient();
  const [c, cat, t] = await Promise.all([
    sb.from('clients').select('*').order('sort_order'),
    sb.from('categories').select('*').order('sort_order'),
    sb.from('tags').select('*').order('sort_order'),
  ]);
  return { clients: c.data ?? [], categories: cat.data ?? [], tags: t.data ?? [] };
}

/** Projects the current visitor may see, newest site order first. Excludes trash. */
/** Our Works order: featured work first (in featured order), then the rest in site order. */
function workOrder(projects: Project[]): Project[] {
  const featured = projects.filter((p) => p.featured).sort((a, b) => a.featured_order - b.featured_order);
  return [...featured, ...projects.filter((p) => !p.featured)];
}

async function getVisibleProjects(): Promise<Project[]> {
  const sb = await getServerClient();
  const { data } = await sb.from('projects').select('*').is('deleted_at', null).order('sort_order');
  return (data ?? []) as Project[];
}

async function getMediaByIds(ids: string[]): Promise<Media[]> {
  if (!ids.length) return [];
  const sb = await getServerClient();
  const { data } = await sb.from('media').select('*').in('id', ids);
  return (data ?? []) as Media[];
}

function resolveCard(p: Project, lists: Lists, media: Media[]): ProjectCardData {
  const pick = <T extends { id: string }>(all: T[], ids: string[]) =>
    ids.map((id) => all.find((x) => x.id === id)).filter(Boolean) as T[];
  const tags = pick(lists.tags, p.tag_ids);
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    clients: pick(lists.clients, p.client_ids),
    categories: pick(lists.categories, p.category_ids),
    capabilities: tags.filter((t) => t.type === 'capability'),
    tools: tags.filter((t) => t.type === 'tool'),
    year: p.year,
    status: p.status,
    status_note: p.status_note,
    one_liner: p.one_liner,
    featured: p.featured,
    cover: media.find((m) => m.id === p.cover_media_id) ?? null,
  };
}

/** Media that can play silently by itself: uploads, YouTube, Vimeo (Google Drive can't autoplay). Audio has no picture. */
const canAutoplay = (m: Media | null) =>
  !!m && (m.kind === 'video' || (m.kind === 'embed' && embedProvider(m.url) !== 'Google Drive'));

/** Published projects for the public grid (internal ones only for signed-in admins), each with a clip to preview when it has one. */
export async function getPublishedProjects(): Promise<ProjectCardData[]> {
  const [projects, lists] = await Promise.all([getVisibleProjects(), getLists()]);
  const published = workOrder(projects.filter((p) => p.visibility === 'published'));
  const ids = published.flatMap((p) => [p.cover_media_id, p.hero_media_id]).filter(Boolean) as string[];
  const media = await getMediaByIds([...new Set(ids)]);
  const byId = (id: string | null) => (id ? (media.find((m) => m.id === id) ?? null) : null);
  return published.map((p) => ({
    ...resolveCard(p, lists, media),
    preview: [byId(p.hero_media_id), byId(p.cover_media_id)].find(canAutoplay) ?? null,
  }));
}

export async function getHomeData() {
  const [projects, lists, settings] = await Promise.all([getVisibleProjects(), getLists(), getSettings()]);
  const published = projects.filter((p) => p.visibility === 'published');

  // The banner plays featured work only, in featured order. With nothing featured yet it
  // falls back to all published work in site order, so the home page never opens empty.
  const featured = published.filter((p) => p.featured).sort((a, b) => a.featured_order - b.featured_order);
  const ordered = featured.length ? featured : published;
  // Banner media, plus every published cover for the project type previews.
  const mediaIds = [
    ...ordered.flatMap((p) => [p.hero_media_id, p.cover_media_id]),
    ...published.map((p) => p.cover_media_id),
  ].filter(Boolean) as string[];
  const media = await getMediaByIds([...new Set(mediaIds)]);
  const byId = (id: string | null) => (id ? (media.find((m) => m.id === id) ?? null) : null);

  const slides: ShowcaseSlide[] = ordered.map((p) => {
    const card = resolveCard(p, lists, media);
    const hero = byId(p.hero_media_id);
    const cover = byId(p.cover_media_id);
    // The card shows a still; pointing at it plays what can play silently by itself.
    const moving = canAutoplay;
    const still = (m: Media | null) => m && m.kind === 'image';
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      client: card.clients.map((c) => c.name).join(' × '),
      one_liner: p.one_liner,
      tags: [...card.categories.map((c) => c.name), ...(p.status === 'live' ? [] : [STATUS_LABEL[p.status]])],
      still: [cover, hero].find(still) ?? null,
      media: [hero, cover].find(moving) ?? null,
    };
  });
  if (settings.showreel) {
    const reel = { kind: settings.showreel.kind, url: settings.showreel.url, aspect: '16:9' as const, caption: 'Showreel' };
    slides.unshift({
      id: 'showreel',
      slug: null,
      title: 'Showreel',
      client: 'KULT',
      one_liner: settings.hero_intro || null,
      tags: ['Showreel'],
      still: null,
      media: reel,
    });
  }

  // Client strip: every client on public, published work.
  const clientIds = new Set(published.flatMap((p) => p.client_ids));
  const clients = lists.clients.filter((c) => clientIds.has(c.id));

  // Published work per project type, most first (ties keep the types' own order).
  // A project with several types counts once under each. The preview cycles
  // through their covers in site order.
  const inSiteOrder = workOrder(published);
  const projectTypes: ProjectTypeSummary[] = lists.categories
    .map((c) => {
      const work = inSiteOrder.filter((p) => p.category_ids.includes(c.id));
      const covers = work.map((p) => byId(p.cover_media_id)).filter(Boolean) as Media[];
      return { id: c.id, name: c.name, count: work.length, covers };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  return { settings, slides, clients, projectCount: published.length, projectTypes };
}

/**
 * One project page's data. Wrapped in React's cache, so the page and its metadata
 * share one set of queries per request; the lists and the next/previous lookup
 * run alongside the project's own rows rather than after them.
 */
export const getProjectDetail = cache(async (slug: string): Promise<ProjectDetailData | null> => {
  const sb = await getServerClient();
  const listsP = getLists();
  const visibleP = getVisibleProjects();
  const { data } = await sb.from('projects').select('*').eq('slug', slug).maybeSingle();
  const project = (data as Project) ?? null;
  if (!project) return null;
  const [tp, f, i, m, lists, visible] = await Promise.all([
    sb.from('ai_touchpoints').select('*').eq('project_id', project.id),
    sb.from('result_figures').select('*').eq('project_id', project.id),
    sb.from('list_items').select('*').eq('project_id', project.id),
    sb.from('media').select('*').eq('project_id', project.id),
    listsP,
    visibleP,
  ]);
  const touchpoints = ((tp.data ?? []) as AiTouchpoint[]).filter((t) => touchpointLabel(t));
  const figures = (f.data ?? []) as ResultFigure[];
  const items = (i.data ?? []) as ListItemRow[];
  const media = (m.data ?? []) as Media[];

  const card = resolveCard(project, lists, media);

  // Next / previous among published work, in the same order as Our Works.
  const all = workOrder(visible.filter((p) => p.visibility === 'published'));
  const idx = all.findIndex((p) => p.id === project!.id);
  const link = (p?: Project) => (p ? { slug: p.slug, title: p.title } : null);

  return {
    ...card,
    summary: project.summary,
    objective: project.objective,
    concept: project.concept,
    output_summary: project.output_summary,
    turnaround: project.turnaround,
    touchpoints: touchpoints.sort(byOrder),
    figures: figures.sort(byOrder),
    visibility: project.visibility,
    is_internal: project.is_internal,
    hero: media.find((m) => m.id === project!.hero_media_id) ?? null,
    deliverables: items.filter((i) => i.type === 'deliverable').sort(byOrder),
    gallery: media.filter((m) => m.id !== project!.hero_media_id).sort(byOrder),
    prev: idx > 0 ? link(all[idx - 1]) : null,
    next: idx >= 0 && idx < all.length - 1 ? link(all[idx + 1]) : null,
    // A deleted project is only reachable by an admin; treat it like a draft.
    ...(project.deleted_at ? { visibility: 'hidden' as const } : {}),
  };
});
