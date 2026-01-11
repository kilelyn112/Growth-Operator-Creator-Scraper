'use client';

import { useEffect, useState, useRef } from 'react';

interface JobStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  keyword: string;
  error?: string;
}

// Fake usernames for the live feed effect
const FAKE_HANDLES = [
  'growth_mindset', 'success_daily', 'hustle_harder', 'money_moves',
  'entrepreneur_life', 'wealth_builder', 'biz_mastery', 'scale_up',
  'profit_first', 'ceo_vibes', 'founder_mode', 'startup_grind',
  'passive_income', 'freedom_lifestyle', 'coach_elite', 'mentor_pro',
  'digital_nomad', 'side_hustle', 'make_it_happen', 'level_up_daily'
];

export default function JobStatus({ status, progress, total, keyword, error }: JobStatusProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [displayQualified, setDisplayQualified] = useState(0);
  const [currentHandle, setCurrentHandle] = useState(FAKE_HANDLES[0]);
  const [scanAngle, setScanAngle] = useState(0);
  const [pulseRings, setPulseRings] = useState<number[]>([]);
  const ringIdRef = useRef(0);

  // Animate the progress number with easing
  useEffect(() => {
    if (progress > displayProgress) {
      const timer = setTimeout(() => {
        setDisplayProgress(prev => Math.min(prev + 1, progress));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [progress, displayProgress]);

  // Simulate qualified count (roughly 40-60% of progress)
  useEffect(() => {
    const qualifiedRatio = 0.4 + Math.random() * 0.2;
    const targetQualified = Math.floor(progress * qualifiedRatio);
    if (targetQualified > displayQualified) {
      const timer = setTimeout(() => {
        setDisplayQualified(prev => Math.min(prev + 1, targetQualified));
        // Add pulse ring on qualified increment
        if (Math.random() > 0.5) {
          ringIdRef.current += 1;
          setPulseRings(prev => [...prev.slice(-3), ringIdRef.current]);
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [progress, displayQualified]);

  // Cycle through fake handles for the scanning effect
  useEffect(() => {
    if (status !== 'processing') return;
    const interval = setInterval(() => {
      setCurrentHandle(FAKE_HANDLES[Math.floor(Math.random() * FAKE_HANDLES.length)]);
    }, 400);
    return () => clearInterval(interval);
  }, [status]);

  // Rotate the radar sweep
  useEffect(() => {
    if (status !== 'processing' && status !== 'pending') return;
    const interval = setInterval(() => {
      setScanAngle(prev => (prev + 3) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [status]);

  // Clean up old pulse rings
  useEffect(() => {
    if (pulseRings.length > 0) {
      const timer = setTimeout(() => {
        setPulseRings(prev => prev.slice(1));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pulseRings]);

  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  if (status === 'completed') {
    return (
      <div className="bg-[var(--bg-primary)] border border-[var(--status-success)] rounded-2xl overflow-hidden shadow-lg animate-fadeIn">
        <div className="p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--status-success-light)] flex items-center justify-center">
            <svg className="w-10 h-10 text-[var(--status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 className="font-fancy text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Hunt Complete
          </h3>
          <p className="text-[var(--text-secondary)] mb-6">
            Finished scanning for <span className="font-medium text-[var(--text-primary)]">{keyword}</span>
          </p>

          {/* Final Stats */}
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-[var(--text-primary)]">{total}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Scanned</div>
            </div>
            <div className="w-px bg-[var(--border-default)]" />
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-[var(--status-success)]">{displayQualified}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Qualified</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="bg-[var(--bg-primary)] border border-[var(--status-error)] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--status-error-light)] flex items-center justify-center">
            <svg className="w-10 h-10 text-[var(--status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="font-fancy text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Scan Failed
          </h3>
          <p className="text-[var(--status-error)]">{error || 'An unexpected error occurred'}</p>
        </div>
      </div>
    );
  }

  // Processing / Pending State - The Main Event
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-lg">
      <div className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-light)] border border-[var(--accent-border)] mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-sm font-medium text-[var(--accent)]">
              {status === 'pending' ? 'Initializing...' : 'Scanning in progress'}
            </span>
          </div>
          <h3 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
            Hunting for {keyword}
          </h3>
        </div>

        {/* Radar Visualization */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-[var(--border-default)]" />

          {/* Middle ring */}
          <div className="absolute inset-8 rounded-full border border-[var(--border-subtle)]" />

          {/* Inner ring */}
          <div className="absolute inset-16 rounded-full border border-[var(--border-subtle)]" />

          {/* Grid lines */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-[var(--border-subtle)]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-px h-full bg-[var(--border-subtle)]" />
          </div>

          {/* Radar sweep */}
          <div
            className="absolute inset-0 origin-center"
            style={{ transform: `rotate(${scanAngle}deg)` }}
          >
            <div
              className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
              style={{
                background: 'linear-gradient(90deg, var(--accent) 0%, transparent 100%)',
              }}
            />
            {/* Sweep trail */}
            <div
              className="absolute top-1/2 left-1/2 w-1/2 origin-left"
              style={{
                height: '60px',
                marginTop: '-30px',
                background: 'conic-gradient(from -30deg, transparent 0deg, rgba(16, 185, 129, 0.15) 30deg, transparent 60deg)',
                transform: 'rotate(-30deg)',
              }}
            />
          </div>

          {/* Pulse rings on discovery */}
          {pulseRings.map((id) => (
            <div
              key={id}
              className="absolute inset-0 rounded-full border-2 border-[var(--accent)] animate-ping opacity-30"
              style={{ animationDuration: '1.5s' }}
            />
          ))}

          {/* Center hub */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-default)] flex flex-col items-center justify-center shadow-inner">
              <div className="text-3xl font-mono font-bold text-[var(--accent)]">
                {displayProgress}
              </div>
              <div className="text-xs text-[var(--text-muted)]">found</div>
            </div>
          </div>

          {/* Blips on radar */}
          {[...Array(Math.min(displayProgress, 8))].map((_, i) => {
            const angle = (i * 45 + scanAngle * 0.5) % 360;
            const distance = 30 + (i % 3) * 25;
            const x = Math.cos((angle * Math.PI) / 180) * distance;
            const y = Math.sin((angle * Math.PI) / 180) * distance;
            return (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
                style={{
                  left: `calc(50% + ${x}px - 4px)`,
                  top: `calc(50% + ${y}px - 4px)`,
                  opacity: 0.6 + Math.random() * 0.4,
                }}
              />
            );
          })}
        </div>

        {/* Live Feed */}
        <div className="bg-[var(--bg-subtle)] rounded-xl p-4 mb-6 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--border-default)] animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-muted)]">Analyzing</span>
                <span className="text-sm font-mono text-[var(--text-primary)] truncate">
                  @{currentHandle}
                </span>
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                Checking qualification criteria...
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <div className="text-2xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
              {displayProgress}
            </div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Scanned</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-[var(--status-success-light)] border border-[var(--status-success)]">
            <div className="text-2xl font-mono font-bold text-[var(--status-success)] tabular-nums">
              {displayQualified}
            </div>
            <div className="text-xs text-[var(--status-success)] uppercase tracking-wider mt-1">Qualified</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <div className="text-2xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
              {percentage}%
            </div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Complete</div>
          </div>
        </div>

        {/* Progress bar (subtle, secondary) */}
        <div className="mt-6">
          <div className="h-1.5 bg-[var(--border-default)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
