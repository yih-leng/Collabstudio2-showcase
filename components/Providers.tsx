'use client';

import { ToastProvider } from '@collabrium/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
