'use client';

import { useEffect, useState } from 'react';

interface JobStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  keyword: string;
  error?: string;
}

export default function JobStatus({ status, progress, total, keyword, error }: JobStatusProps) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animate the progress number
  useEffect(() => {
    if (progress > displayProgress) {
      const timer = setTimeout(() => {
        setDisplayProgress(prev => Math.min(prev + 1, progress));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [progress, displayProgress]);

  const statusConfig = {
    pending: {
      label: 'INITIALIZING',
      color: 'var(--signal-warning)',
      bgColor: 'var(--signal-warning-dim)',
      icon: '◇',
    },
    processing: {
      label: 'SCANNING',
      color: 'var(--signal-action)',
      bgColor: 'var(--signal-action-dim)',
      icon: '◈',
    },
    completed: {
      label: 'COMPLETE',
      color: 'var(--signal-success)',
      bgColor: 'var(--signal-success-dim)',
      icon: '◉',
    },
    failed: {
      label: 'FAILED',
      color: 'var(--signal-danger)',
      bgColor: 'var(--signal-danger-dim)',
      icon: '✕',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--bg-border)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-mono"
            style={{
              backgroundColor: config.bgColor,
              color: config.color,
            }}
          >
            <span className={status === 'processing' ? 'animate-pulse' : ''}>
              {config.icon}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-mono font-semibold tracking-wider px-2 py-0.5 rounded"
                style={{
                  backgroundColor: config.bgColor,
                  color: config.color,
                }}
              >
                {config.label}
              </span>
            </div>
            <h3 className="text-[var(--text-primary)] font-semibold mt-1">
              {keyword}
            </h3>
          </div>
        </div>

        {/* Live Counter */}
        {(status === 'processing' || status === 'pending') && (
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-[var(--text-primary)]">
              <span className="animate-count">{displayProgress}</span>
              <span className="text-[var(--text-muted)]">/{total || '—'}</span>
            </div>
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">
              channels processed
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-[var(--signal-success)]">
              {total}
            </div>
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">
              scan complete
            </div>
          </div>
        )}
      </div>

      {/* Progress Section */}
      {(status === 'processing' || status === 'pending') && (
        <div className="px-6 py-4 bg-[var(--bg-base)]">
          {/* Progress Bar Container */}
          <div className="relative h-2 bg-[var(--bg-deep)] rounded-full overflow-hidden">
            {/* Animated Background */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
                animation: 'shimmer 2s ease-in-out infinite',
              }}
            />

            {/* Actual Progress */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${percentage}%`,
                backgroundColor: config.color,
                boxShadow: `0 0 10px ${config.color}`,
              }}
            />

            {/* Scanning Line Effect */}
            {status === 'processing' && (
              <div
                className="absolute inset-y-0 w-20 rounded-full scan-line-animation"
                style={{
                  background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
                  left: `${percentage}%`,
                }}
              />
            )}
          </div>

          {/* Progress Details */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal-action)] animate-pulse"></span>
                {status === 'pending' ? 'Connecting to APIs...' : 'Analyzing channels...'}
              </span>
            </div>
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              {percentage}%
            </span>
          </div>
        </div>
      )}

      {/* Completed State */}
      {status === 'completed' && (
        <div className="px-6 py-4 bg-[var(--signal-success-dim)]">
          <div className="flex items-center gap-2 text-[var(--signal-success)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Hunt complete. Review your targets below.</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'failed' && error && (
        <div className="px-6 py-4 bg-[var(--signal-danger-dim)]">
          <div className="flex items-center gap-2 text-[var(--signal-danger)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

    </div>
  );
}
