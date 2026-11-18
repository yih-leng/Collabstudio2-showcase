'use client';

import { Button } from '@collabrium/ui';
import { FilePpt, Sparkle } from '@phosphor-icons/react';
import { isBusy, pendingReviews, useImport } from './ImportContext';
import styles from './import.module.css';

/** Opens Import from deck. While drafting runs in the background it glows and shows how far it's got. */
export function ImportButton() {
  const { jobs, reviews, creating, show } = useImport();
  const drafting = jobs.filter((j) => j.stage === 'drafting' || j.stage === 'awaiting' || j.stage === 'ready');
  const busy = jobs.some(isBusy) || creating;
  const waiting = pendingReviews(reviews).length;

  if (busy) {
    const done = drafting.filter((j) => j.stage === 'ready').length;
    const label = creating ? 'Creating drafts…' : drafting.length ? `Drafting ${done + 1} of ${drafting.length}…` : 'Reading decks…';
    return (
      // TODO(design-system: Button has no AI variant; the glow borrows Info Banner tone "ai"'s gradient.)
      <span className={styles.aiGlow}>
        <Button variant="secondary" leadingIcon={Sparkle} onClick={() => show()}>
          {label}
        </Button>
      </span>
    );
  }
  if (waiting) {
    return (
      <span className={styles.aiGlow}>
        <Button variant="secondary" leadingIcon={Sparkle} onClick={() => show('review')}>
          {`Review ${waiting} draft${waiting === 1 ? '' : 's'}`}
        </Button>
      </span>
    );
  }
  return (
    <Button variant="secondary" leadingIcon={FilePpt} onClick={() => show(jobs.length ? undefined : 'add')}>
      Import from deck
    </Button>
  );
}
