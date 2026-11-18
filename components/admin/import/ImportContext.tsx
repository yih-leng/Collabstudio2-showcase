'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@collabrium/ui';
import { useAdmin } from '@/components/admin/AdminContext';
import { createFromDraft } from '@/lib/import/create';
import { DraftError, basicDrafts, draftDeck, estimateDeck } from '@/lib/import/draft';
import { parseDeck } from '@/lib/import/parse';
import type { DeckAsset, DraftEstimate, DraftUsage, ListNames, ParsedDeck, ProjectDraft } from '@/lib/import/types';
import { ImportOverlay } from './ImportOverlay';

// Import from deck, held above the admin pages so drafting carries on while
// the overlay is closed or the admin moves to another page. Decks are read in
// this browser tab, so closing or reloading the tab stops the work; the page
// asks first.

export type Job = {
  file: File;
  /** Reading, then pricing, then waiting for the go-ahead, then drafting. */
  stage: 'reading' | 'estimating' | 'awaiting' | 'drafting' | 'ready' | 'failed';
  message?: string;
  deck?: ParsedDeck;
  basic?: boolean;
  estimate?: DraftEstimate;
  /** What Claude actually used, success or not. */
  usage?: DraftUsage;
  /** When drafting started, for the trace's timer. */
  startedAt?: number;
  drafted?: number;
};

export type Outcome =
  | { state: 'creating'; label: string; value: number }
  | { state: 'done'; id: string; skipped: string[] }
  | { state: 'failed'; message: string };

export type Review = {
  key: string;
  deckId: string;
  include: boolean;
  draft: ProjectDraft;
  /** Chosen asset ids, in page order. */
  picked: string[];
  links: string[];
  outcome?: Outcome;
};

export type ImportView = 'add' | 'drafting' | 'review' | 'done';

interface ImportCtx {
  open: boolean;
  view: ImportView;
  jobs: Job[];
  reviews: Review[];
  creating: boolean;
  /** Bumped after projects are created, so a list on screen can reload. */
  createdAt: number;
  show: (view?: ImportView) => void;
  hide: () => void;
  setView: (view: ImportView) => void;
  read: (file: File) => void;
  remove: (file: File) => void;
  draftAll: () => void;
  retry: (job: Job) => void;
  patch: (key: string, p: Partial<Review>) => void;
  patchDraft: (key: string, p: Partial<ProjectDraft>) => void;
  createAll: () => Promise<void>;
  reset: () => void;
}

const Ctx = createContext<ImportCtx | null>(null);

export function useImport() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useImport must be used inside ImportProvider');
  return v;
}

export const isBusy = (j: Job) => j.stage === 'reading' || j.stage === 'estimating' || j.stage === 'drafting';
/** Reviews still to act on: ticked and not yet created. */
export const pendingReviews = (rs: Review[]) => rs.filter((r) => r.include && r.outcome?.state !== 'done');

export function ImportProvider({ children }: { children: React.ReactNode }) {
  const { sb, lists, refreshLists } = useAdmin();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ImportView>('add');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdAt, setCreatedAt] = useState(0);
  // Read inside async work, where state would be stale.
  const openRef = useRef(open);
  openRef.current = open;
  // Once Draft is pressed, decks still being read draft as soon as they're priced.
  const autoDraft = useRef(false);

  const names = useMemo<ListNames>(
    () => ({
      clients: lists.clients.map((c) => c.name),
      types: lists.categories.map((c) => c.name),
      capabilities: lists.tags.filter((t) => t.type === 'capability').map((t) => t.name),
      tools: lists.tags.filter((t) => t.type === 'tool').map((t) => t.name),
    }),
    [lists],
  );

  const setJob = (file: File, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.file === file ? { ...j, ...p } : j)));

  const addDrafts = (deck: ParsedDeck, drafts: ProjectDraft[]) =>
    setReviews((rs) => [
      ...rs.filter((r) => r.deckId !== deck.id),
      ...drafts.map((draft, i) => ({ key: `${deck.id}-${i}`, deckId: deck.id, include: true, draft, picked: draft.asset_ids, links: draft.video_links })),
    ]);

  const draft = async (file: File, deck: ParsedDeck) => {
    setJob(file, { stage: 'drafting', startedAt: Date.now(), message: undefined });
    try {
      const { drafts, usage } = await draftDeck(deck, names);
      if (!drafts.length) {
        setJob(file, { stage: 'failed', usage, message: 'No projects found in this deck.' });
        return;
      }
      setJob(file, { stage: 'ready', usage, drafted: drafts.length });
      addDrafts(deck, drafts);
      if (!openRef.current) {
        toast({
          tone: 'success',
          title: `${drafts.length} draft${drafts.length === 1 ? '' : 's'} ready to review`,
          message: `From ${deck.fileName}`,
          action: { label: 'Review', onClick: () => show('review') },
        });
      }
    } catch (e) {
      const message = (e as Error).message || 'Drafting failed.';
      setJob(file, { stage: 'failed', usage: (e as DraftError).usage, message });
      if (!openRef.current) {
        toast({ tone: 'danger', title: "A deck couldn't be drafted", message: deck.fileName, action: { label: 'Open', onClick: () => show('drafting') } });
      }
    }
  };

  // Read the deck and price the draft; drafting waits for the go-ahead.
  const read = async (file: File) => {
    setJobs((js) => [...js.filter((j) => j.file !== file), { file, stage: 'reading' }]);
    try {
      const deck = await parseDeck(file);
      setJob(file, { stage: 'estimating', deck });
      const estimate = await estimateDeck(deck, names);
      if (!estimate) {
        // No AI key: simple drafts straight away, at no cost.
        setJob(file, { stage: 'ready', basic: true, drafted: 1 });
        addDrafts(deck, basicDrafts(deck));
        return;
      }
      setJob(file, { stage: 'awaiting', estimate });
      if (autoDraft.current) draft(file, deck);
    } catch (e) {
      setJob(file, { stage: 'failed', message: (e as Error).message || "This deck couldn't be read." });
    }
  };

  const remove = (file: File) => {
    const deckId = jobs.find((j) => j.file === file)?.deck?.id;
    setJobs((js) => js.filter((j) => j.file !== file));
    if (deckId) setReviews((rs) => rs.filter((r) => r.deckId !== deckId));
  };

  const draftAll = () => {
    autoDraft.current = true;
    jobs.filter((j) => j.stage === 'awaiting').forEach((j) => draft(j.file, j.deck!));
    setView('drafting');
  };

  const retry = (job: Job) => {
    if (job.deck && job.estimate) draft(job.file, job.deck);
    else read(job.file);
  };

  const patch = (key: string, p: Partial<Review>) => setReviews((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const patchDraft = (key: string, p: Partial<ProjectDraft>) =>
    setReviews((rs) => rs.map((r) => (r.key === key ? { ...r, draft: { ...r.draft, ...p } } : r)));

  const createAll = async () => {
    const chosen = pendingReviews(reviews);
    setCreating(true);
    setView('done');
    // A working copy of the lists, so a client added for one project is reused by the next.
    const working = { clients: [...lists.clients], categories: [...lists.categories], tags: [...lists.tags] };
    let made = 0;
    for (const r of chosen) {
      const deck = jobs.find((j) => j.deck?.id === r.deckId)?.deck;
      if (!deck) continue;
      const assets = r.picked.map((id) => deck.assets.find((a) => a.id === id)).filter(Boolean) as DeckAsset[];
      const d = { ...r.draft, cover_asset_id: r.picked.includes(r.draft.cover_asset_id) ? r.draft.cover_asset_id : '' };
      patch(r.key, { outcome: { state: 'creating', label: 'Starting', value: 0 } });
      try {
        const { id, skipped } = await createFromDraft(sb, working, d, assets, r.links, (p) => patch(r.key, { outcome: { state: 'creating', ...p } }));
        patch(r.key, { outcome: { state: 'done', id, skipped } });
        made++;
      } catch (e) {
        patch(r.key, { outcome: { state: 'failed', message: (e as Error).message } });
      }
    }
    await refreshLists();
    setCreating(false);
    if (made) setCreatedAt(Date.now());
    if (made && !openRef.current) {
      toast({ tone: 'success', title: `Created ${made} draft project${made === 1 ? '' : 's'}`, action: { label: 'View', onClick: () => show('done') } });
    }
  };

  const reset = useCallback(() => {
    autoDraft.current = false;
    setJobs([]);
    setReviews([]);
    setView('add');
  }, []);

  const show = (v?: ImportView) => {
    if (v) setView(v);
    setOpen(true);
  };

  const hide = () => {
    setOpen(false);
    if (jobs.some(isBusy)) {
      toast({ tone: 'neutral', title: 'Drafting in the background', message: 'We’ll let you know when the drafts are ready.' });
    }
    // A finished import starts fresh next time.
    if (view === 'done' && !creating) reset();
  };

  // Closing or reloading the tab stops drafting and drops unsaved drafts: ask first.
  const unsaved = creating || jobs.some(isBusy) || pendingReviews(reviews).length > 0;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const value: ImportCtx = {
    open,
    view,
    jobs,
    reviews,
    creating,
    createdAt,
    show,
    hide,
    setView,
    read,
    remove,
    draftAll,
    retry,
    patch,
    patchDraft,
    createAll,
    reset,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <ImportOverlay />
    </Ctx.Provider>
  );
}
