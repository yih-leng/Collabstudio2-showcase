import 'server-only';
import { DEMO_USER } from './config';

// The local demo's copy of the activity triggers in
// supabase/migrations/0005_activity.sql: the same entries, written by the
// demo store when it changes a row. Keep the two in step.

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

const PROJECT_FIELDS = [
  'title', 'slug', 'client_ids', 'category_ids', 'tag_ids', 'year', 'status', 'status_note', 'one_liner', 'about',
  'summary', 'objective', 'concept', 'output_summary', 'turnaround', 'capabilities_summary', 'workflow_label', 'cover_media_id', 'hero_media_id',
];

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

let last = 0;
/** Strictly increasing, so entries from one save keep their order. */
function stamp() {
  last = Math.max(Date.now(), last + 1);
  return new Date(last).toISOString();
}

/** Adds an entry, stamped with whoever is signed in (the demo admin, or nobody for a visitor). */
export function addActivity(db: Db, admin: boolean, entry: Row) {
  db.activity ??= [];
  db.activity.push({
    id: crypto.randomUUID(),
    entity_id: null,
    label: null,
    project_id: null,
    details: {},
    ...entry,
    created_at: stamp(),
    actor_id: admin ? DEMO_USER.id : null,
    actor_email: admin ? DEMO_USER.email : null,
  });
}

/** Logs one changed row, as the triggers do. `before` is null for an insert, `after` null for a delete. */
export function logChange(db: Db, admin: boolean, table: string, before: Row | null, after: Row | null) {
  const r = (after ?? before)!;
  const log = (action: string, entity_type: string, label: unknown, project_id: unknown, details: Row = {}) =>
    addActivity(db, admin, { action, entity_type, entity_id: r.id ?? null, label, project_id, details });

  if (table === 'projects') {
    if (!before) return log('project.created', 'project', r.title, r.id, { visibility: r.visibility });
    if (!after) return log('project.deleted', 'project', r.title, r.id);
    if (!before.deleted_at && after.deleted_at) return log('project.trashed', 'project', r.title, r.id);
    if (before.deleted_at && !after.deleted_at) return log('project.restored', 'project', r.title, r.id);
    const fields = PROJECT_FIELDS.filter((f) => !same(before[f], after[f]));
    if (before.visibility !== after.visibility) {
      log(after.visibility === 'published' ? 'project.published' : 'project.visibility', 'project', r.title, r.id, {
        from: before.visibility,
        to: after.visibility,
        fields,
      });
    } else if (fields.length) {
      log('project.edited', 'project', r.title, r.id, { fields });
    }
    if (!same(before.featured, after.featured)) log(after.featured ? 'project.featured' : 'project.unfeatured', 'project', r.title, r.id);
    return;
  }

  if (['media', 'overview_blocks', 'list_items', 'ai_touchpoints', 'result_figures'].includes(table)) {
    const title = db.projects?.find((p) => p.id === r.project_id)?.title;
    if (!title) return; // the project is being deleted
    if (table === 'media') {
      if (!before) log('media.added', 'media', title, r.project_id, { kind: r.kind });
      else if (!after) log('media.removed', 'media', title, r.project_id, { kind: r.kind });
      return;
    }
    // A reorder alone isn't an edit.
    const content = (x: Row) => JSON.stringify({ ...x, sort_order: undefined });
    if (before && after && content(before) === content(after)) return;
    const field =
      table === 'overview_blocks' ? 'overview' : table === 'list_items' ? (r.type === 'deliverable' ? 'deliverables' : 'ai_workflow') : table;
    addActivity(db, admin, { action: 'project.edited', entity_type: 'project', entity_id: r.project_id, label: title, project_id: r.project_id, details: { fields: [field] } });
    return;
  }

  if (table === 'clients' || table === 'categories' || table === 'tags') {
    const kind = table === 'clients' ? 'client' : table === 'categories' ? 'type' : String(r.type);
    if (!before) return log('list.added', kind, r.name, null);
    if (!after) return log('list.removed', kind, r.name, null);
    if (!same(before.name, after.name)) return log('list.renamed', kind, r.name, null, { from: before.name });
    if (table === 'clients' && !same(before.logo_url, after.logo_url)) return log('list.logo', kind, r.name, null);
    return;
  }

  if (table === 'settings') {
    if (before && after && same(before.value, after.value)) return;
    if (after) addActivity(db, admin, { action: 'settings.updated', entity_type: 'settings', label: r.key });
    return;
  }

  if (table === 'enquiries' && !before) log('enquiry.received', 'enquiry', r.company || r.name, null);
}
