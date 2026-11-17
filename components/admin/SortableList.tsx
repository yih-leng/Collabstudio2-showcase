'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from '@phosphor-icons/react';
import styles from './admin.module.css';

/**
 * Drag (or Space + arrow keys on the handle) to reorder.
 * TODO(design-system: no sortable list component; rows follow List's divider and padding.)
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  label,
  showPosition = false,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** What one item is called, for the handle's name ("project", "block"). */
  label: (item: T) => string;
  showPosition?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'To move an item, press Space. Use the arrow keys to move it, Space to drop it, or Escape to cancel.',
        },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={styles.sortList}>
          {items.map((item, i) => (
            <Row key={item.id} id={item.id} name={label(item)} position={showPosition ? i + 1 : undefined}>
              {renderItem(item, i)}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Row({ id, name, position, children }: { id: string; name: string; position?: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      className={styles.sortRow}
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={styles.handle}
        aria-label={`Move ${name}`}
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical aria-hidden />
      </button>
      {position !== undefined && <span className={styles.position}>{position}</span>}
      <div className={styles.sortBody}>{children}</div>
    </li>
  );
}
