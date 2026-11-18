'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BackButton,
  Button,
  Card,
  CardTitle,
  Dropdown,
  EmptyState,
  InputField,
  Modal,
  PageHeader,
  Switch,
  Textarea,
  useToast,
} from '@collabrium/ui';
import {
  Eye,
  FilmSlate,
  Plus,
  Trash,
  X,
} from '@phosphor-icons/react';
import { useAdmin } from '@/components/admin/AdminContext';
import { AdminShell } from '@/components/admin/AdminShell';
import { MediaManager } from '@/components/admin/MediaManager';
import { MediaFrame } from '@/components/MediaFrame';
import { SortableList } from '@/components/admin/SortableList';
import { TagPicker } from '@/components/admin/TagPicker';
import { TextListEditor, type TextItem } from '@/components/admin/TextListEditor';
import styles from '@/components/admin/admin.module.css';
import { newId } from '@/lib/admin-api';
import { STATUS_LABEL, VISIBILITY_LABEL, slugify } from '@/lib/format';
import { CUSTOM, TOUCHPOINTS, TOUCHPOINT_KINDS, isTouchpointKind, touchpointLabel, type AnyTouchpointKind } from '@/lib/touchpoints';
import type { AiTouchpoint, ListItemRow, Media, Project, ProjectStatus, ResultFigure, Visibility } from '@/lib/types';

type Touch = { id: string; kind: AnyTouchpointKind; label: string; body: string };
type Figure = { id: string; value: string; label: string };
type Errors = Partial<Record<'title' | 'slug' | 'year' | 'type' | 'touchpoints', string>>;

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { sb, lists } = useAdmin();
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [missing, setMissing] = useState(false);
  const [touchpoints, setTouchpoints] = useState<Touch[]>([]);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [deliverables, setDeliverables] = useState<TextItem[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [slugTouched, setSlugTouched] = useState(true);
  // What's saved now, so a save can drop the rows that were removed. The older parts
  // (Overview blocks, AI workflow steps) are no longer edited here and are left alone.
  const original = useRef<{ touchpoints: string[]; figures: string[]; deliverables: string[]; featured: boolean }>({
    touchpoints: [],
    figures: [],
    deliverables: [],
    featured: false,
  });

  const load = useCallback(async () => {
    const { data } = await sb.from('projects').select('*').eq('id', id).maybeSingle();
    if (!data) {
      setMissing(true);
      return;
    }
    const [t, f, i, m] = await Promise.all([
      sb.from('ai_touchpoints').select('*').eq('project_id', id).order('sort_order'),
      sb.from('result_figures').select('*').eq('project_id', id).order('sort_order'),
      sb.from('list_items').select('*').eq('project_id', id).eq('type', 'deliverable').order('sort_order'),
      sb.from('media').select('*').eq('project_id', id).order('sort_order'),
    ]);
    const items = (i.data ?? []) as ListItemRow[];
    setProject(data as Project);
    setSlugTouched(!(data as Project).slug.startsWith('untitled-'));
    const tps = (t.data ?? []) as AiTouchpoint[];
    const figs = (f.data ?? []) as ResultFigure[];
    setTouchpoints(tps.map(({ id, kind, label, body }) => ({ id, kind, label: label ?? '', body })));
    setFigures(figs.map(({ id, value, label }) => ({ id, value, label })));
    setDeliverables(items.map(({ id, text }) => ({ id, text })));
    setMedia((m.data ?? []) as Media[]);
    original.current = {
      touchpoints: tps.map((x) => x.id),
      figures: figs.map((x) => x.id),
      deliverables: items.map((x) => x.id),
      featured: (data as Project).featured,
    };
    setDirty(false);
  }, [sb, id]);

  useEffect(() => {
    load();
  }, [load]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (missing) {
    return (
      <AdminShell header={<PageHeader title="Project not found" />}>
        <EmptyState variant="section" icon={FilmSlate} heading="This project isn't here" primaryAction={{ label: 'Back to projects', onClick: () => router.push('/admin') }}>
          It may have been deleted for good. Check Trash for anything moved there.
        </EmptyState>
      </AdminShell>
    );
  }
  if (!project) {
    return (
      <AdminShell header={<PageHeader title="Loading project…" />}>
        <span aria-busy="true" />
      </AdminShell>
    );
  }

  const p = project;
  const set = <K extends keyof Project>(key: K, value: Project[K]) => {
    setProject((cur) => (cur ? { ...cur, [key]: value } : cur));
    setDirty(true);
    if (errors[key as keyof Errors]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const dirtyWrap = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const setTitle = (title: string) => {
    set('title', title);
    if (!slugTouched) setProject((cur) => (cur ? { ...cur, title, slug: slugify(title) || cur.slug } : cur));
  };

  const capabilityIds = p.tag_ids.filter((t) => lists.tags.find((x) => x.id === t)?.type === 'capability');
  const toolIds = p.tag_ids.filter((t) => lists.tags.find((x) => x.id === t)?.type === 'tool');

  const setCoverHero = async (values: { cover_media_id?: string | null; hero_media_id?: string | null }) => {
    setProject((cur) => (cur ? { ...cur, ...values } : cur));
    const { error } = await sb.from('projects').update(values).eq('id', p.id);
    if (error) toast({ tone: 'danger', title: "That change didn't save", message: error.message });
  };

  const validate = (p: Project): Errors => {
    const e: Errors = {};
    if (!p.title.trim()) e.title = 'Give the project a title';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) e.slug = 'Use lowercase letters, numbers and dashes, like skechers-merch-film';
    if (p.year !== null && (p.year < 1990 || p.year > 2100)) e.year = 'Enter a year like 2026';
    if (!p.category_ids.length) e.type = 'Pick the type of project';
    if (touchpoints.some((t) => t.kind === CUSTOM && !t.label.trim())) e.touchpoints = 'Name your touchpoint';
    return e;
  };

  // `overrides` lets Save draft and Publish set the visibility as they save.
  const save = async (overrides: Partial<Project> = {}): Promise<boolean> => {
    const q = { ...p, ...overrides };
    const e = validate(q);
    setErrors(e);
    if (Object.keys(e).length) {
      const unnamed = touchpoints.find((t) => t.kind === CUSTOM && !t.label.trim());
      document.getElementById(Object.keys(e)[0] === 'touchpoints' && unnamed ? `touch-${unnamed.id}-label` : `field-${Object.keys(e)[0]}`)?.focus();
      if (e.type && Object.keys(e).length === 1) toast({ tone: 'danger', title: 'Pick a project type', message: 'Every project needs one, under Basics.' });
      return false;
    }
    setSaving(true);
    try {
      // Newly featured projects join the end of the home page's featured row.
      let featuredOrder: { featured_order?: number } = {};
      if (q.featured && !original.current.featured) {
        const { data: last } = await sb
          .from('projects')
          .select('featured_order')
          .eq('featured', true)
          .order('featured_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        featuredOrder = { featured_order: (last?.featured_order ?? -1) + 1 };
      }
      const { error } = await sb
        .from('projects')
        .update({
          title: q.title.trim(),
          slug: q.slug,
          client_ids: q.client_ids,
          category_ids: q.category_ids,
          tag_ids: q.tag_ids,
          year: q.year,
          status: q.status,
          status_note: q.status_note?.trim() || null,
          one_liner: q.one_liner?.trim() || null,
          summary: q.summary?.trim() || null,
          objective: q.objective?.trim() || null,
          concept: q.concept?.trim() || null,
          output_summary: q.output_summary?.trim() || null,
          turnaround: q.turnaround?.trim() || null,
          featured: q.featured,
          visibility: q.visibility,
          ...featuredOrder,
        })
        .eq('id', q.id);
      if (error) {
        if (error.code === '23505') {
          setErrors({ slug: 'Another project already uses this web address' });
          document.getElementById('field-slug')?.focus();
          return false;
        }
        throw error;
      }

      // Touchpoints, key figures and deliverables: write the current set, drop the removed ones.
      const touchRows = touchpoints.map((t, i) => ({
        id: t.id,
        project_id: q.id,
        kind: t.kind,
        label: t.kind === CUSTOM ? t.label.trim() : null,
        body: t.body.trim(),
        sort_order: i,
      }));
      const keptFigures = figures.filter((f) => f.value.trim());
      const figureRows = keptFigures.map((f, i) => ({ id: f.id, project_id: q.id, value: f.value.trim(), label: f.label.trim(), sort_order: i }));
      const itemRows = deliverables
        .filter((d) => d.text.trim())
        .map((d, i) => ({ id: d.id, project_id: q.id, type: 'deliverable', text: d.text.trim(), sort_order: i }));
      const gone = (was: string[], now: { id: string }[]) => was.filter((x) => !now.some((r) => r.id === x));
      const goneTouch = gone(original.current.touchpoints, touchRows);
      const goneFigures = gone(original.current.figures, figureRows);
      const goneItems = gone(original.current.deliverables, itemRows);
      const none = Promise.resolve({ error: null });

      const results = await Promise.all([
        touchRows.length ? sb.from('ai_touchpoints').upsert(touchRows) : none,
        figureRows.length ? sb.from('result_figures').upsert(figureRows) : none,
        itemRows.length ? sb.from('list_items').upsert(itemRows) : none,
        goneTouch.length ? sb.from('ai_touchpoints').delete().in('id', goneTouch) : none,
        goneFigures.length ? sb.from('result_figures').delete().in('id', goneFigures) : none,
        goneItems.length ? sb.from('list_items').delete().in('id', goneItems) : none,
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      original.current = {
        touchpoints: touchRows.map((x) => x.id),
        figures: figureRows.map((x) => x.id),
        deliverables: itemRows.map((x) => x.id),
        featured: q.featured,
      };
      setFigures(keptFigures);
      setProject(q);
      setDirty(false);
      toast({ tone: 'success', title: 'Saved', message: q.visibility === 'published' ? 'Your changes are live.' : `Saved as ${VISIBILITY_LABEL[q.visibility].toLowerCase()}.` });
      return true;
    } catch (err) {
      toast({ tone: 'danger', title: "That didn't save", message: (err as Error).message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
    // Open the tab first so pop-up blockers allow it, then save and point it at the page.
    const tab = window.open('about:blank', '_blank');
    const ok = !dirty || (await save());
    if (tab) {
      if (ok) tab.location.href = `/work/${p.slug}`;
      else tab.close();
    }
  };

  const moveToTrash = async () => {
    setConfirmTrash(false);
    const { error } = await sb.from('projects').update({ deleted_at: new Date().toISOString(), featured: false }).eq('id', p.id);
    if (error) {
      toast({ tone: 'danger', title: "That didn't move to Trash", message: error.message });
      return;
    }
    setDirty(false);
    toast({ tone: 'success', title: 'Moved to Trash', message: p.title });
    router.push('/admin');
  };

  const unusedKinds = TOUCHPOINT_KINDS.filter((k) => !touchpoints.some((t) => t.kind === k));
  const addTouchpoint = () => {
    const nid = newId();
    setTouchpoints((ts) => [...ts, { id: nid, kind: unusedKinds[0] ?? CUSTOM, label: '', body: '' }]);
    setDirty(true);
    requestAnimationFrame(() => document.getElementById(`touch-${nid}-body`)?.focus());
  };
  const updateTouchpoint = (tid: string, values: Partial<Touch>) => {
    setTouchpoints((ts) => ts.map((x) => (x.id === tid ? { ...x, ...values } : x)));
    setDirty(true);
    if (errors.touchpoints) setErrors((er) => ({ ...er, touchpoints: undefined }));
  };
  const addFigure = () => {
    const nid = newId();
    setFigures((fs) => [...fs, { id: nid, value: '', label: '' }]);
    setDirty(true);
    requestAnimationFrame(() => document.getElementById(`figure-${nid}-value`)?.focus());
  };
  const updateFigure = (fid: string, values: Partial<Figure>) => {
    setFigures((fs) => fs.map((x) => (x.id === fid ? { ...x, ...values } : x)));
    setDirty(true);
  };

  const primaryLabel = p.visibility === 'published' ? 'Save changes' : 'Publish';
  const cover = media.find((m) => m.id === p.cover_media_id) ?? null;

  return (
    <AdminShell
      width="full"
      header={
        <>
          <BackButton label="Projects" href="/admin" />
          <PageHeader
            title={p.title || 'Untitled project'}
            subtitle={dirty ? 'You have unsaved changes.' : `${VISIBILITY_LABEL[p.visibility]}${p.featured ? ' · Featured' : ''}`}
            actions={
              <>
                <Button variant="ghost" onClick={() => (dirty ? setConfirmCancel(true) : router.push('/admin'))}>
                  Cancel
                </Button>
                <Button variant="secondary" disabled={saving} onClick={() => save({ visibility: 'draft' })}>
                  Save draft
                </Button>
                <Button variant="primary" loading={saving} onClick={() => save(p.visibility === 'published' ? {} : { visibility: 'published' })}>
                  {primaryLabel}
                </Button>
              </>
            }
          />
        </>
      }
    >
      {/* Two columns: the page's content on the left, in the order it shows on the site;
          project settings on the right (card preview and publishing, in one card). */}
      <div className={styles.editor}>
        <div className={styles.editorMain}>
          <section id="sec-basics" className={styles.editorSection} aria-labelledby="sec-basics-h">
            <header className={styles.editorSectionHead}>
              <h2 id="sec-basics-h" className={styles.editorSectionTitle}>
                <span className={styles.editorSectionNum}>1</span>
                Basics
              </h2>
              <p className={styles.muted}>What it&apos;s called and the line on its card</p>
            </header>
            <Card>
              <div className={styles.cardBody}>
                <InputField id="field-title" label="Title" required value={p.title} error={errors.title} onChange={(e) => setTitle(e.target.value)} />

                <InputField
                  label="One-liner"
                  helper="Shown on the project card and under the project title"
                  maxLength={140}
                  showCount
                  value={p.one_liner ?? ''}
                  onChange={(e) => set('one_liner', e.target.value)}
                />

                <InputField
                  id="field-slug"
                  label="Web address"
                  required
                  value={p.slug}
                  error={errors.slug}
                  helper={`The page lives at /work/${p.slug || '…'}. Changing it breaks links people already have.`}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }}
                />

              </div>
            </Card>
          </section>

          <section id="sec-client" className={styles.editorSection} aria-labelledby="sec-client-h">
            <header className={styles.editorSectionHead}>
              <h2 id="sec-client-h" className={styles.editorSectionTitle}>
                <span className={styles.editorSectionNum}>2</span>
                Client details
              </h2>
              <p className={styles.muted}>Who it was for, what kind of work, and where it stands</p>
            </header>
            <Card>
            <div className={styles.cardBody}>
              <TagPicker label="Clients" options={lists.clients} value={p.client_ids} onChange={(v) => set('client_ids', v)} create={{ table: 'clients', noun: 'client' }} />

              <TagPicker
                id="field-type"
                label="Project type"
                multiple={false}
                required
                error={errors.type}
                options={lists.categories}
                value={p.category_ids.slice(0, 1)}
                onChange={(v) => {
                  set('category_ids', v);
                  setErrors((e) => ({ ...e, type: undefined }));
                }}
                create={{ table: 'categories', noun: 'project type' }}
              />

              <div className={styles.grid2}>
                <InputField
                  id="field-year"
                  label="Year"
                  type="number"
                  inputMode="numeric"
                  value={p.year ?? ''}
                  error={errors.year}
                  onChange={(e) => set('year', e.target.value ? Number(e.target.value) : null)}
                />

                <Dropdown
                  label="Status"
                  options={(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                  value={p.status}
                  onValueChange={(v) => set('status', v as ProjectStatus)}
                />

              </div>
              <InputField
                label="Status note"
                helper='Optional, e.g. "Episode 1"'
                value={p.status_note ?? ''}
                onChange={(e) => set('status_note', e.target.value)}
              />

            </div>
            </Card>
          </section>

          <section id="sec-media" className={styles.editorSection} aria-labelledby="sec-media-h">
            <header className={styles.editorSectionHead}>
              <h2 id="sec-media-h" className={styles.editorSectionTitle}>
                <span className={styles.editorSectionNum}>3</span>
                Hero and gallery
              </h2>
              <p className={styles.muted}>Saves as you go. The hero (a video if you have one) opens the project page; everything else fills the Gallery.</p>
            </header>
            <Card>
              <MediaManager
                projectId={p.id}
                media={media}
                setMedia={setMedia}
                coverId={p.cover_media_id}
                heroId={p.hero_media_id}
                setCoverHero={setCoverHero}
              />
            </Card>
          </section>

          <section id="sec-about" className={styles.editorSection} aria-labelledby="sec-about-h">
            <header className={styles.editorSectionHead}>
              <h2 id="sec-about-h" className={styles.editorSectionTitle}>
                <span className={styles.editorSectionNum}>4</span>
                About this project
              </h2>
              <p className={styles.muted}>What it is, what the client needed, and the idea</p>
            </header>
            <Card>
              <div className={styles.cardBody}>
                <Textarea
                  label="Summary"
                  helper="What the project is, in a sentence or two"
                  rows={2}
                  maxLength={300}
                  showCount
                  value={p.summary ?? ''}
                  onChange={(e) => set('summary', e.target.value)}
                />
                <Textarea
                  label="The objective"
                  helper="The client's objective or production bottleneck, in 1–2 sentences"
                  rows={3}
                  maxLength={400}
                  showCount
                  value={p.objective ?? ''}
                  onChange={(e) => set('objective', e.target.value)}
                />
                <Textarea
                  label="The concept"
                  helper="The creative idea, visual style and narrative, in 2–3 sentences"
                  rows={4}
                  maxLength={600}
                  showCount
                  value={p.concept ?? ''}
                  onChange={(e) => set('concept', e.target.value)}
                />
              </div>
            </Card>
          </section>

          <section id="sec-ai" className={styles.editorSection} aria-labelledby="sec-ai-h">
            <header className={styles.editorSectionHead}>
              <h2 id="sec-ai-h" className={styles.editorSectionTitle}>
                <span className={styles.editorSectionNum}>5</span>
                AI touchpoints
              </h2>
              <p className={styles.muted}>How AI made the output. Pick 3 or 4 and say what each did on this project.</p>
            </header>
            <Card>
              <div className={styles.cardBody}>
                {touchpoints.length > 0 && (
                  <SortableList
                    items={touchpoints}
                    onReorder={dirtyWrap(setTouchpoints)}
                    label={(t) => touchpointLabel(t) || 'touchpoint'}
                    renderItem={(t, i) => (
                      <div className={styles.stackSm}>
                        <div className={styles.row}>
                          <Dropdown
                            label={`Touchpoint ${i + 1}`}
                            helper={isTouchpointKind(t.kind) ? TOUCHPOINTS[t.kind].description : 'Your own touchpoint: name it below.'}
                            options={[
                              ...TOUCHPOINT_KINDS.filter((k) => k === t.kind || !touchpoints.some((x) => x.kind === k)).map((k) => ({
                                value: k,
                                label: TOUCHPOINTS[k].label,
                              })),
                              { value: CUSTOM, label: 'Your own…' },
                            ]}
                            value={t.kind}
                            onValueChange={(v) => updateTouchpoint(t.id, { kind: v as AnyTouchpointKind })}
                          />
                          <span className={styles.fit}>
                            <Button
                              variant="ghost"
                              iconOnly
                              icon={X}
                              aria-label={`Remove ${touchpointLabel(t) || `touchpoint ${i + 1}`}`}
                              onClick={() => {
                                setTouchpoints((all) => all.filter((x) => x.id !== t.id));
                                setDirty(true);
                              }}
                            />
                          </span>
                        </div>
                        {t.kind === CUSTOM && (
                          <InputField
                            id={`touch-${t.id}-label`}
                            label="Touchpoint name"
                            required
                            size="sm"
                            maxLength={60}
                            placeholder="e.g. Motion capture"
                            error={errors.touchpoints && !t.label.trim() ? errors.touchpoints : undefined}
                            value={t.label}
                            onChange={(e) => updateTouchpoint(t.id, { label: e.target.value })}
                          />
                        )}
                        <Textarea
                          id={`touch-${t.id}-body`}
                          label={`What ${(touchpointLabel(t) || 'this touchpoint').toLowerCase()} did on this project`}
                          hideLabel
                          rows={2}
                          maxLength={240}
                          placeholder="e.g. 3 AI heroes in a dense orange-sky metropolis, with two city looks explored."
                          value={t.body}
                          onChange={(e) => updateTouchpoint(t.id, { body: e.target.value })}
                        />
                      </div>
                    )}
                  />
                )}
                <div className={styles.actions}>
                  <Button variant="secondary" size="sm" leadingIcon={Plus} onClick={addTouchpoint}>
                    Add touchpoint
                  </Button>
                  {touchpoints.length > 4 && <span className={styles.muted}>Most projects read best with 3 or 4.</span>}
                </div>
                <TagPicker
                  label="Capability tags"
                  helper="Not shown on the project page; used to filter Our Works"
                  options={lists.tags.filter((t) => t.type === 'capability')}
                  value={capabilityIds}
                  onChange={(v) => set('tag_ids', [...v, ...toolIds])}
                  create={{ table: 'tags', type: 'capability', noun: 'capability' }}
                />
              </div>
            </Card>
          </section>

          <section id="sec-output" className={styles.editorSection} aria-labelledby="sec-output-h">
            <header className={styles.editorSectionHead}>
              <h2 id="sec-output-h" className={styles.editorSectionTitle}>
                <span className={styles.editorSectionNum}>6</span>
                Output
              </h2>
              <p className={styles.muted}>What we delivered</p>
            </header>
            <Card>
              <div className={styles.cardBody}>
                <Textarea label="Summary" helper="What was made, in one line" rows={2} value={p.output_summary ?? ''} onChange={(e) => set('output_summary', e.target.value)} />
              </div>
              <TextListEditor items={deliverables} onChange={dirtyWrap(setDeliverables)} itemLabel="Deliverable" addLabel="Add deliverable" placeholder="e.g. 30s film in 16:9 and 9:16" />
            </Card>
          </section>

          <section id="sec-result" className={styles.editorSection} aria-labelledby="sec-result-h">
            <header className={styles.editorSectionHead}>
              <h2 id="sec-result-h" className={styles.editorSectionTitle}>
                <span className={styles.editorSectionNum}>7</span>
                Turnaround / result
              </h2>
              <p className={styles.muted}>How fast it was made, and any results. Add key figures when you have them.</p>
            </header>
            <Card>
              <div className={styles.cardBody}>
                <Textarea
                  label="Turnaround / result"
                  hideLabel
                  rows={3}
                  maxLength={400}
                  showCount
                  placeholder="e.g. Planned 13 days, storyboard lock to final approval."
                  value={p.turnaround ?? ''}
                  onChange={(e) => set('turnaround', e.target.value)}
                />
                {figures.length > 0 && (
                  <SortableList
                    items={figures}
                    onReorder={dirtyWrap(setFigures)}
                    label={(f) => f.value || 'figure'}
                    renderItem={(f, i) => (
                      <div className={styles.row}>
                        <InputField
                          id={`figure-${f.id}-value`}
                          label={`Figure ${i + 1}`}
                          placeholder="13 days"
                          size="sm"
                          value={f.value}
                          onChange={(e) => updateFigure(f.id, { value: e.target.value })}
                        />
                        <InputField
                          label="What it measures"
                          placeholder="Storyboard lock to final approval"
                          size="sm"
                          value={f.label}
                          onChange={(e) => updateFigure(f.id, { label: e.target.value })}
                        />
                        <span className={styles.fit}>
                          <Button
                            variant="ghost"
                            iconOnly
                            icon={X}
                            aria-label={`Remove ${f.value || `figure ${i + 1}`}`}
                            onClick={() => {
                              setFigures((all) => all.filter((x) => x.id !== f.id));
                              setDirty(true);
                            }}
                          />
                        </span>
                      </div>
                    )}
                  />
                )}
                <span>
                  <Button variant="secondary" size="sm" leadingIcon={Plus} onClick={addFigure}>
                    Add key figure
                  </Button>
                </span>
              </div>
            </Card>
          </section>
        </div>

        <aside className={styles.editorAside} aria-labelledby="rail-title">
          <h2 id="rail-title" className={styles.railTitle}>
            Project settings
          </h2>
          <Card>
            <CardTitle headingLevel={3}>Card preview</CardTitle>
            <p className={styles.muted}>How it shows on Our Works</p>
            <div className={styles.cardBody}>
              <MediaFrame media={cover} aspect="16:9" mode="thumb" placeholderLabel="Pick a cover under Hero and gallery" />
              <div>
                <p className={styles.previewTitle}>{p.title || 'Untitled project'}</p>
                <p className={styles.muted}>{p.one_liner || 'Add a one-liner under Basics'}</p>
              </div>
            </div>

            <div className={styles.cardDivider} role="presentation" />

            <CardTitle headingLevel={3}>Publishing</CardTitle>
            <p className={styles.muted}>Who sees it, and where</p>
            <div className={styles.cardBody}>
              <Dropdown
                label="Visibility"
                helper="Published shows on the site. Draft and Hidden (for confidential work) only show to signed-in admins."
                options={(['published', 'draft', 'hidden'] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))}
                value={p.visibility}
                onValueChange={(v) => set('visibility', v as Visibility)}
              />
              <Switch label="Featured" description="Show it in the home page banner" checked={p.featured} onChange={(e) => set('featured', e.target.checked)} />
              <div className={styles.asideActions}>
                <Button variant="secondary" size="sm" leadingIcon={Eye} onClick={preview}>
                  Preview
                </Button>
                <Button variant="ghost" size="sm" leadingIcon={Trash} onClick={() => setConfirmTrash(true)}>
                  Move to Trash
                </Button>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <Modal
        open={confirmTrash}
        onClose={() => setConfirmTrash(false)}
        title="Move this project to Trash?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmTrash(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={moveToTrash}>
              Move to Trash
            </Button>
          </>
        }
      >
        It comes off the site straight away. You can restore it from Trash at any time.
      </Modal>
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Leave without saving?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep editing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDirty(false);
                router.push('/admin');
              }}
            >
              Discard changes
            </Button>
          </>
        }
      >
        Your changes to this project haven&apos;t been saved. Discard them and go back to Projects?
      </Modal>
    </AdminShell>
  );
}
