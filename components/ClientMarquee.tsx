'use client';

import { useEffect, useRef, useState } from 'react';
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
  const ready = useLogosDecoded(clients);

  return (
    <div
      ref={ref}
      className={styles.marquee}
      data-loading={!ready || undefined}
      data-resting={!visible || !ready || undefined}
    >
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

// Uploaded logos can be large files. Decoding them the first time they scroll
// into view stalls the page, so fetch and decode each one off the main thread
// as soon as the page loads, and start the row once they're ready (or after a
// few seconds, whatever has arrived).
const DECODE_WAIT_MS = 4000;

function useLogosDecoded(clients: Client[]) {
  const [ready, setReady] = useState(false);
  const urls = [...new Set(clients.map((c) => c.logo_url).filter(Boolean) as string[])].join('\n');

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const timer = window.setTimeout(finish, DECODE_WAIT_MS);
    Promise.all(
      (urls ? urls.split('\n') : []).map((u) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = u;
        return img.decode().catch(() => {});
      }),
    ).then(finish);
    return () => {
      done = true;
      window.clearTimeout(timer);
    };
  }, [urls]);

  return ready;
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
        {client.logo_url ? <img src={client.logo_url} alt="" draggable={false} decoding="async" /> : <span>{client.name}</span>}
      </Link>
    </li>
  );
}
