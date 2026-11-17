'use client';

import { useEffect } from 'react';

/**
 * Lets files be dropped on the design system's FileUploader.
 * TODO(design-system: FileUploader's window "drop guard" sets dropEffect to "none"
 * on every dragover, after the drop zone has set "copy", so browsers refuse the
 * drop. Remove this once FileUploader skips its own zones.)
 * Over a drop zone, this answers the dragover first (window, capture phase) with
 * "copy" and stops it there, so the guard never overrides it. Drops and every
 * other drag event still reach the uploader as normal.
 */
export function FileDropFix() {
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      const zone = (e.target as Element | null)?.closest?.('.cui-file-uploader__zone');
      if (!zone || zone.closest('[data-disabled], [data-readonly]')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      e.stopImmediatePropagation();
    };
    window.addEventListener('dragover', onDragOver, { capture: true });
    return () => window.removeEventListener('dragover', onDragOver, { capture: true });
  }, []);
  return null;
}
