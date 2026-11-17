'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, BackButton, Card, CardGrid, CardTitle, InfoBanner, PageHeader, Tabs, Tag } from '@collabrium/ui';
import { ScrollReveal } from '@collabrium/ui/motion';
import { ArrowLeft, ArrowRight, LockSimple } from '@phosphor-icons/react';
import { Gallery } from '@/components/Gallery';
import { HeroCarousel } from '@/components/HeroCarousel';
import { SiteShell } from '@/components/SiteShell';
import { STATUS_BADGE, VISIBILITY_LABEL, statusText } from '@/lib/format';
import type { Client, Media, ProjectDetailData } from '@/lib/types';
import styles from './project.module.css';

/**
 * The project page template. Every project follows the same order, and a
 * section only shows when it has content:
 *   title and facts → media carousel (hero, then every deliverable) →
 *   About this project → Output → Overview →
 *   Capabilities (incl. how AI was used) → Gallery → next/previous.
 */
export function ProjectView({ project: p }: { project: ProjectDetailData }) {
  const isPreview = p.visibility !== 'published';
  const type = p.categories[0]?.name;

  const sections = [
    p.about && { id: 'about', title: 'About this project', body: <About text={p.about} /> },
    (p.output_summary || p.deliverables.length > 0) && { id: 'output', title: 'Output', body: <Output p={p} /> },
    p.blocks.length > 0 && { id: 'overview', title: 'Overview', body: <Overview p={p} /> },
    (p.capabilities.length > 0 || p.capabilities_summary || p.workflow.length > 0 || p.tools.length > 0) && {
      id: 'capabilities',
      title: 'Capabilities',
      body: <Capabilities p={p} />,
    },
    p.gallery.length > 0 && { id: 'gallery', title: 'Gallery', body: <GallerySection items={p.gallery} /> },
  ].filter(Boolean) as { id: string; title: string; body: React.ReactNode }[];
  const current = useCurrentSection(sections.map((s) => s.id));

  return (
    <SiteShell header={<BackButton label="Our Works" href="/work" />}>
      <article className={styles.article}>
        {(isPreview || p.is_internal) && (
          <InfoBanner tone={isPreview ? 'warning' : 'neutral'} icon={isPreview ? undefined : LockSimple}>
            {isPreview
              ? `Preview: this project is ${VISIBILITY_LABEL[p.visibility].toLowerCase()}, so only signed-in admins can see it.`
              : 'Internal: only signed-in team members can see this project.'}
          </InfoBanner>
        )}

        {p.status === 'in_progress' && (
          <InfoBanner tone="info">
            This work is in progress. What you see here is subject to change before it’s final.
          </InfoBanner>
        )}

        <header className={styles.intro}>
          <div className={styles.introMain}>
            <PageHeader title={p.title} />
            {p.one_liner && <p className={styles.lede}>{p.one_liner}</p>}
            <div className={styles.badges}>
              {type && <Tag variant="fire">{type}</Tag>}
              <Badge variant={STATUS_BADGE[p.status]}>{statusText(p.status, p.status_note)}</Badge>
            </div>
          </div>
          <dl className={styles.facts}>
            {p.clients.length > 0 && (
              <div className={`${styles.fact} ${styles.factWide}`}>
                <dt>{p.clients.length > 1 ? 'Clients' : 'Client'}</dt>
                <dd className={styles.logos}>
                  {p.clients.map((c) => (
                    <ClientLogo key={c.id} client={c} />
                  ))}
                </dd>
              </div>
            )}
            <Fact label="Project type" value={p.categories.map((c) => c.name).join(', ')} />
            <Fact label="Year" value={p.year ? String(p.year) : ''} />
          </dl>
        </header>

        <HeroCarousel items={[...(p.hero ? [p.hero] : []), ...p.gallery]} title={p.title} />

        {sections.length > 0 && (
          <nav aria-label="On this page" className={styles.toc}>
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={styles.tocLink}
                aria-current={current === s.id ? 'location' : undefined}
                onClick={(e) => {
                  // The page scrolls inside the shell, so glide there ourselves (or jump, under reduced motion).
                  const el = document.getElementById(s.id);
                  if (!el) return;
                  e.preventDefault();
                  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
                  history.replaceState(null, '', `#${s.id}`);
                }}
              >
                <span className={styles.tocNum}>{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </a>
            ))}
          </nav>
        )}

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionNum} aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 id={`${s.id}-h`} className={styles.h2}>
                {s.title}
              </h2>
            </div>
            <ScrollReveal>
              <div className={styles.sectionBody}>{s.body}</div>
            </ScrollReveal>
          </section>
        ))}

        {(p.prev || p.next) && (
          <nav aria-label="More projects" className={styles.pager}>
            {p.prev ? (
              <Link href={`/work/${p.prev.slug}`} className={styles.pagerLink}>
                <span className={styles.pagerHint}>
                  <ArrowLeft aria-hidden /> Previous
                </span>
                <span className={styles.pagerTitle}>{p.prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {p.next && (
              <Link href={`/work/${p.next.slug}`} className={`${styles.pagerLink} ${styles.pagerNext}`}>
                <span className={styles.pagerHint}>
                  Next <ArrowRight aria-hidden />
                </span>
                <span className={styles.pagerTitle}>{p.next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </article>
    </SiteShell>
  );
}

/** The section on screen now: the last one whose top has passed the bar. */
function useCurrentSection(ids: string[]) {
  const [current, setCurrent] = useState<string | null>(null);
  const key = ids.join(',');
  useEffect(() => {
    const els = key.split(',').map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const firstVisible = els.find((el) => seen.get(el.id));
        if (firstVisible) setCurrent(firstVisible.id);
      },
      // A band just under the sticky bar.
      { rootMargin: '-90px 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);
  return current;
}

/** A client's logo in a fixed box, or its name in the same box until a logo is uploaded. */
function ClientLogo({ client }: { client: Client }) {
  return (
    <span className={styles.logo} title={client.name}>
      {client.logo_url ? <img src={client.logo_url} alt={client.name} /> : <span>{client.name}</span>}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function About({ text }: { text: string }) {
  return <p className={styles.about}>{text}</p>;
}

function Output({ p }: { p: ProjectDetailData }) {
  return (
    <div className={styles.stack}>
      {p.output_summary && <p className={styles.summary}>{p.output_summary}</p>}
      {p.deliverables.length > 0 && (
        <ul className={styles.deliverables}>
          {p.deliverables.map((d, i) => (
            <li key={d.id}>
              <span className={styles.deliverableNum} aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              {d.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Overview({ p }: { p: ProjectDetailData }) {
  return (
    <CardGrid columns="functional">
      {p.blocks.map((b) => (
        <Card key={b.id} surface="warm">
          <CardTitle>{b.label}</CardTitle>
          <p className={styles.body}>{b.body}</p>
        </Card>
      ))}
    </CardGrid>
  );
}

function Capabilities({ p }: { p: ProjectDetailData }) {
  return (
    <div className={styles.stack}>
      {(p.capabilities_summary || p.capabilities.length > 0) && (
        <div className={styles.stackSm}>
          {p.capabilities_summary && <p className={styles.summary}>{p.capabilities_summary}</p>}
          {p.capabilities.length > 0 && (
            <div className={styles.tags}>
              {p.capabilities.map((t) => (
                <Tag key={t.id} variant="fire">
                  {t.name}
                </Tag>
              ))}
            </div>
          )}
        </div>
      )}
      {(p.workflow.length > 0 || p.tools.length > 0) && (
        <Card>
          <CardTitle>{p.workflow_label || 'How AI was used'}</CardTitle>
          {p.workflow.length > 0 && (
            <ol className={styles.steps}>
              {p.workflow.map((d) => (
                <li key={d.id}>{d.text}</li>
              ))}
            </ol>
          )}
          {p.tools.length > 0 && (
            <div className={styles.tools}>
              <span className={styles.toolsLabel}>Tools used</span>
              <div className={styles.tags}>
                {p.tools.map((t) => (
                  <Tag key={t.id} variant="neutral">
                    {t.name}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function GallerySection({ items }: { items: Media[] }) {
  const groups = [
    { id: 'images', label: 'Images', items: items.filter((m) => m.kind === 'image') },
    { id: 'videos', label: 'Videos', items: items.filter((m) => m.kind === 'video' || m.kind === 'embed') },
    { id: 'audio', label: 'Audio', items: items.filter((m) => m.kind === 'audio') },
  ].filter((g) => g.items.length);
  // Only offer the split when there is more than one kind.
  if (groups.length < 2) return <Gallery items={items} />;
  return (
    <Tabs
      aria-label="Gallery"
      surface="canvas"
      tabs={[
        { id: 'all', label: 'All', count: items.length, content: <Gallery items={items} /> },
        ...groups.map((g) => ({ id: g.id, label: g.label, count: g.items.length, content: <Gallery items={g.items} /> })),
      ]}
    />
  );
}
