'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, Modal, Table, useToast, type TableColumn } from '@collabrium/ui';
import { Archive, ArrowCounterClockwise, TrashSimple } from '@phosphor-icons/react';
import { useAdmin } from '@/components/admin/AdminContext';
import { deleteProjectForGood } from '@/lib/admin-api';
import { VISIBILITY_LABEL, formatDate } from '@/lib/format';
import type { Project } from '@/lib/types';

/**
 * The Archived tab on Projects: projects taken off the site (deleted_at set).
 * Restore one, or delete it for good. `reloadKey` changes when a project is
 * archived elsewhere on the page; `onChange` reports the count and restores.
 */
export function ArchivedProjects({ reloadKey, onChange }: { reloadKey: number; onChange: (count: number, restored?: boolean) => void }) {
  const { sb } = useAdmin();
  const { toast } = useToast();
  const [rows, setRows] = useState<Project[] | null>(null);
  const [purging, setPurging] = useState<Project | null>(null);

  const load = useCallback(async () => {
    const { data } = await sb.from('projects').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    const list = (data ?? []) as Project[];
    setRows(list);
    onChange(list.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const drop = (p: Project, restored?: boolean) =>
    setRows((r) => {
      const next = r?.filter((x) => x.id !== p.id) ?? r;
      onChange(next?.length ?? 0, restored);
      return next;
    });

  // Both actions take the row off the list straight away, then save; if the
  // save fails the list reloads and says so.
  const restore = async (p: Project) => {
    drop(p, true);
    toast({ tone: 'success', title: 'Restored', message: `${p.title} is back as ${VISIBILITY_LABEL[p.visibility].toLowerCase()}.` });
    const { error } = await sb.from('projects').update({ deleted_at: null }).eq('id', p.id);
    if (error) {
      toast({ tone: 'danger', title: "That didn't restore", message: error.message });
      load();
    }
  };

  const purge = async () => {
    const p = purging;
    setPurging(null);
    if (!p) return;
    drop(p);
    toast({ tone: 'success', title: 'Deleted for good', message: p.title });
    try {
      await deleteProjectForGood(sb, p.id);
    } catch (e) {
      toast({ tone: 'danger', title: "That didn't delete", message: (e as Error).message });
      load();
    }
  };

  const columns: TableColumn<Project>[] = [
    { key: 'title', header: 'Project', sortable: true, sortValue: (p) => p.title.toLowerCase() },
    { key: 'visibility', header: 'Was', sortable: true, sortValue: (p) => p.visibility, render: (p) => VISIBILITY_LABEL[p.visibility] },
    { key: 'deleted_at', header: 'Archived', type: 'date', sortable: true, sortValue: (p) => p.deleted_at ?? '', render: (p) => formatDate(p.deleted_at!) },
  ];

  return (
    <>
      <Table
        label="Archived projects"
        columns={columns}
        rows={rows ?? []}
        loading={rows === null}
        getRowKey={(p) => p.id}
        getRowLabel={(p) => p.title}
        rowActions={[
          { label: 'Restore', icon: ArrowCounterClockwise, onClick: restore },
          { label: 'Delete for good', icon: TrashSimple, onClick: setPurging },
        ]}
        empty={
          <EmptyState variant="section" icon={Archive} heading="Nothing archived">
            Projects you archive come off the site and wait here until you restore or delete them.
          </EmptyState>
        }
      />
      <Modal
        open={!!purging}
        onClose={() => setPurging(null)}
        title="Delete this project for good?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setPurging(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={purge}>
              Delete for good
            </Button>
          </>
        }
      >
        {purging?.title}, its text and its uploaded files are removed. This can&apos;t be undone.
      </Modal>
    </>
  );
}
