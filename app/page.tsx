'use client';

import { useState, useCallback } from 'react';
import NichePicker from '@/components/NichePicker';
import JobStatus from '@/components/JobStatus';
import ResultsTable from '@/components/ResultsTable';
import { Niche } from '@/lib/niches';

type Platform = 'youtube' | 'instagram' | 'x' | 'tiktok' | 'linkedin' | 'skool' | 'substack';

interface Creator {
  id: number;
  platform: Platform;
  platformId: string;
  username: string | null;
  displayName: string;
  profileUrl: string;
  followers: number;
  following: number;
  postCount: number;
  totalViews: number;
  engagementRate: number;
  bio: string | null;
  externalUrl: string | null;
  qualified: boolean;
  qualificationReason: string;
  email: string | null;
  firstName: string | null;
  // Legacy fields for backward compatibility
  channelId?: string;
  channelName?: string;
  channelUrl?: string;
  subscribers?: number;
  videoCount?: number;
}

interface Job {
  id: string;
  keyword: string;
  platform: Platform;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  error?: string;
}

interface Summary {
  total: number;
  qualified: number;
  withEmail: number;
}

const PLATFORMS: { id: Platform; name: string; icon: string; available: boolean }[] = [
  { id: 'youtube', name: 'YouTube', icon: '📺', available: true },
  { id: 'instagram', name: 'Instagram', icon: '📸', available: true },
  { id: 'x', name: 'X', icon: '𝕏', available: true },
];

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, qualified: 0, withEmail: 0 });
  const [isSearching, setIsSearching] = useState(false);
  const [isFindingMore, setIsFindingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('youtube');
  const [maxResults, setMaxResults] = useState(50);
  const [seedAccounts, setSeedAccounts] = useState('');

  const pollJob = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/search/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const data = await response.json();
      setJob(data.job);
      setCreators(data.creators);
      setSummary(data.summary);

      // Continue polling if job is still in progress
      if (data.job.status === 'pending' || data.job.status === 'processing') {
        setTimeout(() => pollJob(id), 2000);
      } else {
        setIsSearching(false);
      }
    } catch (err) {
      console.error('Error polling job:', err);
      setError('Failed to fetch job status');
      setIsSearching(false);
    }
  }, []);

  const handleSearch = async (niche: Niche) => {
    setIsSearching(true);
    setError(null);
    setJob(null);
    setCreators([]);
    setSummary({ total: 0, qualified: 0, withEmail: 0 });
    setSelectedNiche(niche);

    // Use the first search keyword for the niche
    const keyword = niche.searchKeywords[0];

    try {
      const requestBody: { keyword: string; maxResults: number; platform: Platform; seedAccounts?: string } = {
        keyword,
        maxResults,
        platform: selectedPlatform,
      };

      // Include seed accounts for Instagram if provided
      if (selectedPlatform === 'instagram' && seedAccounts.trim()) {
        requestBody.seedAccounts = seedAccounts.trim();
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to start search');
      }

      const data = await response.json();
      setJobId(data.jobId);

      // Start polling for results
      pollJob(data.jobId);
    } catch (err) {
      console.error('Error starting search:', err);
      setError('Failed to start search. Please try again.');
      setIsSearching(false);
    }
  };

  // Handle search with just seed accounts (no niche selection needed)
  const handleSeedSearch = async () => {
    if (!seedAccounts.trim()) return;

    setIsSearching(true);
    setError(null);
    setJob(null);
    setCreators([]);
    setSummary({ total: 0, qualified: 0, withEmail: 0 });
    setSelectedNiche(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: 'similar creators', // Generic keyword since we're using seeds
          maxResults,
          platform: 'instagram',
          seedAccounts: seedAccounts.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start search');
      }

      const data = await response.json();
      setJobId(data.jobId);

      // Start polling for results
      pollJob(data.jobId);
    } catch (err) {
      console.error('Error starting seed search:', err);
      setError('Failed to start search. Please try again.');
      setIsSearching(false);
    }
  };

  const handleNewSearch = () => {
    setJobId(null);
    setJob(null);
    setCreators([]);
    setSummary({ total: 0, qualified: 0, withEmail: 0 });
    setError(null);
    setSelectedNiche(null);
  };

  // Handle "Find More" - continue searching with the same job
  const handleFindMore = async () => {
    if (!jobId || !job) return;

    setIsFindingMore(true);
    setError(null);

    try {
      const response = await fetch(`/api/search/${jobId}/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResults }),
      });

      if (!response.ok) {
        throw new Error('Failed to continue search');
      }

      // Start polling for results again
      setIsSearching(true);
      pollJob(jobId);
    } catch (err) {
      console.error('Error continuing search:', err);
      setError('Failed to find more creators. Please try again.');
    } finally {
      setIsFindingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)]">
      {/* Header */}
      <header className="border-b border-[var(--bg-border)] bg-[var(--bg-base)]">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo Mark */}
              <div className="w-10 h-10 rounded-lg bg-[var(--signal-action-dim)] flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--signal-action)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Creator Hunter
                </h1>
                <p className="text-xs font-mono text-[var(--text-muted)] tracking-wider uppercase">
                  Find qualified creators for outreach
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {job && (
                <button
                  onClick={handleNewSearch}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--bg-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all duration-150 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New Hunt
                </button>
              )}

              {/* Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--bg-border)]">
                <div className={`w-2 h-2 rounded-full ${isSearching ? 'bg-[var(--signal-warning)] animate-pulse' : 'bg-[var(--signal-success)]'}`}></div>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {isSearching ? 'HUNTING' : 'READY'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-[var(--signal-danger-dim)] border border-[rgba(239,68,68,0.3)]">
              <svg className="w-5 h-5 text-[var(--signal-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[var(--signal-danger)] font-medium">{error}</span>
            </div>
          )}

          {/* Niche Picker - Show when no active job */}
          {!job && (
            <div className="space-y-8">
              {/* Platform Selector */}
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Select Platform
                  </h2>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => platform.available && setSelectedPlatform(platform.id)}
                      disabled={!platform.available || isSearching}
                      className={`
                        flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200
                        ${selectedPlatform === platform.id
                          ? 'bg-[var(--signal-action-dim)] border-[var(--signal-action)] text-[var(--signal-action)]'
                          : platform.available
                            ? 'bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            : 'bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed'
                        }
                      `}
                    >
                      <span className="text-xl">{platform.icon}</span>
                      <span className="font-medium">{platform.name}</span>
                      {!platform.available && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-deep)] text-[var(--text-muted)]">
                          Soon
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Results Control */}
              <div className="max-w-lg mx-auto">
                <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)]">
                        Scan Depth
                      </label>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {selectedPlatform === 'youtube' ? 'Channels' : 'Profiles'} to analyze per search
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-mono font-bold text-[var(--signal-action)]">
                        {maxResults}
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={10}
                      value={maxResults}
                      onChange={(e) => setMaxResults(parseInt(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--bg-deep)]"
                      style={{
                        background: `linear-gradient(to right, var(--signal-action) 0%, var(--signal-action) ${(maxResults - 10) / 90 * 100}%, var(--bg-deep) ${(maxResults - 10) / 90 * 100}%, var(--bg-deep) 100%)`,
                      }}
                      disabled={isSearching}
                    />
                    <div className="flex justify-between mt-2 text-xs font-mono text-[var(--text-muted)]">
                      <span>10</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--bg-border)] flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Higher depth = more thorough results, longer processing
                  </div>
                </div>
              </div>

              {/* Seed Accounts Input - Instagram Only */}
              {selectedPlatform === 'instagram' && (
                <div className="max-w-lg mx-auto">
                  <div className="bg-[var(--bg-surface)] border border-[var(--signal-action)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-[var(--signal-action-dim)] flex items-center justify-center">
                        <svg className="w-4 h-4 text-[var(--signal-action)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[var(--text-primary)]">
                          Seed Accounts (Recommended)
                        </label>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Find creators similar to accounts you already know
                        </p>
                      </div>
                    </div>

                    <textarea
                      value={seedAccounts}
                      onChange={(e) => setSeedAccounts(e.target.value)}
                      placeholder="Enter Instagram usernames (one per line or comma-separated)&#10;&#10;Example:&#10;@dropshippingcoach&#10;@ecommentor&#10;@shopifyexpert"
                      className="w-full h-28 px-4 py-3 rounded-lg bg-[var(--bg-deep)] border border-[var(--bg-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm font-mono focus:border-[var(--signal-action)] focus:ring-1 focus:ring-[var(--signal-action)] focus:outline-none resize-none"
                      disabled={isSearching}
                    />

                    {/* Start Search Button - shows when seeds are entered */}
                    {seedAccounts.trim().length > 0 && (
                      <button
                        onClick={handleSeedSearch}
                        disabled={isSearching}
                        className="w-full mt-4 py-3 px-4 rounded-lg bg-[var(--signal-action)] text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {isSearching ? 'Searching...' : 'Find Similar Creators'}
                      </button>
                    )}

                    <div className="mt-3 pt-3 border-t border-[var(--bg-border)]">
                      <div className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--signal-action)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>
                          <strong className="text-[var(--text-secondary)]">Pro tip:</strong> Enter 2-5 accounts of known coaches in your niche. The algorithm will find similar creators who Instagram recommends alongside them.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Niche Picker */}
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    Select Your Target Niche
                  </h2>
                  <p className="text-[var(--text-secondary)]">
                    Choose a niche to find qualified creators ready for partnership
                  </p>
                </div>
                <NichePicker onSelectNiche={handleSearch} disabled={isSearching} />
              </div>
            </div>
          )}

          {/* Active Hunt View */}
          {job && (
            <div className="space-y-6">
              {/* Selected Platform & Niche Badge */}
              {selectedNiche && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-[var(--text-muted)]">Target:</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--bg-border)] text-[var(--text-secondary)] font-medium text-sm">
                    {PLATFORMS.find(p => p.id === selectedPlatform)?.icon}
                    {PLATFORMS.find(p => p.id === selectedPlatform)?.name}
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--signal-action-dim)] border border-[var(--signal-action)] text-[var(--signal-action)] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[var(--signal-action)] animate-pulse"></span>
                    {selectedNiche.name}
                  </span>
                </div>
              )}

              {/* Job Status */}
              <JobStatus
                status={job.status}
                progress={job.progress}
                total={job.total}
                keyword={selectedNiche?.name || job.keyword}
                error={job.error}
              />

              {/* Results Table */}
              {creators.length > 0 && jobId && (
                <ResultsTable
                  creators={creators}
                  summary={summary}
                  jobId={jobId}
                  platform={selectedPlatform}
                  onFindMore={handleFindMore}
                  isFindingMore={isFindingMore}
                  jobStatus={job.status}
                />
              )}

              {/* Empty State for Processing */}
              {job.status === 'processing' && creators.length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[var(--signal-action-dim)] mb-6">
                    <div className="w-8 h-8 border-2 border-[var(--signal-action)] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    Hunting for creators...
                  </h3>
                  <p className="text-[var(--text-muted)] max-w-md mx-auto">
                    Scanning YouTube channels in <span className="text-[var(--signal-action)]">{selectedNiche?.name}</span> and analyzing each one with AI
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-6 text-xs font-mono text-[var(--text-muted)]">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--signal-action)] animate-pulse"></div>
                      Searching channels
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--signal-warning)]"></div>
                      AI qualification
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--signal-success)]"></div>
                      Email extraction
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--bg-border)] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
            <span>Creator Hunter v1.0</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal-success)]"></span>
                Systems operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
