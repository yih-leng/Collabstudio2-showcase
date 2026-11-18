import { redirect } from 'next/navigation';

// Import from deck is an overlay on Projects now; old links land there.
export default function ImportPage() {
  redirect('/admin?import=1');
}
