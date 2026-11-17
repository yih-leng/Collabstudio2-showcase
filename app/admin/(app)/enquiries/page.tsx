'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, EmptyState, Filters, Modal, PageHeader, Table, useToast, type FilterValue, type TableColumn } from '@collabrium/ui';
import { EnvelopeOpen, EnvelopeSimple, Tray, TrashSimple } from '@phosphor-icons/react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminContext';
import { formatDate } from '@/lib/format';
import type { Enquiry } from '@/lib/types';
import styles from './enquiries.module.css';

export default function EnquiriesPage() {
  const { sb, refreshUnread } = useAdmin();
  const { toast } = useToast();
  const [rows, setRows] = useState<Enquiry[] | null>(null);
  const [open, setOpen] = useState<Enquiry | null>(null);
  const [deleting, setDeleting] = useState<Enquiry | null>(null);
  const [filter, setFilter] = useState<FilterValue>({});
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data } = await sb.from('enquiries').select('*').order('created_at', { ascending: false });
    setRows((data ?? []) as Enquiry[]);
  }, [sb]);

  useEffect(() => {
    load();
  }, [load]);

  const setRead = async (e: Enquiry, is_read: boolean) => {
    setRows((r) => r?.map((x) => (x.id === e.id ? { ...x, is_read } : x)) ?? r);
    await sb.from('enquiries').update({ is_read }).eq('id', e.id);
    refreshUnread();
  };

  const view = (e: Enquiry) => {
    setOpen(e);
    if (!e.is_read) setRead(e, true);
  };

  const remove = async () => {
    const e = deleting;
    setDeleting(null);
    if (!e) return;
    const { error } = await sb.from('enquiries').delete().eq('id', e.id);
    if (error) {
      toast({ tone: 'danger', title: "That didn't delete", message: error.message });
      return;
    }
    setRows((r) => r?.filter((x) => x.id !== e.id) ?? r);
    refreshUnread();
    toast({ tone: 'success', title: 'Enquiry deleted' });
  };

  const columns: TableColumn<Enquiry>[] = [
    {
      key: 'name',
      header: 'From',
      render: (e) => (
        <span className={e.is_read ? undefined : styles.unread}>
          {e.name}
          {e.company ? ` · ${e.company}` : ''}
        </span>
      ),
      sortable: true,
      sortValue: (e) => e.name.toLowerCase(),
    },
    { key: 'email', header: 'Email', priority: 'medium', sortable: true, sortValue: (e) => e.email.toLowerCase() },
    { key: 'message', header: 'Message', sortable: false, priority: 'low', render: (e) => <span className={styles.snippet}>{e.message}</span> },
    { key: 'is_read', header: 'Status', type: 'status', sortable: true, sortValue: (e) => Number(e.is_read), render: (e) => (e.is_read ? <Badge variant="neutral">Read</Badge> : <Badge variant="info">New</Badge>) },
    { key: 'created_at', header: 'Received', type: 'date', sortable: true, sortValue: (e) => e.created_at, render: (e) => formatDate(e.created_at) },
  ];

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const status = filter.status ?? [];
    return (rows ?? []).filter(
      (e) =>
        (!status.length || status.includes(e.is_read ? 'read' : 'new')) &&
        (!q || [e.name, e.company ?? '', e.email, e.message].some((t) => t.toLowerCase().includes(q))),
    );
  }, [rows, filter, search]);

  return (
    <AdminShell header={<PageHeader title="Enquiries" subtitle="Messages sent from the contact form (/contact)." />}>
      <Filters
        aria-label="Filter enquiries"
        dimensions={[{ key: 'status', label: 'Status', options: [{ value: 'new', label: 'New' }, { value: 'read', label: 'Read' }] }]}
        value={filter}
        onValueChange={setFilter}
        search
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, company, email or message"
      />
      <Table
        label="Enquiries"
        columns={columns}
        rows={shown}
        loading={rows === null}
        getRowKey={(e) => e.id}
        getRowLabel={(e) => `${e.name}, ${formatDate(e.created_at)}`}
        onRowClick={view}
        rowActions={[
          { label: 'Open', icon: EnvelopeOpen, onClick: view },
          { label: 'Mark as unread', icon: EnvelopeSimple, onClick: (e) => setRead(e, false) },
          { label: 'Delete', icon: TrashSimple, onClick: setDeleting },
        ]}
        empty={
          <EmptyState variant="section" icon={Tray} heading="Nothing waiting on you">
            When someone sends the Work with us form, it lands here.
          </EmptyState>
        }
      />

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        size="lg"
        title={open ? `Enquiry from ${open.name}` : 'Enquiry'}
        actions={
          open ? (
            <>
              <Button variant="secondary" onClick={() => setOpen(null)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => (window.location.href = `mailto:${open.email}?subject=${encodeURIComponent('Re: your enquiry to KULT')}`)}>
                Reply by email
              </Button>
            </>
          ) : undefined
        }
      >
        {open && (
          <dl className={styles.detail}>
            <dt>Company</dt>
            <dd>{open.company || '—'}</dd>
            <dt>Email</dt>
            <dd>{open.email}</dd>
            <dt>Received</dt>
            <dd>{new Date(open.created_at).toLocaleString('en-GB')}</dd>
            <dt>Message</dt>
            <dd className={styles.message}>{open.message}</dd>
          </dl>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this enquiry?"
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
        The message from {deleting?.name} is removed for good.
      </Modal>
    </AdminShell>
  );
}
