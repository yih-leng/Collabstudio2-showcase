'use client';

import { Button, InputField } from '@collabrium/ui';
import { Plus, X } from '@phosphor-icons/react';
import { newId } from '@/lib/admin-api';
import { SortableList } from './SortableList';
import styles from './admin.module.css';

export interface TextItem {
  id: string;
  text: string;
}

/** An ordered list of one-line items: add, edit, remove, drag to reorder. */
export function TextListEditor({
  items,
  onChange,
  itemLabel,
  addLabel,
  placeholder,
}: {
  items: TextItem[];
  onChange: (next: TextItem[]) => void;
  itemLabel: string;
  addLabel: string;
  placeholder?: string;
}) {
  const update = (id: string, text: string) => onChange(items.map((i) => (i.id === id ? { ...i, text } : i)));
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));
  const add = () => {
    const id = newId();
    onChange([...items, { id, text: '' }]);
    requestAnimationFrame(() => document.getElementById(`item-${id}`)?.focus());
  };

  return (
    <div className={styles.stackSm}>
      {items.length > 0 && (
        <SortableList
          items={items}
          onReorder={onChange}
          label={(i) => `${itemLabel} ${items.indexOf(i) + 1}`}
          renderItem={(item, i) => (
            <div className={styles.row}>
              <InputField
                id={`item-${item.id}`}
                label={`${itemLabel} ${i + 1}`}
                hideLabel
                value={item.text}
                placeholder={placeholder}
                onChange={(e) => update(item.id, e.target.value)}
              />
              <span className={styles.fit}>
                <Button variant="ghost" iconOnly icon={X} aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`} onClick={() => remove(item.id)} />
              </span>
            </div>
          )}
        />
      )}
      <div>
        <Button variant="secondary" size="sm" leadingIcon={Plus} onClick={add}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
