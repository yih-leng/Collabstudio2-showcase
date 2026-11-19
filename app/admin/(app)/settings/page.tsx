'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  FileUploader,
  InputField,
  PageHeader,
  Textarea,
  useToast,
  type FileUploaderItem,
} from '@collabrium/ui';
import { FileVideo, FilmReel, LinkSimple, TextAa, Trash } from '@phosphor-icons/react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminContext';
import styles from '@/components/admin/admin.module.css';
import { MediaFrame } from '@/components/MediaFrame';
import { MAX_VIDEO_BYTES, MB, extOf, removeFromStorage, uploadToStorage } from '@/lib/admin-api';
import { MAX_ORIGINAL_BYTES, compressMedia, needsCompression } from '@/lib/compress-media';
import { toEmbedUrl } from '@/lib/format';
import type { Showreel, SiteSettings } from '@/lib/types';

const EMPTY: SiteSettings = {
  hero_title: 'AI Creative Showcase',
  hero_intro: '',
  showreel: null,
  contact_email: '',
  contact_phone: '',
  contact_address: '',
};

export default function SettingsPage() {
  const { sb } = useAdmin();
  const { toast } = useToast();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [reelLink, setReelLink] = useState('');
  const [reelError, setReelError] = useState<string>();
  const [files, setFiles] = useState<FileUploaderItem[]>([]);
  const [oldReelPath, setOldReelPath] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await sb.from('settings').select('key, value');
      const next = { ...EMPTY } as Record<string, unknown>;
      for (const r of data ?? []) if (r.value !== null && r.value !== undefined) next[r.key] = r.value;
      setS(next as unknown as SiteSettings);
    })();
  }, [sb]);

  if (!s) {
    return (
      <AdminShell width="reading" header={<PageHeader title="Site settings" />}>
        <span aria-busy="true" />
      </AdminShell>
    );
  }

  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS((cur) => (cur ? { ...cur, [k]: v } : cur));

  const replaceReel = (reel: Showreel | null) => {
    if (s.showreel?.storage_path) setOldReelPath(s.showreel.storage_path);
    set('showreel', reel);
  };

  const uploadReel = async (file: File) => {
    setFiles([{ file, status: 'uploading', progress: 0 }]);
    try {
      // A big reel becomes a web preview first (the bar's first 90%).
      const send = needsCompression(file)
        ? await compressMedia(file, (p) => setFiles([{ file, status: 'uploading', progress: p * 0.9 }]))
        : file;
      if (send.size > MAX_VIDEO_BYTES) throw new Error(`Still ${Math.round(send.size / MB)} MB after compressing. Use a link instead.`);
      setFiles([{ file, status: 'uploading', progress: 0.9 }]);
      const path = `showreel/${Date.now()}.${extOf(send)}`;
      const url = await uploadToStorage(sb, path, send);
      replaceReel({ kind: 'video', url, storage_path: path });
      setFiles([{ file, status: 'done' }]);
    } catch (e) {
      setFiles([{ file, status: 'failed', message: (e as Error).message }]);
    }
  };

  const useLink = () => {
    if (!toEmbedUrl(reelLink)) {
      setReelError('Paste a YouTube, Vimeo or Google Drive link');
      return;
    }
    replaceReel({ kind: 'embed', url: reelLink.trim() });
    setReelLink('');
    setReelError(undefined);
  };

  const save = async () => {
    setSaving(true);
    const rows = Object.entries(s).map(([key, value]) => ({ key, value: typeof value === 'string' ? value.trim() : value }));
    const { error } = await sb.from('settings').upsert(rows);
    setSaving(false);
    if (error) {
      toast({ tone: 'danger', title: "Settings didn't save", message: error.message });
      return;
    }
    if (oldReelPath) {
      await removeFromStorage(sb, [oldReelPath]);
      setOldReelPath(null);
    }
    toast({ tone: 'success', title: 'Settings saved', message: 'The home page is up to date.' });
  };

  return (
    <AdminShell
      width="reading"
      header={
        <PageHeader
          title="Site settings"
          subtitle="The home page hero and the showreel."
          actions={
            <Button variant="primary" loading={saving} onClick={save}>
              Save
            </Button>
          }
        />
      }
    >
      <div className={styles.stack}>
        <Card>
          <CardHeader icon={TextAa} element="fire" title="Home page hero" headingLevel={2} />
          <div className={styles.cardBody}>
            <InputField label="Title" value={s.hero_title} onChange={(e) => set('hero_title', e.target.value)} />
            <Textarea
              label="Intro"
              helper="One line on KULT's AI creative capabilities"
              rows={3}
              maxLength={240}
              showCount
              value={s.hero_intro}
              onChange={(e) => set('hero_intro', e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <CardHeader icon={FilmReel} element="fire" title="Showreel" subtitle="Optional. Plays under the hero on the home page." headingLevel={2} />
          <div className={styles.cardBody}>
            {s.showreel && (
              <div className={styles.stackSm}>
                <MediaFrame media={{ kind: s.showreel.kind, url: s.showreel.url, aspect: '16:9', caption: 'Showreel' }} />
                <div>
                  <Button variant="ghost" size="sm" leadingIcon={Trash} onClick={() => replaceReel(null)}>
                    Remove showreel
                  </Button>
                </div>
              </div>
            )}
            <div className={styles.row}>
              <InputField
                label="Showreel link"
                type="url"
                leadingIcon={LinkSimple}
                value={reelLink}
                error={reelError}
                onChange={(e) => {
                  setReelLink(e.target.value);
                  setReelError(undefined);
                }}
              />
              <span className={styles.fit}>
                <Button variant="secondary" disabled={!reelLink.trim()} onClick={useLink}>
                  Use link
                </Button>
              </span>
            </div>
            <p className={styles.muted}>YouTube, Vimeo or Google Drive. Best for long videos.</p>
            <FileUploader
              title="Or drop an MP4 here"
              touchTitle="Or add an MP4"
              buttonLabel="Choose a file"
              rules={{
                noun: 'video',
                maxBytes: MAX_ORIGINAL_BYTES,
                label: 'MP4, MOV or WebM',
                sizeTip: 'Big reels are made into a smaller web preview before they upload.',
                types: [
                  { ext: 'mp4', mime: 'video/mp4', icon: FileVideo },
                  { ext: 'webm', mime: 'video/webm', icon: FileVideo },
                  { ext: 'mov', mime: 'video/quicktime', icon: FileVideo },
                ],
              }}
              files={files}
              onFilesChange={setFiles}
              onAccept={uploadReel}
              onRetry={uploadReel}
            />
          </div>
        </Card>

        <div>
          <Button variant="primary" loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}
