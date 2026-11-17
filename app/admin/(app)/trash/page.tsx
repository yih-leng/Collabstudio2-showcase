'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, Modal, PageHeader, Table, useToast, type TableColumn } from '@collabrium/ui';
import { ArrowCounterClockwise, Trash, TrashSimple } from '@phosphor-icons/react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminContext';
import { removeFromStorage } from '@/lib/admin-api';
import { VISIBILITY_LABEL, formatDate } from '@/lib/format';
import type { Project } from '@/lib/types';

export default function TrashPage() {
  const { sb } = useAdmin();
  const { toast } = useToast();
  const [rows, setRows] = useState<Project[] | null>(null);
  const [purging, setPurging] = useState<Project | null>(null);

  const load = useCallback(async () => {
    const { data } = await sb.from('projects').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    setRows((data ?? []) as Project[]);
  }, [sb]);

  useEffect(() => {
    load();
  }, [load]);

  const restore = async (p: Project) => {
    const { error } = await sb.from('projects').update({ deleted_at: null }).eq('id', p.id);
    if (error) {
      toast({ tone: 'danger', title: "That didn't restore", message: error.message });
      return;
    }
    setRows((r) => r?.filter((x) => x.id !== p.id) ?? r);
    toast({ tone: 'success', title: 'Restored', message: `${p.title} is back as ${VISIBILITY_LABEL[p.visibility].toLowerCase()}.` });
  };

  const purge = async () => {
    const p = purging;
    setPurging(null);
    if (!p) return;
    const { data: files } = await sb.from('media').select('storage_path').eq('project_id', p.id);
    await sb.from('projects').update({ cover_media_id: null, hero_media_id: null }).eq('id', p.id);
    const { error } = await sb.from('projects').delete().eq('id', p.id);
    if (error) {
      toast({ tone: 'danger', title: "That didn't delete", message: error.message });
      return;
    }
    await removeFromStorage(sb, (files ?? []).map((f) => f.storage_path));
    setRows((r) => r?.filter((x) => x.id !== p.id) ?? r);
    toast({ tone: 'success', title: 'Deleted for good', message: p.title });
  };

  const columns: TableColumn<Project>[] = [
    { key: 'title', header: 'Project' },
    { key: 'visibility', header: 'Was', sortable: false, render: (p) => VISIBILITY_LABEL[p.visibility] },
    { key: 'deleted_at', header: 'Moved to Trash', type: 'date', render: (p) => formatDate(p.deleted_at!) },
  ];

  return (
    <AdminShell header={<PageHeader title="Trash" subtitle="Projects here are off the site. Restore them, or delete them for good." />}>
      <Table
        label="Projects in Trash"
        columns={columns}
        rows={rows ?? []}
        loading={rows === null}
        getRowKey={(p) => p.id}
        rowActions={[
          { label: 'Restore', icon: ArrowCounterClockwise, onClick: restore },
          { label: 'Delete for good', icon: TrashSimple, onClick: setPurging },
        ]}
        empty={
          <EmptyState variant="section" icon={Trash} heading="Trash is empty">
            Projects you move to Trash wait here until you restore or delete them.
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
    </AdminShell>
  );
}
