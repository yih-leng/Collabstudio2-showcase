'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Dropdown,
  FileUploader,
  InfoBanner,
  InputField,
  Modal,
  useToast,
  type FileUploaderItem,
  type FileUploaderRules,
} from '@collabrium/ui';
import { FileAudio, FileImage, FileVideo, LinkSimple, Trash } from '@phosphor-icons/react';
import {
  MAX_VIDEO_BYTES,
  MB,
  detectAspect,
  extOf,
  kindOf,
  newId,
  removeFromStorage,
  saveOrder,
  uploadToStorage,
} from '@/lib/admin-api';
import { MAX_ORIGINAL_BYTES, compressMedia, needsCompression } from '@/lib/compress-media';
import { ASPECTS, ASPECT_LABEL, embedProvider, toEmbedUrl } from '@/lib/format';
import type { Aspect, Media } from '@/lib/types';
import { MediaFrame } from '../MediaFrame';
import { useAdmin } from './AdminContext';
import { SortableList } from './SortableList';
import styles from './media.module.css';
import shared from './admin.module.css';

const RULES: FileUploaderRules = {
  noun: 'file',
  many: true,
  maxFiles: 20,
  // Big videos and audio are compressed in the browser before upload, so the original can be large.
  maxBytes: MAX_ORIGINAL_BYTES,
  label: 'images, videos (MP4, MOV, WebM) or audio (MP3, WAV, M4A)',
  sizeTip: 'Large videos and WAV files are made into a smaller web preview before they upload.',
  types: [
    { ext: 'jpg', mime: 'image/jpeg', icon: FileImage },
    { ext: 'jpeg', mime: 'image/jpeg', icon: FileImage },
    { ext: 'png', mime: 'image/png', icon: FileImage },
    { ext: 'webp', mime: 'image/webp', icon: FileImage },
    { ext: 'gif', mime: 'image/gif', icon: FileImage },
    { ext: 'mp4', mime: 'video/mp4', icon: FileVideo },
    { ext: 'mov', mime: 'video/quicktime', icon: FileVideo },
    { ext: 'webm', mime: 'video/webm', icon: FileVideo },
    { ext: 'mp3', mime: 'audio/mpeg', icon: FileAudio },
    { ext: 'm4a', mime: ['audio/mp4', 'audio/x-m4a'], icon: FileAudio },
    { ext: 'aac', mime: 'audio/aac', icon: FileAudio },
    { ext: 'wav', mime: ['audio/wav', 'audio/x-wav', 'audio/wave'], icon: FileAudio },
    { ext: 'aif', mime: 'audio/aiff', icon: FileAudio },
    { ext: 'aiff', mime: ['audio/aiff', 'audio/x-aiff'], icon: FileAudio },
    { ext: 'flac', mime: 'audio/flac', icon: FileAudio },
    { ext: 'ogg', mime: 'audio/ogg', icon: FileAudio },
  ],
};

const aspectOptions = ASPECTS.map((a) => ({ value: a, label: ASPECT_LABEL[a] }));

/** Upload, link, caption, size and order a project's media; pick its cover and hero. Saves as you go. */
export function MediaManager({
  projectId,
  media,
  setMedia,
  coverId,
  heroId,
  setCoverHero,
}: {
  projectId: string;
  media: Media[];
  setMedia: (next: Media[] | ((m: Media[]) => Media[])) => void;
  coverId: string | null;
  heroId: string | null;
  setCoverHero: (values: { cover_media_id?: string | null; hero_media_id?: string | null }) => Promise<void>;
}) {
  const { sb } = useAdmin();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileUploaderItem[]>([]);
  const [link, setLink] = useState('');
  const [linkAspect, setLinkAspect] = useState<Aspect>('16:9');
  const [linkError, setLinkError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState<Media | null>(null);

  const setFileState = (file: File, patch: Partial<FileUploaderItem>) =>
    setFiles((fs) => fs.map((f) => (f.file === file ? { ...f, ...patch } : f)));

  const nextOrder = () => Math.max(-1, ...media.map((m) => m.sort_order)) + 1;

  const addRow = async (row: Omit<Media, 'id' | 'sort_order'>) => {
    const full: Media = { ...row, id: newId(), sort_order: nextOrder() };
    const { error } = await sb.from('media').insert(full);
    if (error) throw error;
    setMedia((m) => [...m, full]);
    // First picture in becomes the cover and hero, so the card never sits empty. Audio has no picture.
    if (!coverId && full.kind !== 'audio') await setCoverHero({ cover_media_id: full.id, ...(heroId ? {} : { hero_media_id: full.id }) });
    return full;
  };

  const upload = async (file: File) => {
    const kind = kindOf(file);
    if (!kind) {
      setFileState(file, { status: 'failed', message: 'Only images, videos and audio can be added here.' });
      return;
    }
    setFileState(file, { status: 'uploading', progress: 0 });
    try {
      // Big videos and lossless audio: make a web preview first (the bar's first 90%).
      let send = file;
      if (needsCompression(file)) {
        send = await compressMedia(file, (p) => setFileState(file, { status: 'uploading', progress: p * 0.9 }));
        toast({
          tone: 'success',
          title: 'Made a web preview',
          message: `${file.name}: ${(file.size / MB).toFixed(0)} MB → ${(send.size / MB).toFixed(1)} MB`,
        });
      }
      if (send.size > MAX_VIDEO_BYTES) {
        throw new Error(`Still ${(send.size / MB).toFixed(0)} MB after compressing, over the ${MAX_VIDEO_BYTES / MB} MB limit. Paste a YouTube or Vimeo link instead.`);
      }
      setFileState(file, { status: 'uploading', progress: 0.9 });
      const [aspect, path] = [await detectAspect(send), `projects/${projectId}/${newId()}.${extOf(send)}`];
      const url = await uploadToStorage(sb, path, send);
      // A track's name starts as its file name, so the player has a title.
      const caption = kind === 'audio' ? file.name.replace(/\.[^.]+$/, '') : null;
      await addRow({ project_id: projectId, kind, url, storage_path: path, aspect, caption });
      setFileState(file, { status: 'done' });
      setTimeout(() => setFiles((fs) => fs.filter((f) => f.file !== file)), 2000);
    } catch (e) {
      setFileState(file, { status: 'failed', message: (e as Error).message || 'Upload failed. Please try again.' });
    }
  };

  const addLink = async () => {
    if (!toEmbedUrl(link)) {
      setLinkError('Paste a YouTube, Vimeo or Google Drive link');
      return;
    }
    try {
      await addRow({ project_id: projectId, kind: 'embed', url: link.trim(), storage_path: null, aspect: linkAspect, caption: null });
      setLink('');
      setLinkError(undefined);
      toast({ tone: 'success', title: `${embedProvider(link)} video added` });
    } catch (e) {
      toast({ tone: 'danger', title: "That link didn't save", message: (e as Error).message });
    }
  };

  const update = async (id: string, values: Partial<Media>) => {
    setMedia((m) => m.map((x) => (x.id === id ? { ...x, ...values } : x)));
    const { error } = await sb.from('media').update(values).eq('id', id);
    if (error) toast({ tone: 'danger', title: "That change didn't save", message: error.message });
  };

  const reorder = async (next: Media[]) => {
    setMedia(next.map((m, i) => ({ ...m, sort_order: i })));
    try {
      await saveOrder(sb, 'media', next.map((m) => m.id));
    } catch (e) {
      toast({ tone: 'danger', title: "The new order didn't save", message: (e as Error).message });
    }
  };

  const remove = async () => {
    const m = deleting;
    setDeleting(null);
    if (!m) return;
    const resetting: { cover_media_id?: null; hero_media_id?: null } = {};
    if (m.id === coverId) resetting.cover_media_id = null;
    if (m.id === heroId) resetting.hero_media_id = null;
    if (Object.keys(resetting).length) await setCoverHero(resetting);
    const { error } = await sb.from('media').delete().eq('id', m.id);
    if (error) {
      toast({ tone: 'danger', title: "That file wasn't deleted", message: error.message });
      return;
    }
    await removeFromStorage(sb, [m.storage_path]);
    setMedia((list) => list.filter((x) => x.id !== m.id));
    toast({ tone: 'success', title: 'Deleted' });
  };

  const sorted = [...media].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className={shared.stack}>
      <FileUploader
        title="Drop images, videos and audio here"
        touchTitle="Add images, videos and audio"
        dragTitle="Let go to upload"
        buttonLabel="Choose files"
        caption="Files upload straight away and appear in the list below."
        rules={RULES}
        files={files}
        onFilesChange={setFiles}
        onAccept={upload}
        onRetry={upload}
        thumbnails
        showTypeIcons
      />

      <div className={shared.row}>
        <InputField
          label="Or paste a video link"
          leadingIcon={LinkSimple}
          type="url"
          value={link}
          error={linkError}
          onChange={(e) => {
            setLink(e.target.value);
            setLinkError(undefined);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addLink();
            }
          }}
        />
        <Dropdown label="Shape" options={aspectOptions} value={linkAspect} onValueChange={(v) => setLinkAspect(v as Aspect)} />
        <span className={shared.fit}>
          <Button variant="secondary" onClick={addLink} disabled={!link.trim()}>
            Add link
          </Button>
        </span>
      </div>
      <p className={shared.muted}>YouTube, Vimeo or Google Drive. Best for long or large videos.</p>

      {sorted.length === 0 ? (
        <InfoBanner tone="neutral">No media yet. The project shows placeholders until you add some.</InfoBanner>
      ) : (
        <div className={styles.listCard}>
          <SortableList
            items={sorted}
            onReorder={reorder}
            label={(m) => m.caption || `${m.kind} ${sorted.indexOf(m) + 1}`}
            renderItem={(m, i) => (
              <div className={styles.item}>
                <div className={styles.preview} data-vertical={m.aspect === '9:16' || m.aspect === '4:5' || undefined}>
                  <MediaFrame media={m} mode="thumb" />
                </div>
                <div className={styles.fields}>
                  <div className={shared.badges}>
                    <Badge variant="neutral">{m.kind === 'embed' ? embedProvider(m.url) : m.kind === 'video' ? 'Video' : m.kind === 'audio' ? 'Audio' : 'Image'}</Badge>
                    {m.id === coverId && <Badge variant="selected">Cover</Badge>}
                    {m.id === heroId && <Badge variant="selected">Hero</Badge>}
                  </div>
                  <div className={shared.row}>
                    <InputField
                      label={`Caption for item ${i + 1}`}
                      hideLabel
                      placeholder={m.kind === 'audio' ? 'Track name' : 'Caption (optional)'}
                      size="sm"
                      defaultValue={m.caption ?? ''}
                      onBlur={(e) => {
                        const caption = e.target.value.trim() || null;
                        if (caption !== m.caption) update(m.id, { caption });
                      }}
                    />
                    <Dropdown
                      label={`Shape of item ${i + 1}`}
                      hideLabel
                      options={aspectOptions}
                      value={m.aspect}
                      onValueChange={(v) => v !== m.aspect && update(m.id, { aspect: v as Aspect })}
                    />
                  </div>
                  <div className={shared.actions}>
                    {/* Vimeo and Drive links, and audio, have no thumbnail we can show, so they can't be the cover. */}
                    {m.id !== coverId && m.kind !== 'audio' && (m.kind !== 'embed' || m.url.includes('youtu')) && (
                      <Button variant="ghost" size="sm" onClick={() => setCoverHero({ cover_media_id: m.id })}>
                        Use as cover
                      </Button>
                    )}
                    {m.id !== heroId && (
                      <Button variant="ghost" size="sm" onClick={() => setCoverHero({ hero_media_id: m.id })}>
                        Use as hero
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" leadingIcon={Trash} onClick={() => setDeleting(m)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      )}

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this file?"
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
        {deleting?.kind === 'embed'
          ? 'The link comes off this project. The video itself stays where it is.'
          : "It's removed from the project and from storage. This can't be undone."}
      </Modal>
    </div>
  );
}
