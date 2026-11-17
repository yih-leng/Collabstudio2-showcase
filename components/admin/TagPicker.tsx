'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { InputChipGroup, useToast } from '@collabrium/ui';
import { CaretDown, Check, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import type { TagType } from '@/lib/types';
import { useAdmin } from './AdminContext';
import styles from './TagPicker.module.css';

type Option = { id: string; name: string };

/**
 * One field to pick from a list (clients, project types, capabilities, tools)
 * or add to it: type to search, pick a match, or choose "Add …" to create it.
 * A new item joins the list in Clients and tags straight away.
 * TODO(design-system: no creatable combobox; built on Input field's box and Dropdown's panel look).
 */
export function TagPicker({
  label,
  options,
  value,
  onChange,
  create,
  multiple = true,
  required,
  error,
  helper,
  id,
}: {
  label: string;
  options: Option[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Where a new item is written. Leave out to only pick. */
  create?: { table: 'clients' | 'categories'; noun: string } | { table: 'tags'; type: TagType; noun: string };
  /** Pick one (project type) or several (the default). */
  multiple?: boolean;
  required?: boolean;
  error?: string;
  helper?: string;
  id?: string;
}) {
  const { sb, refreshLists } = useAdmin();
  const { toast } = useToast();
  const autoId = useId();
  const inputId = id ?? `picker-${autoId}`;
  const listId = `${inputId}-list`;
  const helpId = `${inputId}-help`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();
  const matches = useMemo(
    () => options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())),
    [options, q],
  );
  const exact = options.find((o) => o.name.toLowerCase() === q.toLowerCase());
  const canCreate = Boolean(create && q && !exact);
  // Rows in the panel: the matches, then "Add …" when the name is new.
  const rows = [...matches.map((o) => ({ kind: 'option' as const, o })), ...(canCreate ? [{ kind: 'create' as const }] : [])];

  useEffect(() => setActive(0), [q, open]);

  // Close when focus or a click leaves the field.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const pick = (optionId: string) => {
    if (multiple) {
      onChange(value.includes(optionId) ? value.filter((v) => v !== optionId) : [...value, optionId]);
      setQuery('');
      inputRef.current?.focus();
    } else {
      onChange([optionId]);
      setQuery('');
      setOpen(false);
    }
  };

  const addNew = async () => {
    if (!create || !q) return;
    setAdding(true);
    const row: Record<string, unknown> = { name: q, sort_order: options.length };
    if (create.table === 'tags') row.type = create.type;
    const { data, error: err } = await sb.from(create.table).insert(row).select('id').single();
    setAdding(false);
    if (err || !data) {
      toast({ tone: 'danger', title: `Couldn't add “${q}”`, message: err?.message });
      return;
    }
    await refreshLists();
    toast({ tone: 'success', title: `Added ${create.noun}`, message: `${q} is now in Clients and tags.` });
    pick(data.id);
  };

  const choose = (i: number) => {
    const r = rows[i];
    if (!r) return;
    if (r.kind === 'create') addNew();
    else pick(r.o.id);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(rows.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      if (!open) return;
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    } else if (e.key === 'Backspace' && !query && multiple && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const selected = value.map((v) => options.find((o) => o.id === v)).filter(Boolean) as Option[];
  const single = !multiple ? selected[0] : undefined;
  const placeholder = single
    ? single.name
    : create
      ? `Search or add a ${create.noun}`
      : `Search ${label.toLowerCase()}`;

  return (
    <div className={styles.field} ref={rootRef} data-error={error ? '' : undefined}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden>
            *
          </span>
        )}
      </label>
      <div className={styles.box} data-open={open || undefined} data-filled={single ? '' : undefined}>
        <MagnifyingGlass className={styles.icon} aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          className={styles.input}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && rows[active] ? `${listId}-${active}` : undefined}
          aria-describedby={helper || error ? helpId : undefined}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <CaretDown className={styles.caret} aria-hidden />
        {open && (
          <ul className={styles.panel} id={listId} role="listbox" aria-label={label} aria-multiselectable={multiple || undefined}>
            {rows.length === 0 && <li className={styles.empty}>{options.length ? `No matches for “${q}”` : 'Nothing here yet'}</li>}
            {rows.map((r, i) =>
              r.kind === 'option' ? (
                <li
                  key={r.o.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={value.includes(r.o.id)}
                  className={styles.option}
                  data-active={i === active || undefined}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  onPointerEnter={() => setActive(i)}
                >
                  <span className={styles.check} aria-hidden>
                    {value.includes(r.o.id) && <Check weight="bold" />}
                  </span>
                  {r.o.name}
                </li>
              ) : (
                <li
                  key="create"
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={false}
                  className={`${styles.option} ${styles.create}`}
                  data-active={i === active || undefined}
                  aria-busy={adding || undefined}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  onPointerEnter={() => setActive(i)}
                >
                  <span className={styles.check} aria-hidden>
                    <Plus weight="bold" />
                  </span>
                  {adding ? 'Adding…' : `Add “${q}” as a new ${create!.noun}`}
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {(error || helper) && (
        <p className={styles.helper} id={helpId}>
          {error ?? helper}
        </p>
      )}

      {multiple && selected.length > 0 && (
        <InputChipGroup
          aria-label={`Selected ${label.toLowerCase()}`}
          chips={selected.map((o) => ({ id: o.id, label: o.name }))}
          maxVisible={8}
          onRemove={(rid) => onChange(value.filter((v) => v !== rid))}
        />
      )}
    </div>
  );
}
