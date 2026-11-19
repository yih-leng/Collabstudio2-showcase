'use client';

import { useMemo, useState } from 'react';
import {
  CardGrid,
  EmptyState,
  Filters,
  PageHeader,
  filtersFromSearchParams,
  filtersToSearchParams,
  type FilterDimension,
  type FilterValue,
} from '@collabrium/ui';
import { ProjectCard } from '@/components/ProjectCard';
import { STATUS_LABEL } from '@/lib/format';
import { SiteShell } from '@/components/SiteShell';
import type { Lists, ProjectCardData } from '@/lib/types';
import styles from './work.module.css';

export function WorkView({
  projects,
  lists,
  initialQuery,
}: {
  projects: ProjectCardData[];
  lists: Lists;
  initialQuery: string;
}) {
  const dimensions = useMemo<FilterDimension[]>(() => {
    const used = <T extends { id: string }>(all: T[], pick: (p: ProjectCardData) => { id: string }[]) =>
      all.filter((x) => projects.some((p) => pick(p).some((y) => y.id === x.id)));
    // Names list A to Z; years newest first.
    const az = (opts: { value: string; label: string }[]) =>
      [...opts].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true }));
    const years = [...new Set(projects.map((p) => p.year).filter(Boolean) as number[])].sort((a, b) => b - a);
    return [
      { key: 'client', label: 'Client', options: az(used(lists.clients, (p) => p.clients).map((c) => ({ value: c.id, label: c.name }))) },
      { key: 'category', label: 'Project type', options: az(used(lists.categories, (p) => p.categories).map((c) => ({ value: c.id, label: c.name }))) },
      {
        key: 'capability',
        label: 'Capability',
        options: az(lists.tags.filter((t) => t.type === 'capability').map((t) => ({ value: t.id, label: t.name }))),
      },
      { key: 'year', label: 'Year', options: years.map((y) => ({ value: String(y), label: String(y) })) },
    ];
  }, [projects, lists]);

  const [value, setValue] = useState<FilterValue>(() =>
    filtersFromSearchParams(new URLSearchParams(initialQuery), dimensions),
  );
  const [search, setSearch] = useState(() => new URLSearchParams(initialQuery).get('q') ?? '');

  const syncUrl = (next: FilterValue, q: string) => {
    const params = filtersToSearchParams(next);
    if (q) params.set('q', q);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `/work?${qs}` : '/work');
  };

  const onFilters = (next: FilterValue) => {
    setValue(next);
    syncUrl(next, search);
  };
  const onSearch = (q: string) => {
    setSearch(q);
    syncUrl(value, q);
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const has = (key: string, ids: string[]) => !value[key]?.length || value[key].some((v) => ids.includes(v));
    return projects.filter(
      (p) =>
        has('client', p.clients.map((c) => c.id)) &&
        has('category', p.categories.map((c) => c.id)) &&
        has('capability', p.capabilities.map((c) => c.id)) &&
        has('year', p.year ? [String(p.year)] : []) &&
        (!q ||
          // Search reads everything on the card and its tags: title, clients,
          // project type, capabilities, tools, status and year.
          [p.title, p.one_liner, ...p.clients.map((c) => c.name), ...p.categories.map((c) => c.name), ...p.capabilities.map((c) => c.name), ...p.tools.map((c) => c.name), STATUS_LABEL[p.status], p.year ? String(p.year) : '']
            .filter(Boolean)
            .some((t) => t!.toLowerCase().includes(q))),
    );
  }, [projects, value, search]);

  const clearAll = () => {
    setValue({});
    setSearch('');
    syncUrl({}, '');
  };

  return (
    <SiteShell
      header={
        <PageHeader
          title="Our Works"
          subtitle="Every AI project we can show, featured work first in line. Filter by client, project type, capability or year."
        />
      }
    >
      <div className={styles.stack}>
        {/* TODO(design-system: Filters has no search inside a filter's panel; add it there, then turn it on here). */}
        <Filters
          dimensions={dimensions}
          value={value}
          onValueChange={onFilters}
          search
          searchValue={search}
          onSearchChange={onSearch}
          searchPlaceholder="Search by title, client or tag"
          searchLabel="Search projects"
        />
        <p className={styles.count} aria-live="polite">
          {shown.length} of {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        </p>
        {shown.length ? (
          <CardGrid>
            {shown.map((p) => (
              <ProjectCard key={p.id} project={p} headingLevel={2} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState variant="inline" linkAction={{ label: 'Clear filters', onClick: clearAll }}>
            No projects match these filters yet.
          </EmptyState>
        )}
      </div>
    </SiteShell>
  );
}
