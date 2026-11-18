import type { DraftUsage } from './import/types';
import { VISIBILITY_LABEL } from './format';
import type { Visibility } from './types';

// The activity log, as people read it: raw entries (written by the database
// triggers, and by the deck importer for AI usage) grouped into lines like
// "Added 16 pictures to Blinkie".

export interface ActivityRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  label: string | null;
  project_id: string | null;
  details: Record<string, unknown>;
}

export type ActivityArea = 'projects' | 'ai' | 'lists' | 'settings' | 'enquiries';

export function areaOf(action: string): ActivityArea {
  if (action.startsWith('project.') || action.startsWith('media.')) return 'projects';
  if (action.startsWith('ai.')) return 'ai';
  if (action.startsWith('list.')) return 'lists';
  if (action.startsWith('settings.')) return 'settings';
  return 'enquiries';
}

const FIELD_LABEL: Record<string, string> = {
  title: 'title',
  slug: 'web address',
  client_ids: 'clients',
  category_ids: 'project type',
  tag_ids: 'capabilities and tools',
  year: 'year',
  status: 'status',
  status_note: 'status note',
  one_liner: 'one-liner',
  about: 'About',
  summary: 'summary',
  objective: 'objective',
  concept: 'concept',
  output_summary: 'Output',
  turnaround: 'turnaround / result',
  ai_touchpoints: 'AI touchpoints',
  result_figures: 'key figures',
  deliverables: 'deliverables',
  overview: 'Overview',
  capabilities_summary: 'Capabilities',
  workflow_label: 'AI workflow',
  ai_workflow: 'AI workflow',
  cover_media_id: 'cover',
  hero_media_id: 'hero',
};

const LIST_KIND: Record<string, string> = { client: 'client', type: 'project type', capability: 'capability', tool: 'AI tool' };

const SETTING_LABEL: Record<string, string> = {
  hero_title: 'home page title',
  hero_intro: 'home page intro',
  showreel: 'showreel',
  contact_email: 'contact email',
  contact_phone: 'contact phone',
  contact_address: 'contact address',
};

const MEDIA_NOUN: Record<string, [string, string]> = {
  image: ['picture', 'pictures'],
  video: ['video', 'videos'],
  embed: ['video link', 'video links'],
  audio: ['audio track', 'audio tracks'],
};

/** One line in the log: one entry, or several of the same kind made together. */
export interface ActivityGroup {
  id: string;
  /** The newest entry's time. */
  at: string;
  /** The oldest entry's time, for merging. */
  from: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  label: string | null;
  project_id: string | null;
  details: Record<string, unknown>;
  fields: string[];
  /** Media added or removed, by kind. */
  media: Record<string, number>;
  settings: string[];
  count: number;
}

/** Entries by the same person, about the same thing, within this long of each other become one line. */
const MERGE_WINDOW_MS = 10 * 60 * 1000;
const MERGES_INTO_CREATED = new Set(['project.edited', 'media.added']);

function startGroup(r: ActivityRow): ActivityGroup {
  return {
    id: r.id,
    at: r.created_at,
    from: r.created_at,
    actor_id: r.actor_id,
    actor_email: r.actor_email,
    action: r.action,
    entity_type: r.entity_type,
    label: r.label,
    project_id: r.project_id,
    details: r.details ?? {},
    fields: (r.details?.fields as string[] | undefined) ?? [],
    media: r.action.startsWith('media.') ? { [String(r.details?.kind ?? 'image')]: 1 } : {},
    settings: r.action === 'settings.updated' && r.label ? [r.label] : [],
    count: 1,
  };
}

function canMerge(g: ActivityGroup, r: ActivityRow) {
  if (g.actor_id !== r.actor_id) return false;
  if (Date.parse(g.from) - Date.parse(r.created_at) > MERGE_WINDOW_MS) return false;
  if (r.action === 'settings.updated') return g.action === 'settings.updated';
  if (!g.project_id || g.project_id !== r.project_id) return false;
  if (g.action === r.action && ['project.edited', 'media.added', 'media.removed'].includes(r.action)) return true;
  // Edits and media made together (as the importer and the editor do) read as one line.
  if (MERGES_INTO_CREATED.has(g.action) && MERGES_INTO_CREATED.has(r.action)) return true;
  // A project and what was added to it straight after: "Created Blinkie with 16 pictures".
  if (r.action === 'project.created' && MERGES_INTO_CREATED.has(g.action)) return true;
  return false;
}

/** Groups entries (newest first) into lines. */
export function groupActivity(rows: ActivityRow[]): ActivityGroup[] {
  const out: ActivityGroup[] = [];
  for (const r of rows) {
    const g = out[out.length - 1];
    if (!g || !canMerge(g, r)) {
      out.push(startGroup(r));
      continue;
    }
    g.from = r.created_at;
    g.count += 1;
    for (const f of (r.details?.fields as string[] | undefined) ?? []) if (!g.fields.includes(f)) g.fields.push(f);
    if (r.action.startsWith('media.')) {
      const k = String(r.details?.kind ?? 'image');
      g.media[k] = (g.media[k] ?? 0) + 1;
    }
    if (r.action === 'settings.updated' && r.label && !g.settings.includes(r.label)) g.settings.push(r.label);
    // Edits and added media together read as an edit that lists both.
    if (g.action !== r.action && MERGES_INTO_CREATED.has(g.action) && MERGES_INTO_CREATED.has(r.action)) g.action = 'project.edited';
    if (r.action === 'project.created') {
      // The created entry is older; it names the line and keeps the project's first title.
      g.action = 'project.created';
      g.id = r.id;
      g.details = r.details ?? {};
    }
  }
  return out;
}

const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const mediaList = (m: Record<string, number>) =>
  list(Object.entries(m).map(([k, n]) => `${n} ${(MEDIA_NOUN[k] ?? [k, `${k}s`])[n === 1 ? 0 : 1]}`));

/** A line's words, split so the page can link the project's name. */
export function describe(g: ActivityGroup): { before: string; name: string | null; after: string } {
  const name = g.label;
  const fields = list(g.fields.map((f) => FIELD_LABEL[f] ?? f));
  switch (g.action) {
    case 'project.created': {
      const extra = Object.keys(g.media).length ? ` with ${mediaList(g.media)}` : '';
      const draft = g.details.visibility === 'draft' ? ' as a draft' : g.details.visibility === 'hidden' ? ' as hidden' : '';
      return { before: 'Created ', name, after: `${draft}${extra}` };
    }
    case 'project.edited': {
      const added = Object.keys(g.media).length ? `added ${mediaList(g.media)}` : '';
      return { before: 'Edited ', name, after: fields || added ? `: ${[fields, added].filter(Boolean).join('; ')}` : '' };
    }
    case 'project.published':
      return { before: 'Published ', name, after: fields ? ` (and edited ${fields})` : '' };
    case 'project.visibility':
      return { before: 'Moved ', name, after: ` to ${VISIBILITY_LABEL[g.details.to as Visibility] ?? g.details.to}${fields ? ` (and edited ${fields})` : ''}` };
    case 'project.featured':
      return { before: 'Featured ', name, after: ' on the home page' };
    case 'project.unfeatured':
      return { before: 'Took ', name, after: ' off the home page' };
    case 'project.trashed':
      return { before: 'Archived ', name, after: '' };
    case 'project.restored':
      return { before: 'Restored ', name, after: ' from Archived' };
    case 'project.deleted':
      return { before: 'Deleted ', name, after: ' for good' };
    case 'media.added':
      return { before: `Added ${mediaList(g.media)} to `, name, after: '' };
    case 'media.removed':
      return { before: `Removed ${mediaList(g.media)} from `, name, after: '' };
    case 'list.added':
      return { before: `Added ${LIST_KIND[g.entity_type] ?? g.entity_type} `, name: null, after: name ?? '' };
    case 'list.renamed':
      return { before: `Renamed ${LIST_KIND[g.entity_type] ?? g.entity_type} ${g.details.from} to `, name: null, after: name ?? '' };
    case 'list.logo':
      return { before: 'Updated the logo for ', name: null, after: name ?? '' };
    case 'list.removed':
      return { before: `Removed ${LIST_KIND[g.entity_type] ?? g.entity_type} `, name: null, after: name ?? '' };
    case 'settings.updated':
      return { before: `Changed the ${list(g.settings.map((s) => SETTING_LABEL[s] ?? s))}`, name: null, after: '' };
    case 'enquiry.received':
      return { before: `New enquiry from ${name ?? 'a visitor'}`, name: null, after: '' };
    case 'ai.draft': {
      const d = g.details as Partial<DraftUsage> & { outcome?: string; projects?: string[] };
      if (d.outcome === 'declined') return { before: `AI declined to draft ${name}`, name: null, after: '' };
      if (d.outcome === 'too_long') return { before: `AI draft of ${name} stopped: deck too long`, name: null, after: '' };
      const n = d.projects?.length ?? 0;
      return { before: `Drafted ${n} project${n === 1 ? '' : 's'} with AI from ${name}`, name: null, after: d.projects?.length ? `: ${list(d.projects)}` : '' };
    }
    default:
      return { before: g.action, name: null, after: name ? ` ${name}` : '' };
  }
}

/** "tasha" from tasha@kult.studio. Enquiries come from visitors; other changes with no one signed in were made in Supabase itself. */
export function personName(email: string | null, action = '') {
  if (email) return email.split('@')[0];
  return action.startsWith('enquiry.') ? 'Visitor' : 'Supabase';
}
