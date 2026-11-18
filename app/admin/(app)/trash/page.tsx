import { redirect } from 'next/navigation';

// Trash is now the Archived tab on Projects; old links land there.
export default function TrashPage() {
  redirect('/admin?tab=archived');
}
