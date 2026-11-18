'use client';

import { useRef } from 'react';
import Link from 'next/link';
import type { Client } from '@/lib/types';
import styles from './ClientMarquee.module.css';
import { useInView } from './useInView';

// Enough logos in one run to be wider than a wide screen, so the loop never shows a gap.
const MIN_PER_RUN = 10;

/**
 * Client logos sliding past in an endless row, in their own colours. Each opens
 * Our Works filtered to that client. The row stops while the pointer is on it,
 * and under reduced motion it sits still as a wrapped list.
 * TODO(design-system: no marquee; built with motion tokens).
 */
export function ClientMarquee({ clients }: { clients: Client[] }) {
  const repeat = Math.max(1, Math.ceil(MIN_PER_RUN / clients.length));
  const run = Array.from({ length: repeat }, () => clients).flat();
  const ref = useRef<HTMLDivElement>(null);
  // The row only moves while it's on screen.
  const visible = useInView(ref);

  return (
    <div ref={ref} className={styles.marquee} data-resting={!visible || undefined}>
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
      <Link
        href={`/work?client=${encodeURIComponent(client.id)}`}
        className={styles.link}
        tabIndex={hidden ? -1 : undefined}
        aria-label={hidden ? undefined : `${client.name}: see their work`}
        title={client.name}
      >
        {client.logo_url ? <img src={client.logo_url} alt="" draggable={false} /> : <span>{client.name}</span>}
      </Link>
    </li>
  );
}
