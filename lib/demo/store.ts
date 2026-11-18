import 'server-only';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import seed from '../seed.generated.json';
import { addActivity, logChange } from './activity';
import { DEMO_USER, isDemoMode } from './config';
import type { Filter, QueryResult, QuerySpec } from './query';

// The demo database: one JSON file in .demo/, started from the sample
// projects. It applies the same rules as the Supabase row-level security, so
// visitors only see published, public work and only the admin can write.

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

export const DEMO_DIR = path.join(process.cwd(), '.demo');
const DB_FILE = path.join(DEMO_DIR, 'db.json');

const CHILD_TABLES = ['overview_blocks', 'list_items', 'media', 'ai_touchpoints', 'result_figures'];
const PUBLIC_READ = ['clients', 'categories', 'tags', 'settings'];

const DEFAULTS: Record<string, () => Row> = {
  projects: () => ({
    client_ids: [], category_ids: [], tag_ids: [], year: null, status: 'concept', status_note: null,
    one_liner: null, about: null, summary: null, objective: null, concept: null, output_summary: null, turnaround: null, capabilities_summary: null, workflow_label: null,
    featured: false, featured_order: 0, sort_order: 0, visibility: 'draft', is_internal: false,
    cover_media_id: null, hero_media_id: null, updated_at: new Date().toISOString(), deleted_at: null,
  }),
  media: () => ({ storage_path: null, aspect: '16:9', caption: null, sort_order: 0 }),
  overview_blocks: () => ({ body: '', sort_order: 0 }),
  list_items: () => ({ sort_order: 0 }),
  ai_touchpoints: () => ({ label: null, body: '', sort_order: 0 }),
  result_figures: () => ({ label: '', sort_order: 0 }),
  clients: () => ({ logo_url: null, logo_path: null, sort_order: 0 }),
  categories: () => ({ sort_order: 0 }),
  tags: () => ({ sort_order: 0 }),
  enquiries: () => ({ company: null, is_read: false }),
};

/** Columns that must be unique, per table (as in the migration). */
const UNIQUE: Record<string, string[][]> = {
  projects: [['slug']],
  clients: [['name']],
  categories: [['name']],
  tags: [['name', 'type']],
};

// Pages and API routes can run in separate server bundles, each with its own
// copy of this module, so the file (not memory) is the source of truth.
let cache: Db | null = null;
let cachedAt = 0;

function initial(): Db {
  const db = JSON.parse(JSON.stringify(seed)) as Db;
  db.admins = [{ user_id: DEMO_USER.id }];
  db.enquiries = [
    {
      id: crypto.randomUUID(),
      name: 'Sample enquiry',
      company: 'Demo Brand',
      email: 'someone@example.com',
      message: 'This is a sample enquiry so the inbox has something in it.\nSend one from the contact page (/contact) to see it arrive.',
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ];
  return db;
}

function load(): Db {
  if (isDemoMode && existsSync(DB_FILE)) {
    const mtime = statSync(DB_FILE).mtimeMs;
    if (cache && mtime === cachedAt) return cache;
    cache = JSON.parse(readFileSync(DB_FILE, 'utf8')) as Db;
    cachedAt = mtime;
    // Columns added after the file was made, and the old "internal" flag, which is now Hidden.
    for (const p of cache.projects ?? []) {
      for (const k of ['about', 'summary', 'objective', 'concept', 'turnaround']) if (!(k in p)) p[k] = null;
      if (p.is_internal) Object.assign(p, { is_internal: false, visibility: 'hidden' });
    }
  } else if (!cache) {
    cache = initial();
  }
  return cache;
}

function save(db: Db) {
  if (!isDemoMode) return;
  mkdirSync(DEMO_DIR, { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  cachedAt = statSync(DB_FILE).mtimeMs;
}

const nil = (v: unknown) => (v === undefined ? null : v);

function matches(r: Row, f: Filter) {
  const v = nil(r[f.col]);
  switch (f.op) {
    case 'eq':
      return v === f.val;
    case 'in':
      return f.val.includes(v);
    case 'is':
      return v === f.val;
    case 'not':
      return v !== f.val;
    case 'contains':
      return Array.isArray(v) && f.val.every((x) => v.includes(x));
  }
}

function isPublicProject(db: Db, id: unknown) {
  return db.projects.some((p) => p.id === id && p.visibility === 'published' && !p.is_internal && !p.deleted_at);
}

/** Row-level security, as in the migration. */
function canRead(db: Db, table: string, r: Row, admin: boolean) {
  if (admin) return true;
  if (PUBLIC_READ.includes(table)) return true;
  if (table === 'projects') return isPublicProject(db, r.id);
  if (CHILD_TABLES.includes(table)) return isPublicProject(db, r.project_id);
  return false;
}

function uniqueClash(db: Db, table: string, row: Row) {
  return (UNIQUE[table] ?? []).some((cols) =>
    db[table].some((o) => o.id !== row.id && cols.every((c) => o[c] === row[c])),
  );
}

const clash = { message: 'duplicate key value violates unique constraint', code: '23505' };
const denied = { message: 'Only a signed-in admin can do that.', code: '42501' };

export function runQuery(spec: QuerySpec, admin: boolean): QueryResult {
  const db = load();
  const t = spec.table;
  db[t] ??= [];
  const hit = (r: Row) => spec.filters.every((f) => matches(r, f));
  const writes = spec.action !== 'select';
  const publicInsert = t === 'enquiries' && spec.action === 'insert';

  if (writes && !admin && !publicInsert) return { data: null, error: denied };
  // The activity log is append-only, as in the migration.
  if (t === 'activity' && writes && spec.action !== 'insert') return { data: null, error: denied };
  if (writes && !isDemoMode) return { data: null, error: { message: 'The sample site is read-only. Connect Supabase to edit.' } };

  const result = (rows: Row[]): QueryResult => {
    if (!spec.returning && writes) return { data: null, error: null };
    if (spec.single) {
      if (spec.single === 'one' && rows.length !== 1) return { data: null, error: { message: 'Expected one row' } };
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  };

  if (spec.action === 'insert' || spec.action === 'upsert') {
    const key = t === 'settings' ? 'key' : t === 'admins' ? 'user_id' : 'id';
    const input = (Array.isArray(spec.payload) ? spec.payload : [spec.payload]) as Row[];
    const out: Row[] = [];
    if (t === 'activity') {
      // Stamped with the signed-in person, whatever the insert says (as the migration's trigger does).
      for (const p of input) addActivity(db, admin, p);
      save(db);
      return result([]);
    }
    for (const p of input) {
      const existing = spec.action === 'upsert' ? db[t].find((x) => p[key] !== undefined && x[key] === p[key]) : undefined;
      if (existing) {
        const next = { ...existing, ...p };
        if (uniqueClash(db, t, next)) return { data: null, error: clash };
        const before = { ...existing };
        Object.assign(existing, p);
        logChange(db, admin, t, before, existing);
        out.push(existing);
        continue;
      }
      const row: Row = {
        ...(key === 'id' ? { id: crypto.randomUUID(), created_at: new Date().toISOString() } : {}),
        ...(DEFAULTS[t]?.() ?? {}),
        ...p,
      };
      if (uniqueClash(db, t, row)) return { data: null, error: clash };
      db[t].push(row);
      logChange(db, admin, t, null, row);
      out.push(row);
    }
    save(db);
    return result(out.map((r) => ({ ...r })));
  }

  if (spec.action === 'update') {
    const rows = db[t].filter(hit);
    for (const r of rows) {
      const next = { ...r, ...(spec.payload as Row) };
      if (uniqueClash(db, t, next)) return { data: null, error: clash };
    }
    for (const r of rows) {
      const before = { ...r };
      Object.assign(r, spec.payload as Row);
      if (t === 'projects') r.updated_at = new Date().toISOString();
      logChange(db, admin, t, before, r);
    }
    save(db);
    return result(rows.map((r) => ({ ...r })));
  }

  if (spec.action === 'delete') {
    const gone = db[t].filter(hit);
    db[t] = db[t].filter((r) => !hit(r));
    for (const r of gone) logChange(db, admin, t, r, null);
    const ids = new Set(gone.map((r) => r.id));
    // The migration's foreign keys: children go with their project; a deleted
    // cover or hero clears the project's pointer to it.
    if (t === 'projects') for (const c of CHILD_TABLES) db[c] = (db[c] ?? []).filter((r) => !ids.has(r.project_id));
    if (t === 'media') {
      for (const p of db.projects) {
        if (ids.has(p.cover_media_id)) p.cover_media_id = null;
        if (ids.has(p.hero_media_id)) p.hero_media_id = null;
      }
    }
    save(db);
    return result(gone);
  }

  let rows = db[t].filter((r) => canRead(db, t, r, admin) && hit(r)).map((r) => ({ ...r }));
  for (const { col, asc } of [...spec.orders].reverse()) {
    rows.sort((a, b) => {
      const x = a[col] as string | number;
      const y = b[col] as string | number;
      return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1);
    });
  }
  if (spec.limit !== undefined) rows = rows.slice(0, spec.limit);
  if (spec.head) return { data: null, error: null, count: rows.length };
  return result(rows);
}
