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

export const metadata: Metadata = {
  title: { default: 'CollabStudio · AI Creative Showcase', template: '%s · CollabStudio' },
  description: 'AI films, characters, key visuals and brand campaigns by KULT, on CollabStudio.',
  icons: { icon: '/brand/fire.svg' },
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
