'use client';

import { MB, MAX_VIDEO_BYTES } from './admin-api';

// Shrinks big videos and uncompressed audio in the browser before they upload,
// so a 300 MB master becomes a web preview that fits the storage limit. It uses
// the browser's own hardware encoder (WebCodecs, through Mediabunny), so
// nothing leaves the computer until the smaller file is ready.

/** Videos above this are made into a preview; smaller ones upload as they are. */
export const COMPRESS_VIDEO_ABOVE = 20 * MB;
/** Audio above this, or any WAV/AIFF/FLAC, becomes an AAC preview. */
export const COMPRESS_AUDIO_ABOVE = 15 * MB;
/** The largest original the uploader accepts (it's compressed before upload). */
export const MAX_ORIGINAL_BYTES = 4 * 1024 * MB;

/** Aim under the storage limit with room to spare. */
const TARGET_BYTES = MAX_VIDEO_BYTES * 0.8;
const MAX_EDGE = 1920;
const AUDIO_BITRATE = 160_000;

const LOSSLESS_AUDIO = /\.(wav|aiff?|flac)$/i;

export function needsCompression(file: File) {
  if (file.type.startsWith('video/')) return file.size > COMPRESS_VIDEO_ABOVE;
  if (file.type.startsWith('audio/') || LOSSLESS_AUDIO.test(file.name)) {
    return file.size > COMPRESS_AUDIO_ABOVE || LOSSLESS_AUDIO.test(file.name);
  }
  return false;
}

const rename = (file: File, ext: string) => file.name.replace(/\.[^.]+$/, '') + `-preview.${ext}`;

/**
 * Makes a web preview of a video (MP4, H.264/AAC, at most 1920 px on the long
 * edge, bitrate picked from its length to land under the limit) or of an audio
 * file (AAC in M4A). Calls `onProgress` with 0–1. Returns the original when
 * the preview would not be smaller.
 */
export async function compressMedia(file: File, onProgress?: (p: number) => void): Promise<File> {
  const mb = await import('mediabunny');
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const isVideo = Boolean(await input.getPrimaryVideoTrack());
  const duration = Math.max(1, await input.computeDuration());

  const output = new mb.Output({
    format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new mb.BufferTarget(),
  });

  let video: import('mediabunny').ConversionVideoOptions | undefined;
  if (isVideo) {
    const track = (await input.getPrimaryVideoTrack())!;
    const long = Math.max(track.displayWidth, track.displayHeight);
    const scale = long > MAX_EDGE ? MAX_EDGE / long : 1;
    // Even numbers: encoders reject odd sizes.
    const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
    const bitrate = Math.min(6_000_000, Math.max(700_000, (TARGET_BYTES * 8) / duration - AUDIO_BITRATE));
    video = { codec: 'avc', width: even(track.displayWidth), height: even(track.displayHeight), fit: 'contain', bitrate, forceTranscode: true };
  }

  const conversion = await mb.Conversion.init({
    input,
    output,
    video,
    audio: { codec: 'aac', bitrate: AUDIO_BITRATE, forceTranscode: true },
  });
  if (!conversion.isValid) {
    throw new Error("This browser can't convert that file. Try Chrome, or compress it before uploading.");
  }
  conversion.onProgress = (p) => onProgress?.(p);
  await conversion.execute();

  const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer!;
  if (buffer.byteLength >= file.size) return file;
  return isVideo
    ? new File([buffer], rename(file, 'mp4'), { type: 'video/mp4' })
    : new File([buffer], rename(file, 'm4a'), { type: 'audio/mp4' });
}
