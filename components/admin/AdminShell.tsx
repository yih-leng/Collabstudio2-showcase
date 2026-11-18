'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppShell, InfoBanner, SidebarNav } from '@collabrium/ui';
import { ArrowSquareOut, ClockCounterClockwise, EnvelopeSimple, FilmSlate, GearSix, ListBullets, SignOut, Trash } from '@phosphor-icons/react';
import { STUDIO_LOGO } from '@/components/SiteShell';
import { isDemoMode } from '@/lib/demo/config';
import { useAdmin } from './AdminContext';

function activeFor(pathname: string) {
  if (pathname.startsWith('/admin/trash')) return 'trash';
  if (pathname.startsWith('/admin/activity')) return 'activity';
  if (pathname.startsWith('/admin/enquiries')) return 'enquiries';
  if (pathname.startsWith('/admin/lists')) return 'lists';
  if (pathname.startsWith('/admin/settings')) return 'settings';
  return 'projects';
}

export function AdminShell({
  header,
  children,
  width = 'full',
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  width?: 'full' | 'reading';
}) {
  const pathname = usePathname();
  const { user, unread, signOut } = useAdmin();
  const email = user.email ?? 'Admin';

  return (
    <AppShell
      width={width}
      backToTop
      header={header}
      nav={
        <SidebarNav
          label="Admin"
          logo={STUDIO_LOGO}
          logoName="CollabStudio"
          logoHref="/admin"
          logoBadge="Admin"
          linkComponent={Link}
          activeId={activeFor(pathname)}
          collapsedStorageKey="collabstudio-admin-nav"
          sections={[
            {
              id: 'work',
              label: 'Showcase',
              items: [
                { id: 'projects', label: 'Projects', icon: FilmSlate, href: '/admin' },
                { id: 'trash', label: 'Trash', icon: Trash, href: '/admin/trash' },
              ],
            },
            {
              id: 'inbox',
              label: 'Inbox',
              items: [
                {
                  id: 'enquiries',
                  label: 'Enquiries',
                  icon: EnvelopeSimple,
                  href: '/admin/enquiries',
                  ...(unread ? { count: unread } : {}),
                },
              ],
            },
            {
              id: 'setup',
              label: 'Setup',
              items: [
                { id: 'lists', label: 'Clients and tags', icon: ListBullets, href: '/admin/lists' },
                { id: 'settings', label: 'Site settings', icon: GearSix, href: '/admin/settings' },
                { id: 'activity', label: 'Activity', icon: ClockCounterClockwise, href: '/admin/activity' },
              ],
            },
          ]}
          footerItems={[{ id: 'site', label: 'View site', icon: ArrowSquareOut, href: '/' }]}
          user={{ name: email.split('@')[0], role: 'Admin', email }}
          userMenu={[{ id: 'logout', label: 'Log out', icon: SignOut, onSelect: signOut }]}
        />
      }
    >
      {isDemoMode && (
        <InfoBanner tone="info">
          Local demo: changes save to the .demo folder on this computer and show on the site straight away. Delete that folder to
          start over with the sample projects.
        </InfoBanner>
      )}
      {children}
    </AppShell>
  );
}
