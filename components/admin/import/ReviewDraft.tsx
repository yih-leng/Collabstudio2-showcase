'use client';

import { Button, Card, Checkbox, Dropdown, InfoBanner, InputField, Switch, Textarea } from '@collabrium/ui';
import { Check, FilmSlate, MusicNotes, Plus, Warning, X } from '@phosphor-icons/react';
import shared from '@/components/admin/admin.module.css';
import { MB } from '@/lib/admin-api';
import { STATUS_LABEL, embedProvider, slugify } from '@/lib/format';
import type { DeckAsset, NoteField, ParsedDeck, ProjectDraft } from '@/lib/import/types';
import { CUSTOM, TOUCHPOINTS, TOUCHPOINT_KINDS, isTouchpointKind, touchpointLabel, type AnyTouchpointKind } from '@/lib/touchpoints';
import type { ProjectStatus } from '@/lib/types';
import { useImport, type Review } from './ImportContext';
import styles from './import.module.css';

const commaList = (v: string[]) => v.join(', ');
const fromComma = (s: string) => s.split(/, ?/);

// One draft to check, in the same order and sections as the project editor,
// cut down to what matters before the project exists.
export function ReviewDraft({ review: r, deck }: { review: Review; deck: ParsedDeck }) {
  const { patch, patchDraft, creating } = useImport();
  const d = r.draft;
  const onDraft = (p: Partial<ProjectDraft>) => patchDraft(r.key, p);
  const onPatch = (p: Partial<Review>) => patch(r.key, p);

  const onSlides = new Set(d.slides);
  // This project's slides first; everything else in the deck is a click away.
  const mine = deck.assets.filter((a) => r.picked.includes(a.id) || (!a.decorative && a.slides.some((n) => onSlides.has(n))));
  const rest = deck.assets.filter((a) => !mine.includes(a));
  const allLinks = [...new Set([...d.video_links, ...deck.links])];
  const cover = deck.assets.find((a) => a.id === d.cover_asset_id && r.picked.includes(a.id));

  const toggle = (id: string) => onPatch({ picked: r.picked.includes(id) ? r.picked.filter((x) => x !== id) : [...r.picked, id] });
  const setCover = (id: string) => {
    onDraft({ cover_asset_id: id });
    if (!r.picked.includes(id)) onPatch({ picked: [id, ...r.picked] });
  };

  const notes = d.reviewer_notes;
  const notesFor = (...fields: NoteField[]) => notes.filter((n) => fields.includes(n.field));
  const noteList = (...fields: NoteField[]) =>
    notesFor(...fields).map((n, i) => (
      <p key={`${n.field}-${i}`} className={styles.note} data-note>
        <Warning aria-hidden weight="fill" />
        {n.note}
      </p>
    ));
  const goToNote = () => {
    const first = document.querySelector<HTMLElement>('[data-review] [data-note]');
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const slideRange = d.slides.length ? `slides ${Math.min(...d.slides)}–${Math.max(...d.slides)}` : 'the deck';
  const off = creating || !r.include;
  const moreNotes = notesFor('output', 'turnaround').length;
  const unusedKinds = TOUCHPOINT_KINDS.filter((k) => !d.touchpoints.some((t) => t.kind === k));

  return (
    <div className={styles.review} data-review>
      {notes.length > 0 && r.include && (
        <InfoBanner tone="ai" actions={[{ label: 'Show first note', onClick: goToNote }]}>
          {`Drafted by AI from ${slideRange}. Check the ${notes.length === 1 ? 'note' : `${notes.length} notes`} marked below before you create it.`}
        </InfoBanner>
      )}

      {/* Create or skip, with the card it will make. */}
      <Card>
        <div className={styles.reviewCard}>
          <div className={styles.cardThumb}>{cover?.thumb ? <img src={cover.thumb} alt="" /> : <FilmSlate aria-hidden />}</div>
          <div className={styles.cardText}>
            <span className={shared.previewTitle}>{d.title || 'Untitled project'}</span>
            <span className={shared.muted}>{d.one_liner || 'No one-liner yet'}</span>
          </div>
        </div>
        <div className={shared.cardDivider} role="presentation" />
        <Switch
          label="Create this project"
          description="Saved as a draft. Nothing goes on the site until you publish."
          checked={r.include}
          disabled={creating}
          onChange={(e) => onPatch({ include: e.target.checked })}
        />
      </Card>
      {noteList('general')}

      <fieldset disabled={off} className={styles.fieldset} data-off={!r.include || undefined}>
        <Section n={1} title="Basics">
          <InputField label="Title" required value={d.title} helper={`Web address: /work/${slugify(d.title) || '…'}`} onChange={(e) => onDraft({ title: e.target.value })} />
          {noteList('title')}
          <InputField label="One-liner" maxLength={140} showCount value={d.one_liner} onChange={(e) => onDraft({ one_liner: e.target.value })} />
          {noteList('one_liner')}
        </Section>

        <Section n={2} title="Client details">
          <InputField
            label="Clients"
            helper="Separate with commas. New names are added to Clients and tags."
            value={commaList(d.client_names)}
            onChange={(e) => onDraft({ client_names: fromComma(e.target.value) })}
          />
          {noteList('clients')}
          <div className={shared.grid2}>
            <InputField label="Project type" required value={d.type_name} onChange={(e) => onDraft({ type_name: e.target.value })} />
            <InputField label="Year" type="number" value={d.year ? String(d.year) : ''} onChange={(e) => onDraft({ year: Number(e.target.value) || 0 })} />
            <Dropdown
              label="Status"
              options={(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              value={d.status}
              onValueChange={(v) => onDraft({ status: v as ProjectStatus })}
            />
          </div>
          {noteList('type', 'year', 'status')}
        </Section>

        <Section n={3} title="Hero and gallery" hint={`${r.picked.length} chosen. Click to keep or drop; set one picture as the cover.`}>
          <AssetGrid assets={mine} picked={r.picked} cover={d.cover_asset_id} onToggle={toggle} onCover={setCover} />
          {rest.length > 0 && (
            <details className={styles.more}>
              <summary>{`More from this deck (${rest.length}), including logos and backgrounds`}</summary>
              <AssetGrid assets={rest} picked={r.picked} cover={d.cover_asset_id} onToggle={toggle} onCover={setCover} />
            </details>
          )}
          {allLinks.length > 0 && (
            <div className={styles.links}>
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
          {noteList('media')}
        </Section>

        <Section n={4} title="About this project">
          <Textarea label="Summary" rows={2} maxLength={300} showCount value={d.summary} onChange={(e) => onDraft({ summary: e.target.value })} />
          {noteList('summary')}
          <Textarea label="The objective" rows={3} maxLength={400} showCount value={d.objective} onChange={(e) => onDraft({ objective: e.target.value })} />
          {noteList('objective')}
          <Textarea label="The concept" rows={4} maxLength={600} showCount value={d.concept} onChange={(e) => onDraft({ concept: e.target.value })} />
          {noteList('concept')}
        </Section>

        <Section n={5} title="AI touchpoints" hint="How AI made the output. 3 or 4 read best.">
          {d.touchpoints.map((t, i) => (
            <div key={i} className={styles.block}>
              <div className={shared.row}>
                <Dropdown
                  label={`Touchpoint ${i + 1}`}
                  helper={isTouchpointKind(t.kind) ? TOUCHPOINTS[t.kind].description : 'Your own touchpoint: name it below.'}
                  options={[
                    ...TOUCHPOINT_KINDS.filter((k) => k === t.kind || !d.touchpoints.some((x) => x.kind === k)).map((k) => ({
                      value: k,
                      label: TOUCHPOINTS[k].label,
                    })),
                    { value: CUSTOM, label: 'Your own…' },
                  ]}
                  value={t.kind}
                  onValueChange={(v) => onDraft({ touchpoints: d.touchpoints.map((x, j) => (j === i ? { ...x, kind: v as AnyTouchpointKind } : x)) })}
                />
                <span className={shared.fit}>
                  <Button
                    variant="ghost"
                    iconOnly
                    icon={X}
                    aria-label={`Remove ${touchpointLabel(t) || `touchpoint ${i + 1}`}`}
                    onClick={() => onDraft({ touchpoints: d.touchpoints.filter((_, j) => j !== i) })}
                  />
                </span>
              </div>
              {t.kind === CUSTOM && (
                <InputField
                  label="Touchpoint name"
                  required
                  maxLength={60}
                  placeholder="e.g. Motion capture"
                  helper="A touchpoint without a name is left out."
                  value={t.label ?? ''}
                  onChange={(e) => onDraft({ touchpoints: d.touchpoints.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                />
              )}
              <Textarea
                label={`What ${(touchpointLabel(t) || 'this touchpoint').toLowerCase()} did on this project`}
                hideLabel
                rows={2}
                maxLength={240}
                value={t.body}
                onChange={(e) => onDraft({ touchpoints: d.touchpoints.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })}
              />
            </div>
          ))}
          <span>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={Plus}
              onClick={() => onDraft({ touchpoints: [...d.touchpoints, { kind: unusedKinds[0] ?? CUSTOM, label: '', body: '' }] })}
            >
              Add touchpoint
            </Button>
          </span>
          {noteList('touchpoints')}
        </Section>

        <details className={styles.more} open={moreNotes > 0 || undefined}>
          <summary>{`Output, turnaround and tags${moreNotes ? ` · ${moreNotes} to check` : ''}`}</summary>
          <p className={shared.muted}>Drafted too. Easy to fine-tune later in the editor.</p>
          <div className={shared.stackSm}>
            <Textarea label="Output summary" rows={2} value={d.output_summary} onChange={(e) => onDraft({ output_summary: e.target.value })} />
            <Textarea
              label="Deliverables"
              helper="One per line"
              rows={3}
              value={d.deliverables.join('\n')}
              onChange={(e) => onDraft({ deliverables: e.target.value.split('\n') })}
            />
            {noteList('output')}
            <Textarea label="Turnaround / result" rows={2} maxLength={400} value={d.turnaround} onChange={(e) => onDraft({ turnaround: e.target.value })} />
            {noteList('turnaround')}
            <InputField
              label="Capability tags"
              helper="Separate with commas. Used to filter Our Works."
              value={commaList(d.capability_names)}
              onChange={(e) => onDraft({ capability_names: fromComma(e.target.value) })}
            />
          </div>
        </details>
      </fieldset>
    </div>
  );
}

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={shared.editorSection}>
      <header className={shared.editorSectionHead}>
        <h3 className={styles.sectionTitle}>
          <span className={shared.editorSectionNum}>{n}</span>
          {title}
        </h3>
        {hint && <p className={shared.muted}>{hint}</p>}
      </header>
      <Card>
        <div className={shared.cardBody}>{children}</div>
      </Card>
    </section>
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
