'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BackButton,
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  FileUploader,
  InfoBanner,
  InputField,
  LoadingState,
  PageHeader,
  ProgressBar,
  Textarea,
  useToast,
  type FileUploaderItem,
  type FileUploaderRules,
} from '@collabrium/ui';
import { Check, FilePdf, FilePpt, FileText, FilmSlate, MusicNotes, Plus, X } from '@phosphor-icons/react';
import { useAdmin } from '@/components/admin/AdminContext';
import { AdminShell } from '@/components/admin/AdminShell';
import shared from '@/components/admin/admin.module.css';
import { MB } from '@/lib/admin-api';
import { STATUS_LABEL, embedProvider } from '@/lib/format';
import { createFromDraft } from '@/lib/import/create';
import { draftDeck } from '@/lib/import/draft';
import { parseDeck } from '@/lib/import/parse';
import type { DeckAsset, ParsedDeck, ProjectDraft } from '@/lib/import/types';
import type { ProjectStatus } from '@/lib/types';
import styles from './import.module.css';

const RULES: FileUploaderRules = {
  noun: 'deck',
  many: true,
  maxFiles: 10,
  // Decks are opened in this browser, not uploaded, so they can be big.
  maxBytes: 1024 * MB,
  label: 'PowerPoint (.pptx), PDF or OpenDocument (.odp)',
  sizeTip: 'Decks are read on this computer. Only the pictures you pick are uploaded.',
  types: [
    { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', icon: FilePpt },
    { ext: 'pdf', mime: 'application/pdf', icon: FilePdf },
    { ext: 'odp', mime: 'application/vnd.oasis.opendocument.presentation', icon: FileText },
  ],
};

type Job = { file: File; stage: 'reading' | 'drafting' | 'ready' | 'failed'; message?: string; deck?: ParsedDeck; basic?: boolean };

type Outcome =
  | { state: 'creating'; label: string; value: number }
  | { state: 'done'; id: string; skipped: string[] }
  | { state: 'failed'; message: string };

type Review = {
  key: string;
  deckId: string;
  include: boolean;
  draft: ProjectDraft;
  /** Chosen asset ids, in page order. */
  picked: string[];
  links: string[];
  outcome?: Outcome;
};

const STAGE_PROGRESS = { reading: 0.25, drafting: 0.6 } as const;

export default function ImportPage() {
  const { sb, lists, refreshLists } = useAdmin();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [creating, setCreating] = useState(false);

  const names = useMemo(
    () => ({
      clients: lists.clients.map((c) => c.name),
      types: lists.categories.map((c) => c.name),
      capabilities: lists.tags.filter((t) => t.type === 'capability').map((t) => t.name),
      tools: lists.tags.filter((t) => t.type === 'tool').map((t) => t.name),
    }),
    [lists],
  );

  const setJob = (file: File, patch: Partial<Job>) => setJobs((js) => js.map((j) => (j.file === file ? { ...j, ...patch } : j)));

  const read = async (file: File) => {
    setJobs((js) => [...js.filter((j) => j.file !== file), { file, stage: 'reading' }]);
    try {
      const deck = await parseDeck(file);
      setJob(file, { stage: 'drafting', deck });
      const { drafts, basic } = await draftDeck(deck, names);
      setJob(file, { stage: 'ready', basic });
      setReviews((rs) => [
        ...rs.filter((r) => r.deckId !== deck.id),
        ...drafts.map((draft, i) => ({
          key: `${deck.id}-${i}`,
          deckId: deck.id,
          include: true,
          draft,
          picked: draft.asset_ids,
          links: draft.video_links,
        })),
      ]);
      if (!drafts.length) setJob(file, { stage: 'failed', message: 'No projects found in this deck.' });
    } catch (e) {
      setJob(file, { stage: 'failed', message: (e as Error).message || "This deck couldn't be read." });
    }
  };

  const remove = (file: File) => {
    const deckId = jobs.find((j) => j.file === file)?.deck?.id;
    setJobs((js) => js.filter((j) => j.file !== file));
    if (deckId) setReviews((rs) => rs.filter((r) => r.deckId !== deckId));
  };

  const items: FileUploaderItem[] = jobs.map((j) =>
    j.stage === 'failed'
      ? { file: j.file, status: 'failed', message: j.message }
      : j.stage === 'ready'
        ? { file: j.file, status: 'done' }
        : { file: j.file, status: 'uploading', progress: STAGE_PROGRESS[j.stage] },
  );
  const busy = jobs.filter((j) => j.stage === 'reading' || j.stage === 'drafting');
  const basic = jobs.some((j) => j.basic);

  const patch = (key: string, p: Partial<Review>) => setReviews((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const patchDraft = (key: string, p: Partial<ProjectDraft>) =>
    setReviews((rs) => rs.map((r) => (r.key === key ? { ...r, draft: { ...r.draft, ...p } } : r)));

  const chosen = reviews.filter((r) => r.include && r.outcome?.state !== 'done');

  const createAll = async () => {
    setCreating(true);
    // A working copy of the lists, so a client added for one project is reused by the next.
    const working = { clients: [...lists.clients], categories: [...lists.categories], tags: [...lists.tags] };
    let made = 0;
    for (const r of chosen) {
      const deck = jobs.find((j) => j.deck?.id === r.deckId)?.deck;
      if (!deck) continue;
      const assets = r.picked.map((id) => deck.assets.find((a) => a.id === id)).filter(Boolean) as DeckAsset[];
      const draft = { ...r.draft, cover_asset_id: r.picked.includes(r.draft.cover_asset_id) ? r.draft.cover_asset_id : '' };
      patch(r.key, { outcome: { state: 'creating', label: 'Starting', value: 0 } });
      try {
        const { id, skipped } = await createFromDraft(sb, working, draft, assets, r.links, (p) =>
          patch(r.key, { outcome: { state: 'creating', ...p } }),
        );
        patch(r.key, { outcome: { state: 'done', id, skipped } });
        made++;
      } catch (e) {
        patch(r.key, { outcome: { state: 'failed', message: (e as Error).message } });
      }
    }
    await refreshLists();
    setCreating(false);
    if (made) toast({ tone: 'success', title: `Created ${made} draft project${made === 1 ? '' : 's'}`, message: 'Open each one to check it, then publish.' });
  };

  const decks = jobs.filter((j) => j.deck && reviews.some((r) => r.deckId === j.deck!.id));

  return (
    <AdminShell
      header={
        <>
          <BackButton label="Projects" href="/admin" />
          <PageHeader title="Import from deck" subtitle="Turn pitch and case-study decks into draft projects, with their pictures and videos." />
        </>
      }
    >
      <div className={shared.stack}>
        <Card>
          <div className={shared.stackSm}>
            <ol className={styles.steps}>
              <li>Add one or more decks. Each is read on this computer, and Claude drafts the projects in it.</li>
              <li>Check each draft: fix the words, pick the pictures and the cover, untick anything that shouldn’t be a project.</li>
              <li>Create them. They’re saved as drafts, so nothing shows on the site until you publish.</li>
            </ol>
            <InfoBanner tone="info">
              From Google Slides, use File → Download → Microsoft PowerPoint (.pptx). It keeps the full-size pictures and any videos stored in the deck.
            </InfoBanner>
            <FileUploader
              title="Drop decks here"
              touchTitle="Add decks"
              dragTitle="Let go to read"
              buttonLabel="Choose decks"
              caption="Read one by one; a long deck takes a minute or two."
              rules={RULES}
              files={items}
              onFilesChange={(next) => setJobs((js) => js.filter((j) => next.some((n) => n.file === j.file)))}
              onAccept={read}
              onRetry={read}
              onRemove={remove}
              showTypeIcons
            />
            {busy.map((j) => (
              <LoadingState
                key={j.file.name + j.file.size}
                variant="dots"
                label={j.stage === 'reading' ? `Reading ${j.file.name}…` : `Drafting projects from ${j.file.name}…`}
              />
            ))}
            {basic && (
              <InfoBanner tone="warning">
                AI drafting isn’t set up, so only titles, pictures and a passage of text are filled in. Add ANTHROPIC_API_KEY to the
                server’s environment (README: “Import from deck”) to have every field written for you.
              </InfoBanner>
            )}
          </div>
        </Card>

        {decks.map((j) => (
          <section key={j.deck!.id} className={shared.stack} aria-label={j.deck!.fileName}>
            <div className={styles.deckHead}>
              <h2 className={styles.deckName}>{j.deck!.fileName}</h2>
              <span className={shared.muted}>
                {j.deck!.slides.length} slides · {j.deck!.assets.filter((a) => !a.decorative).length} pictures and videos
                {j.deck!.links.length > 0 && ` · ${j.deck!.links.length} video links`}
              </span>
            </div>
            {reviews
              .filter((r) => r.deckId === j.deck!.id)
              .map((r) => (
                <DraftCard
                  key={r.key}
                  review={r}
                  deck={j.deck!}
                  disabled={creating || r.outcome?.state === 'done'}
                  onPatch={(p) => patch(r.key, p)}
                  onDraft={(p) => patchDraft(r.key, p)}
                />
              ))}
          </section>
        ))}

        {reviews.length > 0 && (
          <div className={styles.footer}>
            <span className={shared.muted}>
              {chosen.length
                ? `${chosen.length} project${chosen.length === 1 ? '' : 's'} will be created as drafts.`
                : 'Nothing left to create.'}
            </span>
            <Button variant="primary" leadingIcon={Plus} loading={creating} disabled={!chosen.length || busy.length > 0} onClick={createAll}>
              {chosen.length ? `Create ${chosen.length} draft${chosen.length === 1 ? '' : 's'}` : 'Create drafts'}
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

const commaList = (v: string[]) => v.join(', ');
const fromComma = (s: string) => s.split(/, ?/);

function DraftCard({
  review: r,
  deck,
  disabled,
  onPatch,
  onDraft,
}: {
  review: Review;
  deck: ParsedDeck;
  disabled: boolean;
  onPatch: (p: Partial<Review>) => void;
  onDraft: (p: Partial<ProjectDraft>) => void;
}) {
  const d = r.draft;
  const onSlides = new Set(d.slides);
  // This project's slides first; everything else in the deck is a click away.
  const mine = deck.assets.filter((a) => r.picked.includes(a.id) || (!a.decorative && a.slides.some((n) => onSlides.has(n))));
  const rest = deck.assets.filter((a) => !mine.includes(a));
  const allLinks = [...new Set([...d.video_links, ...deck.links])];

  const toggle = (id: string) => onPatch({ picked: r.picked.includes(id) ? r.picked.filter((x) => x !== id) : [...r.picked, id] });
  const setCover = (id: string) => {
    onDraft({ cover_asset_id: id });
    if (!r.picked.includes(id)) onPatch({ picked: [id, ...r.picked] });
  };
  const slideRange = d.slides.length ? `Slides ${Math.min(...d.slides)}–${Math.max(...d.slides)}` : '';

  if (r.outcome?.state === 'done') {
    return (
      <Card>
        <div className={styles.result}>
          <div className={styles.resultHead}>
            <span>{d.title}</span>
            <Link href={`/admin/projects/${r.outcome.id}`}>Open in the editor</Link>
          </div>
          <span className={shared.muted}>Created as a draft.</span>
          {r.outcome.skipped.length > 0 && (
            <InfoBanner tone="warning">
              {`${r.outcome.skipped.length} file${r.outcome.skipped.length === 1 ? '' : 's'} couldn’t be added: ${r.outcome.skipped.join('; ')}`}
            </InfoBanner>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className={styles.draft} data-off={!r.include || undefined}>
        <div className={styles.draftHead}>
          <Checkbox label="Create this project" checked={r.include} disabled={disabled} onChange={(e) => onPatch({ include: e.target.checked })} />
          {slideRange && <Badge variant="neutral">{slideRange}</Badge>}
        </div>

        {r.outcome?.state === 'creating' && <ProgressBar title={r.outcome.label} value={r.outcome.value * 100} />}
        {r.outcome?.state === 'failed' && <InfoBanner tone="danger">{r.outcome.message}</InfoBanner>}

        {d.reviewer_notes.length > 0 && (
          <InfoBanner tone="warning">
            <ul className={styles.notes}>
              {d.reviewer_notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </InfoBanner>
        )}

        <fieldset disabled={disabled || !r.include} className={`${shared.stackSm} ${styles.fieldset}`}>
          <InputField label="Title" value={d.title} onChange={(e) => onDraft({ title: e.target.value })} />
          <div className={shared.grid2}>
            <InputField
              label="Clients"
              helper="Separate with commas. New names are added to Clients and tags."
              value={commaList(d.client_names)}
              onChange={(e) => onDraft({ client_names: fromComma(e.target.value) })}
            />
            <InputField label="Project type" value={d.type_name} onChange={(e) => onDraft({ type_name: e.target.value })} />
            <InputField
              label="Year"
              type="number"
              value={d.year ? String(d.year) : ''}
              onChange={(e) => onDraft({ year: Number(e.target.value) || 0 })}
            />
            <Dropdown
              label="Status"
              options={(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              value={d.status}
              onValueChange={(v) => onDraft({ status: v as ProjectStatus })}
            />
          </div>
          <InputField label="One-liner" value={d.one_liner} onChange={(e) => onDraft({ one_liner: e.target.value })} />
          <Textarea label="About this project" rows={4} value={d.about} onChange={(e) => onDraft({ about: e.target.value })} />

          <details className={styles.more}>
            <summary>Output, overview and capabilities</summary>
            <div className={shared.stackSm}>
              <Textarea label="Output summary" rows={2} value={d.output_summary} onChange={(e) => onDraft({ output_summary: e.target.value })} />
              <Textarea
                label="Deliverables"
                helper="One per line"
                rows={4}
                value={d.deliverables.join('\n')}
                onChange={(e) => onDraft({ deliverables: e.target.value.split('\n') })}
              />
              <p className={styles.label}>Overview</p>
              {d.overview_blocks.map((b, i) => (
                <div key={i} className={styles.block}>
                  <div className={shared.row}>
                    <InputField
                      label="Label"
                      value={b.label}
                      onChange={(e) => onDraft({ overview_blocks: d.overview_blocks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                    />
                    <span className={shared.fit}>
                      <Button
                        variant="secondary"
                        iconOnly
                        icon={X}
                        aria-label={`Remove ${b.label || 'block'}`}
                        onClick={() => onDraft({ overview_blocks: d.overview_blocks.filter((_, j) => j !== i) })}
                      />
                    </span>
                  </div>
                  <Textarea
                    label="Text"
                    hideLabel
                    rows={3}
                    value={b.body}
                    onChange={(e) => onDraft({ overview_blocks: d.overview_blocks.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })}
                  />
                </div>
              ))}
              <span>
                <Button variant="secondary" size="sm" leadingIcon={Plus} onClick={() => onDraft({ overview_blocks: [...d.overview_blocks, { label: '', body: '' }] })}>
                  Add block
                </Button>
              </span>
              <Textarea
                label="Capabilities summary"
                rows={2}
                value={d.capabilities_summary}
                onChange={(e) => onDraft({ capabilities_summary: e.target.value })}
              />
              <InputField
                label="Capabilities"
                helper="Separate with commas"
                value={commaList(d.capability_names)}
                onChange={(e) => onDraft({ capability_names: fromComma(e.target.value) })}
              />
              <Textarea
                label={d.workflow_label || 'How AI was used'}
                helper="One step per line"
                rows={4}
                value={d.workflow_steps.join('\n')}
                onChange={(e) => onDraft({ workflow_steps: e.target.value.split('\n') })}
              />
              <InputField
                label="AI tools"
                helper="Separate with commas"
                value={commaList(d.tool_names)}
                onChange={(e) => onDraft({ tool_names: fromComma(e.target.value) })}
              />
            </div>
          </details>

          <p className={styles.label}>{`Pictures and videos · ${r.picked.length} chosen`}</p>
          <AssetGrid assets={mine} picked={r.picked} cover={d.cover_asset_id} onToggle={toggle} onCover={setCover} />
          {rest.length > 0 && (
            <details className={styles.more}>
              <summary>{`More from this deck (${rest.length}), including logos and backgrounds`}</summary>
              <AssetGrid assets={rest} picked={r.picked} cover={d.cover_asset_id} onToggle={toggle} onCover={setCover} />
            </details>
          )}

          {allLinks.length > 0 && (
            <div className={styles.links}>
              <p className={styles.label}>Video links</p>
              {allLinks.map((l) => (
                <Checkbox
                  key={l}
                  label={`${embedProvider(l)} video`}
                  description={l}
                  checked={r.links.includes(l)}
                  onChange={(e) => onPatch({ links: e.target.checked ? [...r.links, l] : r.links.filter((x) => x !== l) })}
                />
              ))}
            </div>
          )}
        </fieldset>
      </div>
    </Card>
  );
}

function AssetGrid({
  assets,
  picked,
  cover,
  onToggle,
  onCover,
}: {
  assets: DeckAsset[];
  picked: string[];
  cover: string;
  onToggle: (id: string) => void;
  onCover: (id: string) => void;
}) {
  return (
    <div className={styles.assets}>
      {assets.map((a) => {
        const on = picked.includes(a.id);
        const label = `${a.kind === 'image' ? 'Picture' : a.kind === 'video' ? 'Video' : 'Audio'} from slide ${a.slides.join(', ')}`;
        return (
          <div key={a.id} className={styles.asset}>
            <button type="button" className={styles.tile} aria-pressed={on} aria-label={label} onClick={() => onToggle(a.id)}>
              {a.thumb ? (
                <img src={a.thumb} alt="" />
              ) : (
                <span className={styles.tileIcon}>{a.kind === 'audio' ? <MusicNotes aria-hidden /> : <FilmSlate aria-hidden />}</span>
              )}
              {on && (
                <span className={styles.check} aria-hidden>
                  <Check weight="bold" />
                </span>
              )}
              {a.kind !== 'image' && (
                <span className={styles.kind} aria-hidden>
                  {a.kind === 'video' ? <FilmSlate /> : <MusicNotes />}
                  {`${(a.file.size / MB).toFixed(0)} MB`}
                </span>
              )}
            </button>
            <span className={styles.assetMeta}>
              <span>{`Slide ${a.slides[0]}`}</span>
              {a.kind === 'image' && (
                <button type="button" className={styles.coverBtn} aria-pressed={cover === a.id} onClick={() => onCover(a.id)}>
                  {cover === a.id ? 'Cover' : 'Set cover'}
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
