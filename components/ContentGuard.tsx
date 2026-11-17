'use client';

import { useEffect } from 'react';

// View-only mode for the public site. A web page can't stop a screenshot (the
// computer's own keys or a phone camera always work), but it can shut the easy
// ways to keep the work: right-click "Save image/video", dragging media out,
// the browser's download and picture-in-picture buttons, Save Page and Print.
// The Print Screen key (Windows) also blanks the clipboard copy it makes.

const MEDIA = 'img, video, audio, picture, canvas, svg, iframe';

export function ContentGuard() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.viewOnly = '';

    const onContextMenu = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest(MEDIA) || el?.closest('[data-media]')) e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.(MEDIA)) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      // Save page, print.
      if (mod && (key === 's' || key === 'p')) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') void navigator.clipboard?.writeText('').catch(() => {});
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      delete root.dataset.viewOnly;
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);
  return null;
}
