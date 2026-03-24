'use client';

import DashboardWrapper from '@/components/DashboardWrapper';
import { useSession } from '@/components/SessionProvider';

const STEPS = [
  { number: 1, name: 'Your Offer', href: '/offer', description: 'Build a positioned offer that stands out', status: 'available' as const },
  { number: 2, name: 'Your Presence', href: '/presence', description: 'Audit your online presence', status: 'coming_soon' as const },
  { number: 3, name: 'Find Creators', href: '/leads', description: 'Discover qualified leads in your niche', status: 'available' as const },
  { number: 4, name: 'Your Pitch', href: '/pitch', description: 'Craft outreach that gets replies', status: 'coming_soon' as const },
  { number: 5, name: 'Outreach', href: '/outreach', description: 'Send emails and DMs at scale', status: 'available' as const },
  { number: 6, name: 'Pipeline', href: '/pipeline', description: 'Track deals from lead to close', status: 'coming_soon' as const },
];

export default function DashboardPage() {
  const { session } = useSession();
  const firstName = session?.user?.firstName || 'there';

  return (
    <DashboardWrapper>
    <div>
      {/* Welcome */}
      <div className="mb-10">
        <h1 className="font-fancy text-3xl font-semibold text-[var(--text-primary)]">
          Hey {firstName}
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Here&apos;s your client acquisition system. Work through each step to start landing clients.
        </p>
      </div>

      {/* Next Action */}
      <div className="card p-6 mb-8 border-l-4 border-l-[var(--accent)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-1">Start here</p>
            <h3 className="font-fancy text-lg font-semibold text-[var(--text-primary)] mb-1">
              Build your offer first
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Your offer is the foundation. A weak offer means outreach won&apos;t work no matter how good your pitch is. Most people skip this — don&apos;t.
            </p>
          </div>
          <a href="/offer" className="btn-accent whitespace-nowrap ml-6">
            Build Your Offer
          </a>
        </div>
      </div>

      {/* 6-Step Journey */}
      <h2 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-4">Your acquisition journey</h2>
      <div className="grid grid-cols-3 gap-4 mb-10">
        {STEPS.map((step) => (
          <a
            key={step.number}
            href={step.status === 'available' ? step.href : undefined}
            className={`card p-5 transition-all ${
              step.status === 'available'
                ? 'hover:border-[var(--accent-border)] hover:shadow-md cursor-pointer'
                : 'opacity-50 cursor-default'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step.status === 'available'
                  ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
              }`}>
                {step.number}
              </div>
              <h3 className="font-medium text-[var(--text-primary)]">{step.name}</h3>
              {step.status === 'coming_soon' && (
                <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded-full ml-auto">Soon</span>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
          </a>
        ))}
      </div>

      {/* Quick Stats */}
      <h2 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-4">Quick stats</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Offer Score</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Build your offer to get scored</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Creators Found</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Search to find leads</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Emails Sent</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Start outreach</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Pipeline Value</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Coming soon</p>
        </div>
      </div>
    </div>
    </DashboardWrapper>
  );
}

