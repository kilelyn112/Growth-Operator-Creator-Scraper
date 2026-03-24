'use client';

import SessionProvider from './SessionProvider';
import DashboardShell from './DashboardShell';

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  );
}
