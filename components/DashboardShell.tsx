'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from './SessionProvider';

const ADMIN_EMAILS = ['kile@growthoperator.com', 'admin@creatorpairing.com', 'kilelyn8@gmail.com'];

const NAV_ITEMS = [
  { href: '/', label: 'Find Creators', icon: 'leads', step: null },
  { href: '/crm', label: 'My Leads', icon: 'pipeline', step: null, comingSoon: true },
  { href: '/outreach', label: 'Outreach', icon: 'outreach', step: null },
];

const TOOL_ITEMS = [
  { href: '/funnel-builder', label: 'Funnel Builder', icon: 'funnel' },
];

function NavIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? 'var(--accent)' : 'var(--text-secondary)';
  const icons: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4',
    offer: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    presence: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    leads: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    pitch: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
    outreach: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    pipeline: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
    funnel: 'M3 4h18l-3 6h-12L3 4zm3 6v10l6-4 6 4V10',
    admin: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[type] || icons.home} />
    </svg>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.authenticated) {
    router.push('/login');
    return null;
  }

  // Redirect to onboarding if not completed
  if (session.onboardingCompleted === false) {
    router.push('/onboarding');
    return null;
  }

  const isAdmin = session.user && ADMIN_EMAILS.includes(session.user.email);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[var(--bg-primary)] border-r border-[var(--border-default)] flex flex-col fixed h-full">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--border-default)]">
          <a href="/" className="font-fancy text-lg font-semibold text-[var(--text-primary)]">
            creatorpairing.com
          </a>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Client Acquisition Platform</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Steps */}
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.comingSoon ? undefined : item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  item.comingSoon
                    ? 'opacity-40 cursor-default'
                    : isActive
                    ? 'bg-[var(--accent-light)] text-[var(--accent)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <NavIcon type={item.icon} active={isActive && !item.comingSoon} />
                <span className="flex-1">{item.label}</span>
                {item.comingSoon && (
                  <span className="text-[10px] font-medium text-[var(--text-muted)]">Soon</span>
                )}
              </a>
            );
          })}

          {/* Divider */}
          <div className="border-t border-[var(--border-subtle)] my-3" />

          {/* Tools */}
          {TOOL_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-[var(--accent-light)] text-[var(--accent)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <NavIcon type={item.icon} active={isActive} />
                <span>{item.label}</span>
              </a>
            );
          })}

          {/* Admin */}
          {isAdmin && (
            <a
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                pathname === '/admin'
                  ? 'bg-[var(--accent-light)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <NavIcon type="admin" active={pathname === '/admin'} />
              <span>Admin</span>
            </a>
          )}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-sm font-medium text-[var(--accent)]">
              {session.user?.firstName?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{session.user?.firstName}</p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                {session.user?.isMember ? 'Member' : session.trial?.isActive ? `Trial · ${session.trial.daysRemaining}d left` : 'Trial expired'}
              </p>
            </div>
            <button onClick={handleLogout} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Log out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
