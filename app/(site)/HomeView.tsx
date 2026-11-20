'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@collabrium/ui';
import { ScrollReveal, WordReveal } from '@collabrium/ui/motion';
import { ClientMarquee } from '@/components/ClientMarquee';
import { CountUpOnView } from '@/components/CountUpOnView';
import { ProjectTypeIndex } from '@/components/ProjectTypeIndex';
import { WorkSlider } from '@/components/WorkSlider';
import { SiteShell } from '@/components/SiteShell';
import type { Client, ProjectTypeSummary, ShowcaseSlide, SiteSettings } from '@/lib/types';
import enter from '@/components/enter.module.css';
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
  projectTypes: ProjectTypeSummary[];
}) {
  const router = useRouter();
  return (
    <SiteShell>
      {/* The page opens on the studio statement and its numbers, then the work,
          each part arriving after the one before (see enter.module.css). */}
      <section className={styles.intro} aria-label="About the studio">
        <h1 className={styles.statement}>
          {settings.hero_intro ? <WordReveal text={settings.hero_intro} ease="reveal" /> : settings.hero_title || 'AI Creative Showcase'}
        </h1>
        <div className={`${styles.side} ${enter.enter}`} style={{ '--at': 1 } as React.CSSProperties}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.figure}>
                <CountUpOnView value={projectCount} />
              </span>
              <span className={styles.label}>{projectCount === 1 ? 'Project' : 'Projects'} shipped with AI</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.figure}>
                <CountUpOnView value={clients.length} />
              </span>
              <span className={styles.label}>{clients.length === 1 ? 'Brand' : 'Brands'} we&apos;ve made work for</span>
            </div>
          </div>
          <span>
            <Button variant="primary" size="lg" trailingArrow="right" onClick={() => router.push('/work')}>
              Explore all work
            </Button>
          </span>
        </div>
      </section>

      <div className={`${styles.slider} ${enter.enter}`} style={{ '--at': 2 } as React.CSSProperties}>
        <WorkSlider slides={slides} />
      </div>

      {/* Each section after the slider fades in as it scrolls into view. */}
      {projectTypes.length > 0 && (
        <ScrollReveal>
          <ProjectTypeIndex types={projectTypes} />
        </ScrollReveal>
      )}

      {clients.length > 0 && (
        <ScrollReveal>
          <section aria-labelledby="clients-heading" className={styles.section}>
            <h2 id="clients-heading" className={styles.eyebrow}>
              Clients we&apos;ve made work for
            </h2>
            <ClientMarquee clients={clients} />
          </section>
        </ScrollReveal>
      )}
    </SiteShell>
  );
}
