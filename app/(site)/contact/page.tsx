import type { Metadata } from 'next';
import { getSettings } from '@/lib/data';
import { ContactView } from './ContactView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Work with us' };

export default async function ContactPage() {
  const settings = await getSettings();
  return <ContactView settings={settings} />;
}
