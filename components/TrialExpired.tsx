'use client';

interface TrialExpiredProps {
  firstName: string;
  onLogout: () => void;
}

export default function TrialExpired({ firstName, onLogout }: TrialExpiredProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
              creatorpairing.com
            </h1>
            <button onClick={onLogout} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="font-fancy text-3xl font-semibold text-[var(--text-primary)] mb-3">
            Trial Period Ended
          </h2>

          <p className="text-[var(--text-secondary)] mb-8">
            Hey {firstName}, your 7-day free trial has expired. To continue using Creator Pairing and finding qualified creators, please upgrade to a membership.
          </p>

          <div className="card p-6 text-left mb-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">What you get with membership:</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Unlimited creator searches</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Export results to CSV</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Access to all platforms</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-secondary)]">Funnel finder tool</span>
              </li>
            </ul>
          </div>

          <a
            href="https://growthoperator.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full"
          >
            Upgrade to Membership
          </a>

          <p className="text-xs text-[var(--text-muted)] mt-4">
            Already a member? Contact support to link your account.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="text-center text-sm text-[var(--text-muted)]">
            Powered by{' '}
            <a href="https://growthoperator.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
              growthoperator.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
