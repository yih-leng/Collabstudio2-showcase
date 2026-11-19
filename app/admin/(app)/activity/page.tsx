'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  EmptyState,
  FilterChipGroup,
  InfoBanner,
  PageHeader,
  SearchInput,
  StatCard,
  StatGrid,
  Table,
  type TableColumn,
} from '@collabrium/ui';
import { ClockCounterClockwise, CurrencyDollar, Sparkle } from '@phosphor-icons/react';
import { useAdmin } from '@/components/admin/AdminContext';
import { AdminShell } from '@/components/admin/AdminShell';
import shared from '@/components/admin/admin.module.css';
import { areaOf, describe, groupActivity, personName, type ActivityArea, type ActivityGroup, type ActivityRow } from '@/lib/activity';
import { formatTokens, formatUsd } from '@/lib/import/pricing';
import type { DraftUsage } from '@/lib/import/types';
import styles from './activity.module.css';

const PAGE = 400;

const AREAS: { value: ActivityArea | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'projects', label: 'Projects' },
  { value: 'ai', label: 'AI usage' },
  { value: 'lists', label: 'Clients and tags' },
  { value: 'settings', label: 'Site settings' },
];

type AiRow = Pick<ActivityRow, 'created_at' | 'details'>;

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })}, ${time}`;
}

const costOfRow = (r: Pick<ActivityRow, 'details'>) => (r.details as Partial<DraftUsage>).cost ?? 0;

export default function ActivityPage() {
  const { sb } = useAdmin();
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const [ai, setAi] = useState<AiRow[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const [missing, setMissing] = useState(false);
  const [area, setArea] = useState<ActivityArea | 'all'>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const [log, usage] = await Promise.all([
      sb.from('activity').select('*').order('created_at', { ascending: false }).limit(limit + 1),
      // Every AI draft, for the totals (small rows: time and cost).
      sb.from('activity').select('created_at, details').eq('action', 'ai.draft'),
    ]);
    if (log.error) {
      // Most likely the migration hasn't been run yet.
      setMissing(true);
      setRows([]);
      return;
    }
    setRows((log.data ?? []) as ActivityRow[]);
    setAi((usage.data ?? []) as AiRow[]);
  }, [sb, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const more = (rows?.length ?? 0) > limit;
  const groups = useMemo(() => groupActivity((rows ?? []).slice(0, limit)), [rows, limit]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: groups.length };
    for (const g of groups) c[areaOf(g.action)] = (c[areaOf(g.action)] ?? 0) + 1;
    return c;
  }, [groups]);

  const q = search.trim().toLowerCase();
  const shown = groups.filter((g) => {
    if (area !== 'all' && areaOf(g.action) !== area) return false;
    if (!q) return true;
    const d = describe(g);
    return `${d.before}${d.name ?? ''}${d.after} ${g.actor_email ?? 'visitor'}`.toLowerCase().includes(q);
  });

  const totals = useMemo(() => {
    const now = new Date();
    const thisMonth = ai.filter((r) => {
      const d = new Date(r.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const sum = (list: AiRow[]) => list.reduce((s, r) => s + costOfRow(r), 0);
    const projects = ai.reduce((s, r) => s + (((r.details as { projects?: string[] }).projects?.length) ?? 0), 0);
    return { month: sum(thisMonth), monthDecks: thisMonth.length, all: sum(ai), decks: ai.length, projects };
  }, [ai]);

  const columns: TableColumn<ActivityGroup>[] = [
    { key: 'at', header: 'When', sortable: true, sortValue: (g) => g.at, render: (g) => <span className={styles.when}>{when(g.at)}</span> },
    { key: 'who', header: 'Who', sortable: true, sortValue: (g) => g.actor_email ?? '', render: (g) => <span title={g.actor_email ?? undefined}>{personName(g.actor_email, g.action)}</span> },
    {
      key: 'what',
      header: 'What happened',
      render: (g) => {
        const d = describe(g);
        const linkable = d.name && g.project_id && g.action !== 'project.deleted';
        return (
          <span className={styles.what}>
            {d.before}
            {linkable ? (
              <Link href={`/admin/projects/${g.project_id}`} className={styles.name}>
                {d.name}
              </Link>
            ) : (
              d.name && <span className={styles.name}>{d.name}</span>
            )}
            {d.after}
          </span>
        );
      },
    },
    {
      key: 'cost',
      header: 'AI cost',
      sortable: true,
      sortValue: (g) => (g.action === 'ai.draft' ? costOfRow(g) : -1),
      render: (g) => {
        if (g.action !== 'ai.draft') return null;
        const u = g.details as Partial<DraftUsage>;
        return (
          <span className={styles.cost}>
            <span>{u.cost === undefined || u.cost === null ? '—' : formatUsd(u.cost)}</span>
            <span className={shared.muted}>
              {`${formatTokens(u.input_tokens ?? 0)} in · ${formatTokens(u.output_tokens ?? 0)} out${u.model_label ? ` · ${u.model_label}` : ''}`}
            </span>
          </span>
        );
      },
    },
  ];

  return (
    <AdminShell header={<PageHeader title="Activity" subtitle="Who changed what on the site, and what AI drafting has cost." />}>
      <div className={shared.stack}>
        {missing && (
          <InfoBanner tone="warning">
            The activity log isn’t set up yet. In Supabase, run supabase/migrations/0005_activity.sql in the SQL Editor (README: “Activity log”).
          </InfoBanner>
        )}

        <StatGrid>
          <StatCard label="AI spend this month" value={formatUsd(totals.month)} icon={CurrencyDollar} description={`${totals.monthDecks} deck${totals.monthDecks === 1 ? '' : 's'} drafted`} />
          <StatCard label="AI spend, all time" value={formatUsd(totals.all)} icon={CurrencyDollar} description={`${totals.decks} deck${totals.decks === 1 ? '' : 's'} drafted`} />
          <StatCard label="Projects drafted with AI" value={String(totals.projects)} icon={Sparkle} description="Across all imported decks" />
        </StatGrid>

        <div className={styles.controls}>
          <FilterChipGroup
            aria-label="Show"
            mode="single"
            options={AREAS.map((a) => ({ value: a.value, label: a.label, count: counts[a.value] ?? 0 }))}
            value={area}
            onValueChange={(v) => setArea(v as ActivityArea | 'all')}
          />
          <SearchInput label="Search activity" hideLabel placeholder="Search by project, person or file" value={search} onValueChange={setSearch} />
        </div>

        <Table
          label="Activity"
          columns={columns}
          rows={shown}
          loading={rows === null}
          getRowKey={(g) => g.id}
          getRowLabel={(g) => {
            const d = describe(g);
            return `${d.before}${d.name ?? ''}${d.after}`;
          }}
          empty={
            <EmptyState variant="section" icon={ClockCounterClockwise} heading={groups.length ? 'Nothing matches' : 'No activity yet'}>
              {groups.length ? 'Try another filter or search.' : 'Changes to projects, lists and settings show here as they happen.'}
            </EmptyState>
          }
        />

        {more && (
          <span>
            <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
              Show older activity
            </Button>
          </span>
        )}
      </div>
    </AdminShell>
  );
}
