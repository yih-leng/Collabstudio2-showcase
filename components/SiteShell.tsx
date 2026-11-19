'use client';

import { useState } from 'react';
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

// The nav starts folded to the icon rail so the work gets the room. If the
// visitor opens or closes it, that choice carries across pages (this module
// lives for the whole visit; a reload starts folded again).
let navCollapsed = true;

function useNavCollapsed() {
  const [collapsed, setCollapsed] = useState(navCollapsed);
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
  /** The page header. The home page has none: it opens on its own statement. */
  header?: React.ReactNode;
  children: React.ReactNode;
  width?: 'full' | 'reading';
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useNavCollapsed();
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
