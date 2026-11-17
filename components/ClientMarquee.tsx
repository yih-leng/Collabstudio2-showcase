'use client';

import type { Client } from '@/lib/types';
import styles from './ClientMarquee.module.css';

// Enough logos in one run to be wider than a wide screen, so the loop never shows a gap.
const MIN_PER_RUN = 10;

/**
 * Client logos sliding past in an endless row. It stops while the pointer is
 * on it, and under reduced motion it sits still as a wrapped list.
 * TODO(design-system: no marquee; built with motion tokens).
 */
export function ClientMarquee({ clients }: { clients: Client[] }) {
  const repeat = Math.max(1, Math.ceil(MIN_PER_RUN / clients.length));
  const run = Array.from({ length: repeat }, () => clients).flat();

  return (
    <div className={styles.marquee}>
      {/* The list people and screen readers read: each client once. */}
      <ul className={styles.track} style={{ ['--items' as string]: run.length }}>
        {run.map((c, i) => (
          <Logo key={`a-${c.id}-${i}`} client={c} hidden={i >= clients.length} />
        ))}
        {run.map((c, i) => (
          <Logo key={`b-${c.id}-${i}`} client={c} hidden />
        ))}
      </ul>
    </div>
  );
}

function Logo({ client, hidden }: { client: Client; hidden: boolean }) {
  return (
    <li className={styles.logo} aria-hidden={hidden || undefined} data-copy={hidden || undefined}>
      {client.logo_url ? <img src={client.logo_url} alt={hidden ? '' : client.name} /> : <span>{client.name}</span>}
    </li>
  );
}
