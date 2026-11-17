import { BackButton } from '@collabrium/ui';
import { SiteShell } from '@/components/SiteShell';
import styles from './loading.module.css';

// Shown the moment a project is opened, while its page loads: the same frame
// (title, facts, media stage) as soft placeholders, so the click feels instant.
// TODO(design-system: no general skeleton component).
export default function Loading() {
  return (
    <SiteShell header={<BackButton label="Our Works" href="/work" />}>
      <div className={styles.page} aria-busy="true" aria-label="Loading project">
        <div className={styles.intro}>
          <div className={styles.main}>
            <span className={`${styles.block} ${styles.chip}`} />
            <span className={`${styles.block} ${styles.title}`} />
            <span className={`${styles.block} ${styles.line}`} />
            <span className={`${styles.block} ${styles.lineShort}`} />
          </div>
          <span className={`${styles.block} ${styles.facts}`} />
        </div>
        <span className={`${styles.block} ${styles.stage}`} />
      </div>
    </SiteShell>
  );
}
