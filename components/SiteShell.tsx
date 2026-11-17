'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppShell, SidebarNav } from '@collabrium/ui';
import { FilmSlate, House } from '@phosphor-icons/react';
import { ContentGuard } from './ContentGuard';
import styles from './SiteShell.module.css';

export const STUDIO_LOGO = {
  kind: 'lockup' as const,
  src: '/brand/collabStudio.svg',
  iconSrc: '/brand/fire.svg',
};

// The nav opens expanded on arrival, then folds to the icon rail after a
// moment so the work gets the room. Once it has folded, or the visitor has
// opened or closed it themselves, that state carries across pages (this
// module lives for the whole visit; a reload starts over).
const AUTO_COLLAPSE_MS = 3500;
let navCollapsed: boolean | null = null;

function useAutoCollapsingNav() {
  const [collapsed, setCollapsed] = useState(navCollapsed ?? false);

  useEffect(() => {
    if (navCollapsed !== null) return;
    // Narrower windows already start folded (the shell's own rule).
    if (window.matchMedia('(max-width: 1023px)').matches) {
      navCollapsed = true;
      setCollapsed(true);
      return;
    }
    let timer: number;
    const fold = () => {
      if (navCollapsed !== null) return;
      // Not while the pointer is resting on the nav: try again shortly.
      if (document.querySelector('.cui-app-shell__nav:hover')) {
        timer = window.setTimeout(fold, 1000);
        return;
      }
      navCollapsed = true;
      setCollapsed(true);
    };
    timer = window.setTimeout(fold, AUTO_COLLAPSE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const change = (next: boolean) => {
    navCollapsed = next;
    setCollapsed(next);
  };
  return [collapsed, change] as const;
}

function activeFor(pathname: string) {
  if (pathname.startsWith('/work')) return 'work';
  return 'home';
}

/** The public site's frame: CollabStudio nav on the left, the page header on top. */
export function SiteShell({
  header,
  children,
  width = 'full',
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  width?: 'full' | 'reading';
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useAutoCollapsingNav();
  return (
    <AppShell
      width={width}
      backToTop
      header={header}
      nav={
        <SidebarNav
          label="Main"
          logo={STUDIO_LOGO}
          logoName="CollabStudio"
          logoHref="/"
          linkComponent={Link}
          activeId={activeFor(pathname)}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          sections={[
            {
              id: 'main',
              items: [
                { id: 'home', label: 'Home', icon: House, href: '/' },
                { id: 'work', label: 'Our Works', icon: FilmSlate, href: '/work' },
              ],
            },
          ]}
        />
      }
    >
      <ContentGuard />
      <div className={styles.phoneBar} aria-hidden />
      {children}
    </AppShell>
  );
}
