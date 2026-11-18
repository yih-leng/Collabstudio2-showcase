'use client';

import { useRouter } from 'next/navigation';
import { Button, PageHeader, StatCard, StatGrid } from '@collabrium/ui';
import { CountUp, ScrollReveal, WordReveal } from '@collabrium/ui/motion';
import { ClientMarquee } from '@/components/ClientMarquee';
import { Showcase } from '@/components/Showcase';
import { SiteShell } from '@/components/SiteShell';
import type { Client, ShowcaseSlide, SiteSettings } from '@/lib/types';
import styles from './home.module.css';

export function HomeView({
  settings,
  slides,
  clients,
  projectCount,
  projectTypes,
}: {
  settings: SiteSettings;
  slides: ShowcaseSlide[];
  clients: Client[];
  projectCount: number;
  projectTypes: { id: string; name: string; count: number }[];
}) {
  const router = useRouter();
  return (
    <SiteShell
      header={
        <PageHeader
          title={settings.hero_title || 'AI Creative Showcase'}
          subtitle="KULT · AI creative capabilities"
          actions={
            <Button variant="primary" trailingArrow="right" onClick={() => router.push('/work')}>
              Explore all work
            </Button>
          }
        />
      }
    >
      <Showcase slides={slides} />

      <section className={styles.intro} aria-label="About the studio">
        {settings.hero_intro && (
          <p className={styles.statement}>
            <WordReveal text={settings.hero_intro} />
          </p>
        )}
        <ScrollReveal>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.figure}>
                <CountUp value={projectCount} duration="ambient" />
              </span>
              <span className={styles.label}>{projectCount === 1 ? 'Project' : 'Projects'} shipped with AI</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.figure}>
                <CountUp value={clients.length} duration="ambient" />
              </span>
              <span className={styles.label}>{clients.length === 1 ? 'Brand' : 'Brands'} we&apos;ve made work for</span>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {projectTypes.length > 0 && (
        <section aria-labelledby="types-heading" className={styles.section}>
          <h2 id="types-heading" className={styles.eyebrow}>
            By project type
          </h2>
          <ScrollReveal>
            <StatGrid>
              {projectTypes.map((t) => (
                <StatCard
                  key={t.id}
                  label={t.name}
                  value={t.count}
                  description={t.count === 1 ? 'Project' : 'Projects'}
                  href={`/work?category=${encodeURIComponent(t.id)}`}
                />
              ))}
            </StatGrid>
          </ScrollReveal>
        </section>
      )}

      {clients.length > 0 && (
        <section aria-labelledby="clients-heading" className={styles.section}>
          <h2 id="clients-heading" className={styles.eyebrow}>
            Clients we&apos;ve made work for
          </h2>
          <ClientMarquee clients={clients} />
        </section>
      )}
    </SiteShell>
  );
}
