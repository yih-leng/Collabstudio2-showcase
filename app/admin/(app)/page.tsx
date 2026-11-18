'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Dropdown,
  EmptyState,
  Filters,
  InfoBanner,
  Modal,
  PageHeader,
  Switch,
  Table,
  Tabs,
  useToast,
  type FilterValue,
  type TableColumn,
} from '@collabrium/ui';
import { Eye, FilmSlate, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminContext';
import { ImportButton } from '@/components/admin/import/ImportButton';
import { useImport } from '@/components/admin/import/ImportContext';
import { SortableList } from '@/components/admin/SortableList';
import styles from '@/components/admin/admin.module.css';
import { MediaFrame } from '@/components/MediaFrame';
import { saveOrder } from '@/lib/admin-api';
import { STATUS_BADGE, STATUS_LABEL, VISIBILITY_LABEL, formatDate, statusText } from '@/lib/format';
import type { Media, Project, ProjectStatus, Visibility } from '@/lib/types';

type Row = Project & { cover: Media | null };

export default function ProjectsPage() {
  const { sb, lists } = useAdmin();
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [trashing, setTrashing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<FilterValue>({});
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await sb.from('projects').select('*').is('deleted_at', null).order('sort_order');
    if (error) {
      setLoadError(true);
      return;
    }
    const projects = (data ?? []) as Project[];
    const coverIds = projects.map((p) => p.cover_media_id).filter(Boolean) as string[];
    const { data: media } = coverIds.length ? await sb.from('media').select('*').in('id', coverIds) : { data: [] };
    setRows(projects.map((p) => ({ ...p, cover: (media ?? []).find((m) => m.id === p.cover_media_id) ?? null })));
    setLoadError(false);
  }, [sb]);

  // Reload when Import from deck creates projects.
  const { createdAt, show: showImport } = useImport();
  useEffect(() => {
    load();
  }, [load, createdAt]);

  // /admin?import=1 (and the old /admin/import address) opens Import from deck.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('import') !== null) {
      showImport();
      router.replace('/admin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = async (id: string, values: Partial<Project>, done?: string) => {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...values } : r)) ?? rs);
    const { error } = await sb.from('projects').update(values).eq('id', id);
    if (error) {
      toast({ tone: 'danger', title: "That change didn't save", message: error.message });
      load();
    } else if (done) toast({ tone: 'success', title: done });
  };

  const toggleFeatured = (row: Row, on: boolean) => {
    const max = Math.max(-1, ...(rows ?? []).filter((r) => r.featured).map((r) => r.featured_order));
    patch(row.id, on ? { featured: true, featured_order: max + 1 } : { featured: false }, on ? 'Featured on the home page' : 'Taken off the home page');
  };

  const createProject = async () => {
    setCreating(true);
    const suffix = Math.random().toString(36).slice(2, 7);
    const max = Math.max(-1, ...(rows ?? []).map((r) => r.sort_order));
    const { data, error } = await sb
      .from('projects')
      .insert({ title: 'Untitled project', slug: `untitled-${suffix}`, visibility: 'draft', sort_order: max + 1 })
      .select('id')
      .single();
    setCreating(false);
    if (error || !data) {
      toast({ tone: 'danger', title: "We couldn't create the project", message: error?.message });
      return;
    }
    router.push(`/admin/projects/${data.id}`);
  };

  const moveToTrash = async () => {
    if (!trashing) return;
    const row = trashing;
    setTrashing(null);
    const { error } = await sb.from('projects').update({ deleted_at: new Date().toISOString(), featured: false }).eq('id', row.id);
    if (error) {
      toast({ tone: 'danger', title: "That didn't move to Trash", message: error.message });
      return;
    }
    setRows((rs) => rs?.filter((r) => r.id !== row.id) ?? rs);
    toast({
      tone: 'success',
      title: 'Moved to Trash',
      message: row.title,
      action: {
        label: 'Undo',
        onClick: async () => {
          await sb.from('projects').update({ deleted_at: null }).eq('id', row.id);
          load();
        },
      },
    });
  };

  const reorder = async (next: Row[], field: 'sort_order' | 'featured_order') => {
    setRows((rs) => {
      if (!rs) return rs;
      const pos = new Map(next.map((r, i) => [r.id, i]));
      return rs.map((r) => (pos.has(r.id) ? { ...r, [field]: pos.get(r.id)! } : r));
    });
    try {
      await saveOrder(sb, 'projects', next.map((r) => r.id), field);
      toast({ tone: 'success', title: 'Order saved' });
    } catch (e) {
      toast({ tone: 'danger', title: "The new order didn't save", message: (e as Error).message });
      load();
    }
  };

  const typeName = (ids: string[]) => ids.map((id) => lists.categories.find((c) => c.id === id)?.name).filter(Boolean).join(', ');
  const STATUS_RANK: Record<ProjectStatus, number> = { live: 0, approved: 1, in_progress: 2, concept: 3 };
  const VIS_RANK: Record<Visibility, number> = { published: 0, draft: 1, hidden: 2 };

  const clientNames = (ids: string[]) =>
    ids.map((id) => lists.clients.find((c) => c.id === id)?.name).filter(Boolean).join(', ');

  const columns: TableColumn<Row>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Project',
        sortable: true,
        sortValue: (r) => r.title.toLowerCase(),
        render: (r) => (
          <div className={styles.titleCell}>
            <div className={styles.thumb}>
              <MediaFrame media={r.cover} aspect="16:9" mode="thumb" placeholderLabel="" />
            </div>
            <div className={styles.titleText}>
              <Link href={`/admin/projects/${r.id}`}>{r.title}</Link>
              <span className={styles.titleSub}>
                {[clientNames(r.client_ids), r.year].filter(Boolean).join(' · ') || 'No client yet'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        sortable: true,
        priority: 'medium',
        sortValue: (r) => typeName(r.category_ids).toLowerCase(),
        render: (r) => typeName(r.category_ids) || '—',
      },
      {
        key: 'status',
        header: 'Status',
        type: 'status',
        sortable: true,
        sortValue: (r) => STATUS_RANK[r.status],
        priority: 'medium',
        render: (r) => <Badge variant={STATUS_BADGE[r.status]}>{statusText(r.status)}</Badge>,
      },
      {
        key: 'visibility',
        header: 'Visibility',
        sortable: true,
        sortValue: (r) => VIS_RANK[r.visibility],
        render: (r) => (
          <div className={styles.badges}>
            <Dropdown
              label={`Visibility for ${r.title}`}
              hideLabel
              appearance="borderless"
              value={r.visibility}
              options={(['published', 'draft', 'hidden'] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))}
              onValueChange={(v) => v && v !== r.visibility && patch(r.id, { visibility: v as Visibility }, `Now ${VISIBILITY_LABEL[v as Visibility].toLowerCase()}`)}
            />
          </div>
        ),
      },
      {
        key: 'featured',
        header: 'Featured',
        sortable: true,
        sortValue: (r) => (r.featured ? 0 : 1),
        render: (r) => (
          <Switch aria-label={`Feature ${r.title} on the home page`} checked={r.featured} onChange={(e) => toggleFeatured(r, e.target.checked)} />
        ),
      },
      {
        key: 'updated_at',
        header: 'Last updated',
        type: 'date',
        priority: 'low',
        sortable: true,
        sortValue: (r) => r.updated_at,
        render: (r) => formatDate(r.updated_at),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists, rows],
  );

  // Search and filters for the All projects table.
  const dimensions = [
    { key: 'status', label: 'Status', options: (Object.keys(STATUS_LABEL) as ProjectStatus[]).map((v) => ({ value: v, label: STATUS_LABEL[v] })) },
    { key: 'visibility', label: 'Visibility', options: (['published', 'draft', 'hidden'] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] })) },
    { key: 'type', label: 'Type', options: lists.categories.map((c) => ({ value: c.id, label: c.name })) },
    { key: 'client', label: 'Client', options: lists.clients.map((c) => ({ value: c.id, label: c.name })) },
    { key: 'featured', label: 'Featured', options: [{ value: 'yes', label: 'Featured' }, { value: 'no', label: 'Not featured' }] },
  ];
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const has = (key: string, vals: string[]) => !filter[key]?.length || filter[key].some((v) => vals.includes(v));
    return (rows ?? []).filter(
      (r) =>
        has('status', [r.status]) &&
        has('visibility', [r.visibility]) &&
        has('type', r.category_ids) &&
        has('client', r.client_ids) &&
        has('featured', [r.featured ? 'yes' : 'no']) &&
        (!q || [r.title, r.slug, clientNames(r.client_ids), typeName(r.category_ids), r.year ? String(r.year) : ''].some((t) => t.toLowerCase().includes(q))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filter, search, lists]);
  const filtering = Boolean(search.trim()) || Object.values(filter).some((v) => v?.length);

  const featured = (rows ?? []).filter((r) => r.featured).sort((a, b) => a.featured_order - b.featured_order);
  const all = [...(rows ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  const orderRow = (r: Row) => (
    <div className={styles.titleCell}>
      <div className={styles.thumb}>
        <MediaFrame media={r.cover} aspect="16:9" mode="thumb" placeholderLabel="" />
      </div>
      <div className={styles.titleText}>
        <strong>{r.title}</strong>
        <span className={styles.titleSub}>
          {VISIBILITY_LABEL[r.visibility]}
        </span>
      </div>
    </div>
  );

  return (
    <AdminShell
      header={
        <PageHeader
          title="Projects"
          subtitle="Add, edit and order the work on the site."
          actions={
            <>
              <ImportButton />
              <Button variant="primary" leadingIcon={Plus} loading={creating} onClick={createProject}>
                New project
              </Button>
            </>
          }
        />
      }
    >
      {loadError ? (
        <EmptyState variant="section" tone="error" icon={FilmSlate} heading="Projects didn't load" primaryAction={{ label: 'Try again', onClick: load }}>
          Check your connection, then try again.
        </EmptyState>
      ) : (
        <Tabs
          aria-label="Project views"
          surface="canvas"
          tabs={[
            {
              id: 'all',
              label: 'All projects',
              count: rows?.length,
              content: (
                <div className={styles.stackSm}>
                  <Filters
                    aria-label="Filter projects"
                    dimensions={dimensions}
                    value={filter}
                    onValueChange={setFilter}
                    search
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search by title, client, type or year"
                  />
                  <Table
                    label="Projects"
                    columns={columns}
                    rows={shown}
                    loading={rows === null}
                    getRowKey={(r) => r.id}
                    getRowLabel={(r) => r.title}
                    rowActions={[
                      { label: 'Edit', icon: PencilSimple, onClick: (r) => router.push(`/admin/projects/${r.id}`) },
                      { label: 'Preview', icon: Eye, onClick: (r) => window.open(`/work/${r.slug}`, '_blank', 'noopener') },
                      { label: 'Move to Trash', icon: Trash, onClick: (r) => setTrashing(r) },
                    ]}
                    empty={
                      filtering ? (
                        <EmptyState
                          variant="section"
                          icon={FilmSlate}
                          heading="No projects match"
                          primaryAction={{
                            label: 'Clear filters',
                            onClick: () => {
                              setFilter({});
                              setSearch('');
                            },
                          }}
                        >
                          Try fewer filters or a different search.
                        </EmptyState>
                      ) : (
                        <EmptyState
                          variant="section"
                          icon={FilmSlate}
                          heading="No projects yet"
                          primaryAction={{ label: 'New project', icon: Plus, onClick: createProject }}
                        >
                          Add your first piece of work and it can go live in minutes.
                        </EmptyState>
                      )
                    }
                  />
                </div>
              ),
            },
            {
              id: 'featured',
              label: 'Featured order',
              count: featured.length,
              content: (
                <div className={styles.stackSm}>
                  <p className={styles.muted}>Only featured projects play in the home page banner, in this order. Drag to change it.</p>
                  {featured.length ? (
                    <Card padding="list">
                      <SortableList items={featured} label={(r) => r.title} showPosition onReorder={(n) => reorder(n, 'featured_order')} renderItem={orderRow} />
                    </Card>
                  ) : (
                    <InfoBanner tone="info">Nothing is featured yet, so the home page banner shows all published work. Turn on Featured for a project in All projects.</InfoBanner>
                  )}
                </div>
              ),
            },
            {
              id: 'order',
              label: 'Site order',
              content: (
                <div className={styles.stackSm}>
                  <p className={styles.muted}>The Work page and next/previous links follow this order. Drag to change it.</p>
                  <Card padding="list">
                    <SortableList items={all} label={(r) => r.title} showPosition onReorder={(n) => reorder(n, 'sort_order')} renderItem={orderRow} />
                  </Card>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={!!trashing}
        onClose={() => setTrashing(null)}
        title="Move this project to Trash?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setTrashing(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={moveToTrash}>
              Move to Trash
            </Button>
          </>
        }
      >
        {trashing?.title} comes off the site straight away. You can restore it from Trash at any time.
      </Modal>
    </AdminShell>
  );
}
