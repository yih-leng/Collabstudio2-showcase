import { PageHeader } from '@collabrium/ui';
import { SiteShell } from '@/components/SiteShell';
import styles from './loading.module.css';

// Shown the moment Our Works is opened (from the menu, a client logo or a
// project type), while the work loads: the filter bar and a grid of cards as
// soft placeholders, so the click feels instant.
// TODO(design-system: no general skeleton component).
export default function Loading() {
  return (
    <SiteShell header={<PageHeader title="Our Works" />}>
      <div className={styles.page} aria-busy="true" aria-label="Loading work">
        <span className={`${styles.block} ${styles.bar}`} />
        <div className={styles.grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.card}>
              <span className={`${styles.block} ${styles.thumb}`} />
              <span className={`${styles.block} ${styles.line}`} />
              <span className={`${styles.block} ${styles.lineShort}`} />
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
