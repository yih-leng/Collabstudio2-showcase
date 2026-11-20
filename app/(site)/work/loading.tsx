import { PageHeader } from '@collabrium/ui';
import { SiteShell } from '@/components/SiteShell';
import styles from './loading.module.css';

const ROWS = [[2.5], [16 / 11, 1], [1, 16 / 11], [4 / 5, 4 / 5, 4 / 5]];

// Shown the moment Our Works is opened (from the menu, a client logo or a
// project type), while the work loads: the filter bar and the bento grid's
// first rows as soft placeholders, so the click feels instant.
// TODO(design-system: no general skeleton component).

export default function Loading() {
  return (
    <SiteShell>
      <div className={styles.page} aria-busy="true" aria-label="Loading work">
        <PageHeader title="Our Works" />
        <hr className={styles.divider} />
        <span className={`${styles.block} ${styles.bar}`} />
        <span className={`${styles.block} ${styles.count}`} />
        {/* The same shapes as the grid: full width, then wide and square, square and wide, three portraits. */}
        <div className={styles.bento}>
          {ROWS.map((row, i) => (
            <div key={i} className={styles.row} style={{ gridTemplateColumns: row.map((r) => `minmax(0, ${r}fr)`).join(' ') }}>
              {row.map((r, k) => (
                <span key={k} className={`${styles.block} ${styles.tile}`} style={{ aspectRatio: r }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
