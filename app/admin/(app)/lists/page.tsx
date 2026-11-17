'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FileUploader,
  InputField,
  Modal,
  PageHeader,
  Tabs,
  useToast,
  type FileUploaderItem,
} from '@collabrium/ui';
import { FileImage, ListBullets, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminContext';
import { SortableList } from '@/components/admin/SortableList';
import styles from '@/components/admin/admin.module.css';
import { MAX_IMAGE_BYTES, extOf, removeFromStorage, saveOrder, uploadToStorage } from '@/lib/admin-api';
import type { Client, Project, TagType } from '@/lib/types';
import local from './lists.module.css';

type Kind = 'clients' | 'categories' | 'capability' | 'tool';
type Item = { id: string; name: string; logo_url?: string | null; logo_path?: string | null };

const META: Record<Kind, { table: 'clients' | 'categories' | 'tags'; field: 'client_ids' | 'category_ids' | 'tag_ids'; one: string; tagType?: TagType }> = {
  clients: { table: 'clients', field: 'client_ids', one: 'client' },
  categories: { table: 'categories', field: 'category_ids', one: 'project type' },
  capability: { table: 'tags', field: 'tag_ids', one: 'capability', tagType: 'capability' },
  tool: { table: 'tags', field: 'tag_ids', one: 'tool', tagType: 'tool' },
};

export default function ListsPage() {
  const { sb, lists, refreshLists } = useAdmin();
  const [projects, setProjects] = useState<Pick<Project, 'id' | 'client_ids' | 'category_ids' | 'tag_ids'>[]>([]);

  const loadUsage = useCallback(async () => {
    const { data } = await sb.from('projects').select('id, client_ids, category_ids, tag_ids');
    setProjects(data ?? []);
  }, [sb]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const panel = (kind: Kind, items: Item[]) => (
    <ListPanel kind={kind} items={items} projects={projects} onChanged={async () => Promise.all([refreshLists(), loadUsage()]).then(() => undefined)} />
  );

  return (
    <AdminShell
      width="reading"
      header={<PageHeader title="Clients and tags" subtitle="The lists projects pick from. Changes show everywhere they're used." />}
    >
      <Tabs
        aria-label="Lists"
        surface="canvas"
        tabs={[
          { id: 'clients', label: 'Clients', count: lists.clients.length, content: panel('clients', lists.clients) },
          { id: 'categories', label: 'Project types', count: lists.categories.length, content: panel('categories', lists.categories) },
          {
            id: 'capabilities',
            label: 'Capabilities',
            count: lists.tags.filter((t) => t.type === 'capability').length,
            content: panel('capability', lists.tags.filter((t) => t.type === 'capability')),
          },
          {
            id: 'tools',
            label: 'Tools',
            count: lists.tags.filter((t) => t.type === 'tool').length,
            content: panel('tool', lists.tags.filter((t) => t.type === 'tool')),
          },
        ]}
      />
    </AdminShell>
  );
}

function ListPanel({
  kind,
  items,
  projects,
  onChanged,
}: {
  kind: Kind;
  items: Item[];
  projects: Pick<Project, 'id' | 'client_ids' | 'category_ids' | 'tag_ids'>[];
  onChanged: () => Promise<void>;
}) {
  const { sb } = useAdmin();
  const { toast } = useToast();
  const meta = META[kind];
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [order, setOrder] = useState<Item[]>(items);

  useEffect(() => setOrder(items), [items]);

  const usage = (id: string) => projects.filter((p) => p[meta.field].includes(id)).length;

  const add = async () => {
    const name = draft.trim();
    if (!name) return;
    if (items.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      toast({ tone: 'warning', title: `“${name}” is already on the list` });
      return;
    }
    setAdding(true);
    const row: Record<string, unknown> = { name, sort_order: items.length };
    if (meta.tagType) row.type = meta.tagType;
    const { error } = await sb.from(meta.table).insert(row);
    setAdding(false);
    if (error) {
      toast({ tone: 'danger', title: `Couldn't add “${name}”`, message: error.message });
      return;
    }
    setDraft('');
    await onChanged();
    toast({ tone: 'success', title: `Added ${meta.one}`, message: name });
  };

  const reorder = async (next: Item[]) => {
    setOrder(next);
    try {
      await saveOrder(sb, meta.table, next.map((i) => i.id));
      await onChanged();
    } catch (e) {
      toast({ tone: 'danger', title: "The new order didn't save", message: (e as Error).message });
    }
  };

  const remove = async () => {
    const item = deleting;
    setDeleting(null);
    if (!item) return;
    // Take it off every project first, then delete it.
    const using = projects.filter((p) => p[meta.field].includes(item.id));
    const results = await Promise.all(
      using.map((p) => sb.from('projects').update({ [meta.field]: p[meta.field].filter((x) => x !== item.id) }).eq('id', p.id)),
    );
    const failed = results.find((r) => r.error);
    const { error } = failed ?? (await sb.from(meta.table).delete().eq('id', item.id));
    if (error) {
      toast({ tone: 'danger', title: "That didn't delete", message: error.message });
      return;
    }
    if (item.logo_path) await removeFromStorage(sb, [item.logo_path]);
    await onChanged();
    toast({ tone: 'success', title: `Deleted ${meta.one}`, message: item.name });
  };

  return (
    <div className={styles.stack}>
      <div className={styles.row}>
        <InputField
          label={`New ${meta.one}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <span className={styles.fit}>
          <Button variant="secondary" leadingIcon={Plus} loading={adding} disabled={!draft.trim()} onClick={add}>
            Add
          </Button>
        </span>
      </div>

      {order.length === 0 ? (
        <EmptyState variant="section" icon={ListBullets} heading={`No ${meta.one}s yet`}>
          Add one above, or create one while editing a project.
        </EmptyState>
      ) : (
        <Card padding="list">
          <SortableList
            items={order}
            onReorder={reorder}
            label={(i) => i.name}
            renderItem={(item) => {
              const n = usage(item.id);
              return (
                <div className={local.item}>
                  {kind === 'clients' && (
                    <span className={local.logo}>
                      {item.logo_url ? <img src={item.logo_url} alt="" /> : <FileImage aria-hidden />}
                    </span>
                  )}
                  <span className={local.name}>{item.name}</span>
                  <Badge variant="neutral">{n === 1 ? '1 project' : `${n} projects`}</Badge>
                  <span className={styles.actions}>
                    <Button variant="ghost" size="sm" iconOnly icon={PencilSimple} aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)} />
                    <Button variant="ghost" size="sm" iconOnly icon={Trash} aria-label={`Delete ${item.name}`} onClick={() => setDeleting(item)} />
                  </span>
                </div>
              );
            }}
          />
        </Card>
      )}

      {editing && <EditModal kind={kind} item={editing} onClose={() => setEditing(null)} onSaved={onChanged} />}

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete this ${meta.one}?`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </>
        }
      >
        {deleting && usage(deleting.id) > 0
          ? `${deleting.name} is taken off ${usage(deleting.id)} ${usage(deleting.id) === 1 ? 'project' : 'projects'}, then deleted.`
          : `${deleting?.name} isn't used by any project.`}
      </Modal>
    </div>
  );
}

function EditModal({ kind, item, onClose, onSaved }: { kind: Kind; item: Item; onClose: () => void; onSaved: () => Promise<void> }) {
  const { sb } = useAdmin();
  const { toast } = useToast();
  const meta = META[kind];
  const [name, setName] = useState(item.name);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<FileUploaderItem[]>([]);
  const [logo, setLogo] = useState<{ url: string | null; path: string | null }>({ url: item.logo_url ?? null, path: item.logo_path ?? null });

  const uploadLogo = async (file: File) => {
    setFiles([{ file, status: 'uploading' }]);
    try {
      const path = `clients/${item.id}-${Date.now()}.${extOf(file)}`;
      const url = await uploadToStorage(sb, path, file);
      setLogo({ url, path });
      setFiles([{ file, status: 'done' }]);
    } catch (e) {
      setFiles([{ file, status: 'failed', message: (e as Error).message }]);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Give it a name');
      return;
    }
    setSaving(true);
    const values: Partial<Client> = { name: name.trim() };
    if (kind === 'clients') Object.assign(values, { logo_url: logo.url, logo_path: logo.path });
    const { error: err } = await sb.from(meta.table).update(values).eq('id', item.id);
    setSaving(false);
    if (err) {
      setError(err.code === '23505' ? 'That name is already on the list' : err.message);
      return;
    }
    if (kind === 'clients' && item.logo_path && item.logo_path !== logo.path) await removeFromStorage(sb, [item.logo_path]);
    await onSaved();
    toast({ tone: 'success', title: 'Saved', message: name.trim() });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size={kind === 'clients' ? 'lg' : 'default'}
      title={`Edit ${meta.one}`}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className={styles.stackSm}>
        <InputField label="Name" required value={name} error={error} onChange={(e) => setName(e.target.value)} />
        {kind === 'clients' && (
          <>
            {logo.url && (
              <div className={local.preview}>
                <img src={logo.url} alt={`${name} logo`} />
                <Button variant="ghost" size="sm" leadingIcon={Trash} onClick={() => setLogo({ url: null, path: null })}>
                  Remove logo
                </Button>
              </div>
            )}
            <FileUploader
              title="Drop the client's logo here"
              touchTitle="Add the client's logo"
              buttonLabel="Choose a file"
              caption="Shown in the client strip on the home page. A transparent PNG or SVG works best."
              rules={{
                noun: 'logo',
                maxBytes: MAX_IMAGE_BYTES,
                label: 'SVG, PNG, JPG or WebP',
                types: [
                  { ext: 'svg', mime: 'image/svg+xml' },
                  { ext: 'png', mime: 'image/png' },
                  { ext: 'jpg', mime: 'image/jpeg' },
                  { ext: 'jpeg', mime: 'image/jpeg' },
                  { ext: 'webp', mime: 'image/webp' },
                ],
              }}
              files={files}
              onFilesChange={setFiles}
              onAccept={uploadLogo}
              onRetry={uploadLogo}
              thumbnails
            />
          </>
        )}
      </div>
    </Modal>
  );
}
