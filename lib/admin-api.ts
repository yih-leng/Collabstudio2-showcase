'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { MEDIA_BUCKET } from './supabase/config';
import type { Aspect, MediaKind } from './types';

// Admin-side writes. Every call goes through the signed-in browser client,
// and row-level security makes sure only admins can write.

export const MB = 1024 * 1024;
/** Supabase's free plan caps a single upload at 50 MB; raise it in Storage settings on a paid plan. */
export const MAX_VIDEO_BYTES = 50 * MB;
export const MAX_IMAGE_BYTES = 15 * MB;

export function extOf(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type.split('/')[1] ?? 'bin';
}

export function kindOf(file: File): MediaKind | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|aiff?|flac|ogg)$/i.test(file.name)) return 'audio';
  return null;
}

/** Reads an image or video's natural size and picks the closest supported aspect. */
export function detectAspect(file: File): Promise<Aspect> {
  const pick = (w: number, h: number): Aspect => {
    if (!w || !h) return '16:9';
    const r = w / h;
    const options: [Aspect, number][] = [
      ['16:9', 16 / 9],
      ['1:1', 1],
      ['4:5', 4 / 5],
      ['9:16', 9 / 16],
    ];
    return options.reduce((best, cur) => (Math.abs(cur[1] - r) < Math.abs(best[1] - r) ? cur : best))[0];
  };
  // Audio has no picture: it shows as a square artwork tile.
  if (kindOf(file) === 'audio') return Promise.resolve('1:1');
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (w: number, h: number) => {
      URL.revokeObjectURL(url);
      resolve(pick(w, h));
    };
    if (file.type.startsWith('video/')) {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
      v.onerror = () => done(0, 0);
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => done(img.naturalWidth, img.naturalHeight);
      img.onerror = () => done(0, 0);
      img.src = url;
    }
  });
}

export async function uploadToStorage(sb: SupabaseClient, path: string, file: File) {
  const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function removeFromStorage(sb: SupabaseClient, paths: (string | null | undefined)[]) {
  const list = paths.filter(Boolean) as string[];
  if (list.length) await sb.storage.from(MEDIA_BUCKET).remove(list);
}

/** Writes 0..n into `field` in the given order. */
export async function saveOrder(sb: SupabaseClient, table: string, ids: string[], field = 'sort_order') {
  const results = await Promise.all(ids.map((id, i) => sb.from(table).update({ [field]: i }).eq('id', id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export function newId() {
  return crypto.randomUUID();
}
