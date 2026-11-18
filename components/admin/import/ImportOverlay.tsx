'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  FileUploader,
  InfoBanner,
  Modal,
  ProgressBar,
  Stepper,
  Tabs,
  Thinking,
  type FileUploaderItem,
  type FileUploaderRules,
  type ThinkingStep,
} from '@collabrium/ui';
import { FilePdf, FilePpt, FileText, Plus, Sparkle } from '@phosphor-icons/react';
import shared from '@/components/admin/admin.module.css';
import { MB } from '@/lib/admin-api';
import { formatUsd } from '@/lib/import/pricing';
import { isBusy, pendingReviews, useImport, type ImportView, type Job } from './ImportContext';
import { ReviewDraft } from './ReviewDraft';
import styles from './import.module.css';

const RULES: FileUploaderRules = {
  noun: 'deck',
  many: true,
  maxFiles: 10,
  // Decks are opened in this browser, not uploaded, so they can be big.
  maxBytes: 1024 * MB,
  label: 'PowerPoint (.pptx), PDF or OpenDocument (.odp)',
  sizeTip: 'Decks are read on this computer. Only the pictures you keep are uploaded.',
  types: [
    { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', icon: FilePpt },
    { ext: 'pdf', mime: 'application/pdf', icon: FilePdf },
    { ext: 'odp', mime: 'application/vnd.oasis.opendocument.presentation', icon: FileText },
  ],
};

const STEPS = [{ label: 'Add' }, { label: 'Draft' }, { label: 'Review' }, { label: 'Done' }];
const STEP_INDEX: Record<ImportView, number> = { add: 0, drafting: 1, review: 2, done: 3 };
const STAGE_PROGRESS = { reading: 0.4, estimating: 0.8, drafting: 1 } as const;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const usdRange = ([a, b]: [number, number]) => `${formatUsd(a)}–${formatUsd(b).replace('US$', '')}`;

/** The AI glow around a button. */
// TODO(design-system: Button has no AI variant; this wrapper borrows Info Banner tone "ai"'s moving pastel gradient.)
function AiGlow({ on = true, children }: { on?: boolean; children: React.ReactNode }) {
  return on ? <span className={styles.aiGlow}>{children}</span> : <>{children}</>;
}

export function ImportOverlay() {
  const im = useImport();
  const { open, view, jobs, reviews, creating } = im;

  const spent = jobs.reduce((sum, j) => sum + (j.usage?.cost ?? 0), 0);
  const spentLine = jobs.some((j) => j.usage) ? `AI cost ${formatUsd(spent)}` : '';

  let body: React.ReactNode;
  let actions: React.ReactNode;

  if (view === 'add') {
    const awaiting = jobs.filter((j) => j.stage === 'awaiting');
    const reading = jobs.filter((j) => j.stage === 'reading' || j.stage === 'estimating');
    const basicReady = jobs.some((j) => j.basic) && reviews.length > 0;
    const estimate = jobs
      .filter((j) => j.estimate && (j.stage === 'awaiting' || j.stage === 'reading' || j.stage === 'estimating'))
      .reduce<[number, number]>((s, j) => [s[0] + j.estimate!.cost[0], s[1] + j.estimate!.cost[1]], [0, 0]);
    const toDraft = awaiting.length + reading.length;
    const items: FileUploaderItem[] = jobs.map((j) =>
      j.stage === 'failed'
        ? { file: j.file, status: 'failed', message: j.message }
        : j.stage === 'reading' || j.stage === 'estimating'
          ? { file: j.file, status: 'uploading', progress: STAGE_PROGRESS[j.stage] }
          : { file: j.file, status: 'done' },
    );
    body = (
      <>
        <FileUploader
          title="Drop decks here"
          touchTitle="Add decks"
          dragTitle="Let go to read"
          buttonLabel="Choose decks"
          caption="Up to 10 at once. A long deck takes a minute to read."
          rules={RULES}
          files={items}
          onFilesChange={() => {}}
          onAccept={im.read}
          onRetry={im.read}
          onRemove={im.remove}
          showTypeIcons
        />
        <p className={shared.muted}>From Google Slides, use File → Download → Microsoft PowerPoint (.pptx). It keeps full-size pictures and videos.</p>
        {jobs.some((j) => j.basic) && (
          <InfoBanner tone="warning">AI drafting isn’t set up, so only titles, pictures and some text are filled in. See README: “Import from deck”.</InfoBanner>
        )}
        {estimate[1] > 0 && <p className={styles.cost}>{`Estimated AI cost about ${usdRange(estimate)}`}</p>}
      </>
    );
    actions = (
      <>
        <Button variant="secondary" onClick={im.hide}>
          {jobs.length ? 'Close' : 'Cancel'}
        </Button>
        {basicReady && !toDraft ? (
          <Button variant="primary" onClick={() => im.setView('review')}>
            Review drafts
          </Button>
        ) : jobs.some((j) => j.stage === 'drafting' || j.stage === 'ready') && !toDraft ? (
          <Button variant="primary" onClick={() => im.setView('drafting')}>
            See drafting
          </Button>
        ) : (
          <AiGlow on={awaiting.length > 0}>
            <Button variant="primary" leadingIcon={Sparkle} disabled={!awaiting.length} onClick={im.draftAll}>
              {toDraft > 1 ? `Draft ${toDraft} decks with AI` : 'Draft with AI'}
            </Button>
          </AiGlow>
        )}
      </>
    );
  } else if (view === 'drafting') {
    const ready = pendingReviews(reviews).length;
    const working = jobs.some(isBusy);
    body = (
      <>
        {working && (
          <InfoBanner tone="ai" actions={[{ label: 'Run in background', onClick: im.hide }]}>
            You don’t need to wait here. Drafting carries on while you work elsewhere in the admin.
          </InfoBanner>
        )}
        <ul className={styles.decks}>
          {jobs.map((j) => (
            <DeckProgress key={j.file.name + j.file.size} job={j} onRetry={() => im.retry(j)} />
          ))}
        </ul>
        {spentLine && <p className={styles.cost}>{`${spentLine} so far`}</p>}
      </>
    );
    actions = (
      <>
        <Button variant="secondary" onClick={() => im.setView('add')}>
          Add more decks
        </Button>
        {working && (
          <Button variant="secondary" onClick={im.hide}>
            Run in background
          </Button>
        )}
        <Button variant="primary" disabled={!ready} onClick={() => im.setView('review')}>
          {ready ? `Review ${plural(ready, 'draft')}` : 'Review drafts'}
        </Button>
      </>
    );
  } else if (view === 'review') {
    body = <ReviewStep />;
    const chosen = pendingReviews(reviews).length;
    actions = (
      <>
        <Button variant="secondary" onClick={() => im.setView('add')}>
          Add another deck
        </Button>
        <Button variant="primary" leadingIcon={Plus} disabled={!chosen || jobs.some((j) => j.stage === 'reading' || j.stage === 'estimating')} onClick={im.createAll}>
          {chosen ? `Create ${plural(chosen, 'draft')}` : 'Create drafts'}
        </Button>
      </>
    );
  } else {
    body = <DoneStep spentLine={spentLine} />;
    const failed = reviews.some((r) => r.outcome?.state === 'failed');
    actions = (
      <>
        {failed && !creating && (
          <Button variant="secondary" onClick={() => im.setView('review')}>
            Back to review
          </Button>
        )}
        <Button variant="secondary" disabled={creating} onClick={im.reset}>
          Import another deck
        </Button>
        <Button variant="primary" disabled={creating} onClick={im.hide}>
          Done
        </Button>
      </>
    );
  }

  return (
    <Modal open={open} onClose={im.hide} title="Import from deck" size="lg" closeLabel={jobs.some(isBusy) ? 'Close, keep drafting' : 'Close'} actions={actions}>
      <div className={styles.body}>
        <Stepper aria-label="Import steps" steps={STEPS} currentStep={view === 'done' && !creating ? STEPS.length : STEP_INDEX[view]} />
        {body}
      </div>
    </Modal>
  );
}

/** One deck while drafting: the AI's trace, or where it ended up. */
function DeckProgress({ job: j, onRetry }: { job: Job; onRetry: () => void }) {
  const deck = j.deck;
  const steps: ThinkingStep[] = [];
  if (deck) {
    const pictures = deck.assets.filter((a) => !a.decorative).length;
    const decorative = deck.assets.length - pictures;
    steps.push({ label: `Read ${plural(deck.slides.length, 'slide')}`, detail: `${pictures} picture${pictures === 1 ? '' : 's'} and videos` });
    if (decorative) steps.push({ label: 'Set aside logos and backgrounds', detail: `${decorative} kept apart` });
    if (j.estimate) steps.push({ label: 'Worked out the cost', detail: `about ${usdRange(j.estimate.cost)}` });
    if (j.stage === 'drafting' || j.stage === 'ready') steps.push({ label: 'Writing the projects' });
    if (j.stage === 'ready' && j.drafted) steps.push({ label: `Drafted ${plural(j.drafted, 'project')}` });
  }

  return (
    <li className={styles.deck}>
      <div className={styles.deckHead}>
        <span className={styles.deckName}>{j.file.name}</span>
        {j.stage === 'ready' && <Badge variant="success">{plural(j.drafted ?? 0, 'draft')}</Badge>}
        {j.stage === 'awaiting' && <Badge variant="neutral">Waiting</Badge>}
        {j.stage === 'failed' && <Badge variant="error">Didn’t finish</Badge>}
      </div>
      {j.stage === 'failed' ? (
        <InfoBanner tone="danger" actions={[{ label: 'Try again', onClick: onRetry }]}>
          {j.usage?.cost ? `${j.message} (${formatUsd(j.usage.cost)} was still charged.)` : j.message}
        </InfoBanner>
      ) : j.stage === 'reading' || j.stage === 'estimating' ? (
        <ProgressBar indeterminate title={j.stage === 'reading' ? 'Reading the deck' : 'Working out the cost'} />
      ) : steps.length >= 2 && (j.stage === 'drafting' || j.stage === 'ready') ? (
        <Thinking
          variant="steps"
          status={j.stage === 'drafting' ? 'working' : 'done'}
          workingLabel="Writing the projects"
          doneLabel={j.basic ? 'Drafted without AI' : 'Drafted in {duration}'}
          startedAt={j.startedAt}
          steps={steps}
        />
      ) : null}
    </li>
  );
}

function ReviewStep() {
  const im = useImport();
  const { reviews, jobs } = im;
  const [active, setActive] = useState(reviews[0]?.key ?? '');
  const current = reviews.find((r) => r.key === active) ?? reviews[0];
  useEffect(() => {
    if (!reviews.some((r) => r.key === active) && reviews[0]) setActive(reviews[0].key);
  }, [reviews, active]);

  const still = jobs.filter(isBusy);
  const chosen = pendingReviews(reviews).length;
  const spent = jobs.reduce((s, j) => s + (j.usage?.cost ?? 0), 0);

  if (!current) return <p className={shared.muted}>No drafts yet.</p>;
  const deck = jobs.find((j) => j.deck?.id === current.deckId)?.deck;
  const index = reviews.indexOf(current);

  return (
    <>
      {still.length > 0 && (
        <InfoBanner tone="info">{`${still.map((j) => j.file.name).join(', ')} ${still.length === 1 ? 'is' : 'are'} still drafting and will join this list.`}</InfoBanner>
      )}
      <Tabs
        aria-label="Drafted projects"
        scrollButtons
        value={current.key}
        onValueChange={setActive}
        tabs={reviews.map((r) => ({
          id: r.key,
          label: `${r.include ? '' : 'Skipped: '}${r.draft.title || 'Untitled'}`,
          count: r.include ? r.draft.reviewer_notes.length : undefined,
        }))}
      />
      {deck && <ReviewDraft key={current.key} review={current} deck={deck} />}
      <div className={styles.reviewFoot}>
        <span className={styles.cost}>
          {`${plural(chosen, 'project')} of ${reviews.length} will be created as drafts`}
          {spent > 0 && ` · AI cost ${formatUsd(spent)}`}
        </span>
        {index < reviews.length - 1 && (
          <Button variant="link" onClick={() => setActive(reviews[index + 1].key)}>
            Next draft
          </Button>
        )}
      </div>
    </>
  );
}

function DoneStep({ spentLine }: { spentLine: string }) {
  const im = useImport();
  const router = useRouter();
  const made = im.reviews.filter((r) => r.outcome);
  const done = made.filter((r) => r.outcome?.state === 'done').length;

  return (
    <>
      <p className={styles.doneTitle}>
        {im.creating ? `Creating ${plural(made.length, 'draft project')}…` : `${plural(done, 'draft project')} created`}
      </p>
      {!im.creating && <p className={shared.muted}>Nothing shows on the site until you publish. Open each one to finish it off.</p>}
      <ul className={styles.decks}>
        {made.map((r) => (
          <li key={r.key} className={styles.deck}>
            <div className={styles.deckHead}>
              <span className={styles.deckName}>{r.draft.title}</span>
              {r.outcome?.state === 'done' && (
                <>
                  <Badge variant="neutral">Draft</Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      im.hide();
                      router.push(`/admin/projects/${(r.outcome as { id: string }).id}`);
                    }}
                  >
                    Open in editor
                  </Button>
                </>
              )}
            </div>
            {r.outcome?.state === 'creating' && <ProgressBar title={r.outcome.label} value={r.outcome.value * 100} />}
            {r.outcome?.state === 'failed' && <InfoBanner tone="danger">{r.outcome.message}</InfoBanner>}
            {r.outcome?.state === 'done' && r.outcome.skipped.length > 0 && (
              <InfoBanner tone="warning">{`${plural(r.outcome.skipped.length, 'file')} couldn’t be added. Add them in the editor.`}</InfoBanner>
            )}
          </li>
        ))}
      </ul>
      {spentLine && !im.creating && <p className={styles.cost}>{`${spentLine} for this import, recorded in Activity.`}</p>}
    </>
  );
}
