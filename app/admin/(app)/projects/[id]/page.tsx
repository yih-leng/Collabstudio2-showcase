'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BackButton,
  Button,
  Card,
  CardHeader,
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
  ImagesSquare,
  Info,
  ListChecks,
  Plus,
  Rows,
  Sparkle,
  TextAa,
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
import type { ListItemRow, Media, OverviewBlock, Project, ProjectStatus, Visibility } from '@/lib/types';

// Brief and challenge live in About this project; these are the usual Overview blocks.
const BLOCK_SUGGESTIONS = ['Big idea', 'Story / Concept', 'Audience', 'Look and cast', 'Versions', 'Timeline'];

type Block = { id: string; label: string; body: string };
type Errors = Partial<Record<'title' | 'slug' | 'year' | 'type', string>>;

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { sb, lists } = useAdmin();
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [missing, setMissing] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [deliverables, setDeliverables] = useState<TextItem[]>([]);
  const [workflow, setWorkflow] = useState<TextItem[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [slugTouched, setSlugTouched] = useState(true);
  const original = useRef<{ blocks: string[]; items: string[]; featured: boolean }>({ blocks: [], items: [], featured: false });

  const load = useCallback(async () => {
    const { data } = await sb.from('projects').select('*').eq('id', id).maybeSingle();
    if (!data) {
      setMissing(true);
      return;
    }
    const [b, i, m] = await Promise.all([
      sb.from('overview_blocks').select('*').eq('project_id', id).order('sort_order'),
      sb.from('list_items').select('*').eq('project_id', id).order('sort_order'),
      sb.from('media').select('*').eq('project_id', id).order('sort_order'),
    ]);
    const items = (i.data ?? []) as ListItemRow[];
    setProject(data as Project);
    setSlugTouched(!(data as Project).slug.startsWith('untitled-'));
    setBlocks(((b.data ?? []) as OverviewBlock[]).map(({ id, label, body }) => ({ id, label, body })));
    setDeliverables(items.filter((x) => x.type === 'deliverable').map(({ id, text }) => ({ id, text })));
    setWorkflow(items.filter((x) => x.type === 'ai_workflow').map(({ id, text }) => ({ id, text })));
    setMedia((m.data ?? []) as Media[]);
    original.current = { blocks: (b.data ?? []).map((x) => x.id), items: items.map((x) => x.id), featured: (data as Project).featured };
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
    return e;
  };

  // `overrides` lets Save draft and Publish set the visibility as they save.
  const save = async (overrides: Partial<Project> = {}): Promise<boolean> => {
    const q = { ...p, ...overrides };
    const e = validate(q);
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`field-${Object.keys(e)[0]}`)?.focus();
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
          about: q.about?.trim() || null,
          output_summary: q.output_summary?.trim() || null,
          capabilities_summary: q.capabilities_summary?.trim() || null,
          workflow_label: q.workflow_label?.trim() || null,
          featured: q.featured,
          visibility: q.visibility,
          is_internal: q.is_internal,
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

      // Overview blocks and list items: write the current set, drop the removed ones.
      const keptBlocks = blocks.filter((b) => b.label.trim() || b.body.trim());
      const blockRows = keptBlocks.map((b, i) => ({ id: b.id, project_id: q.id, label: b.label.trim() || 'Untitled', body: b.body.trim(), sort_order: i }));
      const itemRows = [
        ...deliverables.filter((d) => d.text.trim()).map((d, i) => ({ id: d.id, project_id: q.id, type: 'deliverable', text: d.text.trim(), sort_order: i })),
        ...workflow.filter((d) => d.text.trim()).map((d, i) => ({ id: d.id, project_id: q.id, type: 'ai_workflow', text: d.text.trim(), sort_order: i })),
      ];
      const goneBlocks = original.current.blocks.filter((x) => !blockRows.some((b) => b.id === x));
      const goneItems = original.current.items.filter((x) => !itemRows.some((b) => b.id === x));

      const results = await Promise.all([
        blockRows.length ? sb.from('overview_blocks').upsert(blockRows) : Promise.resolve({ error: null }),
        itemRows.length ? sb.from('list_items').upsert(itemRows) : Promise.resolve({ error: null }),
        goneBlocks.length ? sb.from('overview_blocks').delete().in('id', goneBlocks) : Promise.resolve({ error: null }),
        goneItems.length ? sb.from('list_items').delete().in('id', goneItems) : Promise.resolve({ error: null }),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      original.current = { blocks: blockRows.map((b) => b.id), items: itemRows.map((x) => x.id), featured: q.featured };
      setBlocks(keptBlocks);
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

  const addBlock = (label = '') => {
    const nid = newId();
    setBlocks((b) => [...b, { id: nid, label, body: '' }]);
    setDirty(true);
    requestAnimationFrame(() => document.getElementById(`block-${nid}-${label ? 'body' : 'label'}`)?.focus());
  };
  const updateBlock = (bid: string, values: Partial<Block>) => {
    setBlocks((b) => b.map((x) => (x.id === bid ? { ...x, ...values } : x)));
    setDirty(true);
  };
  const unusedSuggestions = BLOCK_SUGGESTIONS.filter((s) => !blocks.some((b) => b.label.trim().toLowerCase() === s.toLowerCase()));

  const primaryLabel = p.visibility === 'published' ? 'Save changes' : 'Publish';
  const cover = media.find((m) => m.id === p.cover_media_id) ?? null;
  const sectionLinks = [
    ['sec-basics', '1 · Basics'],
    ['sec-media', '2 · Hero and gallery'],
    ['sec-about', '3 · About this project'],
    ['sec-output', '4 · Output'],
    ['sec-overview', '5 · Overview'],
    ['sec-capabilities', '6 · Capabilities'],
  ];

  return (
    <AdminShell
      width="full"
      header={
        <>
          <BackButton label="Projects" href="/admin" />
          <PageHeader
            title={p.title || 'Untitled project'}
            subtitle={dirty ? 'You have unsaved changes.' : `${VISIBILITY_LABEL[p.visibility]}${p.is_internal ? ' · Internal' : ''}${p.featured ? ' · Featured' : ''}`}
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
          publishing, details and a card preview on the right, always in view. */}
      <div className={styles.editor}>
        <div className={styles.editorMain}>
          <Card id="sec-basics">
            <CardHeader icon={TextAa} element="fire" title="1 · Basics" subtitle="What it's called and the line on its card" headingLevel={2} />
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

            <Card id="sec-media">
              <CardHeader
                icon={ImagesSquare}
                element="fire"
                title="2 · Hero and gallery"
                subtitle="Saves as you go. The hero (a video if you have one) opens the project page; everything else fills the Gallery."
                headingLevel={2}
              />
              <MediaManager
                projectId={p.id}
                media={media}
                setMedia={setMedia}
                coverId={p.cover_media_id}
                heroId={p.hero_media_id}
                setCoverHero={setCoverHero}
              />
            </Card>

            <Card id="sec-about">
              <CardHeader icon={Info} element="fire" title="3 · About this project" subtitle="The brief and the challenge, in a short paragraph" headingLevel={2} />
              <div className={styles.cardBody}>
                <Textarea
                  label="About this project"
                  hideLabel
                  rows={4}
                  maxLength={600}
                  showCount
                  placeholder="What the client asked for, and what made it hard"
                  value={p.about ?? ''}
                  onChange={(e) => set('about', e.target.value)}
                />
              </div>
            </Card>

            <Card id="sec-output">
              <CardHeader icon={ListChecks} element="fire" title="4 · Output" subtitle="What we delivered" headingLevel={2} />
              <div className={styles.cardBody}>
                <Textarea label="Summary" helper="What was made, in one line" rows={2} value={p.output_summary ?? ''} onChange={(e) => set('output_summary', e.target.value)} />
              </div>
              <TextListEditor items={deliverables} onChange={dirtyWrap(setDeliverables)} itemLabel="Deliverable" addLabel="Add deliverable" placeholder="e.g. 30s film in 16:9 and 9:16" />
            </Card>

            <Card id="sec-overview">
              <CardHeader icon={Rows} element="fire" title="5 · Overview" subtitle="The thinking behind the work: add, rename, reorder or remove blocks" headingLevel={2} />
              <div className={styles.cardBody}>
                {blocks.length > 0 && (
                  <SortableList
                    items={blocks}
                    onReorder={dirtyWrap(setBlocks)}
                    label={(b) => b.label || 'block'}
                    renderItem={(b, i) => (
                      <div className={styles.stackSm}>
                        <div className={styles.row}>
                          <InputField id={`block-${b.id}-label`} label={`Block ${i + 1} label`} size="sm" value={b.label} onChange={(e) => updateBlock(b.id, { label: e.target.value })} />
                          <span className={styles.fit}>
                            <Button
                              variant="ghost"
                              iconOnly
                              icon={X}
                              aria-label={`Remove ${b.label || `block ${i + 1}`}`}
                              onClick={() => {
                                setBlocks((all) => all.filter((x) => x.id !== b.id));
                                setDirty(true);
                              }}
                            />
                          </span>
                        </div>
                        <Textarea id={`block-${b.id}-body`} label={`${b.label || `Block ${i + 1}`} text`} hideLabel rows={3} value={b.body} onChange={(e) => updateBlock(b.id, { body: e.target.value })} />
                      </div>
                    )}
                  />
                )}
                <div className={styles.actions}>
                  <Button variant="secondary" size="sm" leadingIcon={Plus} onClick={() => addBlock()}>
                    Add block
                  </Button>
                  {unusedSuggestions.map((s) => (
                    <Button key={s} variant="ghost" size="sm" leadingIcon={Plus} onClick={() => addBlock(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            <Card id="sec-capabilities">
              <CardHeader icon={Sparkle} element="fire" title="6 · Capabilities" subtitle="The type of work, and how AI made it" headingLevel={2} />
              <div className={styles.cardBody}>
                <Textarea
                  label="Capabilities shown"
                  helper="One line on what this project proves we can do"
                  rows={2}
                  value={p.capabilities_summary ?? ''}
                  onChange={(e) => set('capabilities_summary', e.target.value)}
                />
                <TagPicker
                  label="Capability tags"
                  options={lists.tags.filter((t) => t.type === 'capability')}
                  value={capabilityIds}
                  onChange={(v) => set('tag_ids', [...v, ...toolIds])}
                  create={{ table: 'tags', type: 'capability', noun: 'capability' }}
                />
                <InputField
                  label="Steps title"
                  helper='Leave empty for "How AI was used"'
                  placeholder="How AI was used"
                  value={p.workflow_label ?? ''}
                  onChange={(e) => set('workflow_label', e.target.value)}
                />
                <TextListEditor items={workflow} onChange={dirtyWrap(setWorkflow)} itemLabel="Step" addLabel="Add step" placeholder="e.g. Persona sheets set the look of the talent" />
                <TagPicker
                  label="Tools used"
                  options={lists.tags.filter((t) => t.type === 'tool')}
                  value={toolIds}
                  onChange={(v) => set('tag_ids', [...capabilityIds, ...v])}
                  create={{ table: 'tags', type: 'tool', noun: 'tool' }}
                />
              </div>
            </Card>
        </div>

        <aside className={styles.editorAside}>
          <Card>
            <CardHeader icon={Eye} element="fire" title="Publishing" subtitle="Who sees it, and where" headingLevel={2} />
            <div className={styles.cardBody}>
            <Dropdown
              label="Visibility"
              helper="Published shows on the site. Draft and Hidden only show to admins (Preview)."
              options={(['published', 'draft', 'hidden'] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))}
              value={p.visibility}
              onValueChange={(v) => set('visibility', v as Visibility)}
            />
            <Switch label="Featured" description="Show it in the home page banner" checked={p.featured} onChange={(e) => set('featured', e.target.checked)} />
            <Switch
              label="Internal or confidential"
              description="Only signed-in team members can see it, even when published"
              checked={p.is_internal}
              onChange={(e) => set('is_internal', e.target.checked)}
            />
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

          <Card>
            <CardHeader icon={Info} element="fire" title="Details" subtitle="Client, type, year and status" headingLevel={2} />
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

          <Card>
            <CardHeader icon={ImagesSquare} element="fire" title="Card preview" subtitle="How it shows on Our Works" headingLevel={2} />
            <div className={styles.cardBody}>
              <MediaFrame media={cover} aspect="16:9" mode="thumb" placeholderLabel="Pick a cover under Hero and gallery" />
              <div>
                <p className={styles.previewTitle}>{p.title || 'Untitled project'}</p>
                <p className={styles.muted}>{p.one_liner || 'Add a one-liner under Basics'}</p>
              </div>
            </div>
          </Card>

          <nav aria-label="Sections of this project" className={styles.jump}>
            {sectionLinks.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {label}
              </a>
            ))}
          </nav>
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
