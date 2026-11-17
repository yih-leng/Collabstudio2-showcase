import type { Metadata } from 'next';
import { Mulish, Source_Serif_4 } from 'next/font/google';
import '@collabrium/ui/styles.css';
import './globals.css';
import { Providers } from '@/components/Providers';

const mulish = Mulish({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-primary',
});

// Brand moments only (the hero line), never inside components.
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-secondary',
});

// The site's public address, for link previews (absolute image links). On Vercel it comes
// from the production domain; set NEXT_PUBLIC_SITE_URL to use your own domain.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const description = 'AI films, characters, key visuals and brand campaigns by KULT, on CollabStudio.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'CollabStudio · AI Creative Showcase', template: '%s · CollabStudio' },
  description,
  icons: { icon: '/brand/fire.svg' },
  // Link previews in WhatsApp, Slack, LinkedIn and email. Project pages add their own cover.
  openGraph: { type: 'website', siteName: 'CollabStudio', title: 'CollabStudio · AI Creative Showcase', description },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${mulish.variable} ${sourceSerif.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
