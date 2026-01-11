'use client';

import { useState, useCallback } from 'react';
import NichePicker from '@/components/NichePicker';
import JobStatus from '@/components/JobStatus';
import ResultsTable from '@/components/ResultsTable';
import FunnelResults from '@/components/FunnelResults';
import { Niche } from '@/lib/niches';
import { Funnel } from '@/lib/db';

type AppMode = 'creator-hunter' | 'funnel-finder';

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
  channelId?: string;
  channelName?: string;
  channelUrl?: string;
  subscribers?: number;
  videoCount?: number;
  fromCache?: boolean;
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

interface FunnelJob {
  id: string;
  niche: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  error?: string;
}

interface FunnelSummary {
  total: number;
  withEmail: number;
  clickfunnels: number;
  gohighlevel: number;
  other: number;
  avgQuality: number;
}

const PLATFORMS: { id: Platform; name: string; available: boolean }[] = [
  { id: 'youtube', name: 'YouTube', available: true },
  { id: 'instagram', name: 'Instagram', available: true },
  { id: 'x', name: 'X (Twitter)', available: true },
];

export default function Home() {
  const [appMode, setAppMode] = useState<AppMode>('creator-hunter');

  // Creator Hunter state
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [cachedCreators, setCachedCreators] = useState<Creator[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, qualified: 0, withEmail: 0 });
  const [isSearching, setIsSearching] = useState(false);
  const [isFindingMore, setIsFindingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('youtube');
  const [maxResults, setMaxResults] = useState(50);
  const [seedAccounts, setSeedAccounts] = useState('');

  // Funnel Finder state
  const [funnelJobId, setFunnelJobId] = useState<string | null>(null);
  const [funnelJob, setFunnelJob] = useState<FunnelJob | null>(null);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [funnelSummary, setFunnelSummary] = useState<FunnelSummary>({
    total: 0, withEmail: 0, clickfunnels: 0, gohighlevel: 0, other: 0, avgQuality: 0
  });
  const [funnelNiche, setFunnelNiche] = useState('');
  const [isFunnelSearching, setIsFunnelSearching] = useState(false);
  const [funnelError, setFunnelError] = useState<string | null>(null);

  const pollJob = useCallback(async (id: string, cached: Creator[] = []) => {
    try {
      const response = await fetch(`/api/search/${id}`);
      if (response.status === 404) {
        setJob(null);
        setJobId(null);
        setCreators([]);
        setCachedCreators([]);
        setSummary({ total: 0, qualified: 0, withEmail: 0 });
        setIsSearching(false);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch job status');

      const data = await response.json();
      setJob(data.job);

      const newCreators = data.creators as Creator[];
      const newPlatformIds = new Set(newCreators.map((c: Creator) => c.platformId));
      const uniqueCached = cached.filter((c: Creator) => !newPlatformIds.has(c.platformId));
      const mergedCreators = [...uniqueCached, ...newCreators];

      setCreators(mergedCreators);
      setSummary({
        total: mergedCreators.length,
        qualified: mergedCreators.filter((c: Creator) => c.qualified).length,
        withEmail: mergedCreators.filter((c: Creator) => c.email).length,
      });

      if (data.job.status === 'pending' || data.job.status === 'processing') {
        setTimeout(() => pollJob(id, cached), 2000);
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
    setCachedCreators([]);
    setSummary({ total: 0, qualified: 0, withEmail: 0 });
    setSelectedNiche(niche);

    const keyword = niche.searchKeywords[0];

    try {
      const requestBody: { keyword: string; maxResults: number; platform: Platform; seedAccounts?: string } = {
        keyword,
        maxResults,
        platform: selectedPlatform,
      };

      if (selectedPlatform === 'instagram' && seedAccounts.trim()) {
        requestBody.seedAccounts = seedAccounts.trim();
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('Failed to start search');

      const data = await response.json();
      setJobId(data.jobId);

      let cached: Creator[] = [];
      if (data.cachedCreators && data.cachedCreators.length > 0) {
        cached = data.cachedCreators;
        setCachedCreators(cached);
        setCreators(cached);
        setSummary({
          total: cached.length,
          qualified: cached.filter((c: Creator) => c.qualified).length,
          withEmail: cached.filter((c: Creator) => c.email).length,
        });
        setJob({
          id: data.jobId,
          keyword: keyword,
          platform: selectedPlatform,
          status: 'processing',
          progress: 0,
          total: data.cachedCount || 0,
        });
      }

      pollJob(data.jobId, cached);
    } catch (err) {
      console.error('Error starting search:', err);
      setError('Failed to start search. Please try again.');
      setIsSearching(false);
    }
  };

  const handleSeedSearch = async () => {
    if (!seedAccounts.trim()) return;

    setIsSearching(true);
    setError(null);
    setJob(null);
    setCreators([]);
    setCachedCreators([]);
    setSummary({ total: 0, qualified: 0, withEmail: 0 });
    setSelectedNiche(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: 'similar creators',
          maxResults,
          platform: 'instagram',
          seedAccounts: seedAccounts.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to start search');

      const data = await response.json();
      setJobId(data.jobId);

      let cached: Creator[] = [];
      if (data.cachedCreators && data.cachedCreators.length > 0) {
        cached = data.cachedCreators;
        setCachedCreators(cached);
        setCreators(cached);
        setSummary({
          total: cached.length,
          qualified: cached.filter((c: Creator) => c.qualified).length,
          withEmail: cached.filter((c: Creator) => c.email).length,
        });
        setJob({
          id: data.jobId,
          keyword: 'similar creators',
          platform: 'instagram',
          status: 'processing',
          progress: 0,
          total: data.cachedCount || 0,
        });
      }

      pollJob(data.jobId, cached);
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
    setCachedCreators([]);
    setSummary({ total: 0, qualified: 0, withEmail: 0 });
    setError(null);
    setSelectedNiche(null);
  };

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

      if (!response.ok) throw new Error('Failed to continue search');

      setIsSearching(true);
      pollJob(jobId, creators);
    } catch (err) {
      console.error('Error continuing search:', err);
      setError('Failed to find more creators. Please try again.');
    } finally {
      setIsFindingMore(false);
    }
  };

  // Funnel Finder Functions
  const pollFunnelJob = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/funnel/search/${id}`);
      if (response.status === 404) {
        setFunnelJob(null);
        setFunnelJobId(null);
        setFunnels([]);
        setFunnelSummary({ total: 0, withEmail: 0, clickfunnels: 0, gohighlevel: 0, other: 0, avgQuality: 0 });
        setIsFunnelSearching(false);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch funnel job status');

      const data = await response.json();
      setFunnelJob(data.job);
      setFunnels(data.funnels);
      setFunnelSummary(data.summary);

      if (data.job.status === 'pending' || data.job.status === 'processing') {
        setTimeout(() => pollFunnelJob(id), 2000);
      } else {
        setIsFunnelSearching(false);
      }
    } catch (err) {
      console.error('Error polling funnel job:', err);
      setFunnelError('Failed to fetch job status');
      setIsFunnelSearching(false);
    }
  }, []);

  const handleFunnelSearch = async () => {
    if (!funnelNiche.trim()) return;

    setIsFunnelSearching(true);
    setFunnelError(null);
    setFunnelJob(null);
    setFunnels([]);
    setFunnelSummary({ total: 0, withEmail: 0, clickfunnels: 0, gohighlevel: 0, other: 0, avgQuality: 0 });

    try {
      const response = await fetch('/api/funnel/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: funnelNiche.trim(), maxResults: 50 }),
      });

      if (!response.ok) throw new Error('Failed to start funnel search');

      const data = await response.json();
      setFunnelJobId(data.jobId);

      if (data.cachedFunnels && data.cachedFunnels.length > 0) {
        const cachedAsFunnels = data.cachedFunnels.map((f: Record<string, unknown>) => ({
          id: f.id,
          funnel_url: f.funnelUrl,
          domain: f.domain,
          platform: f.platform,
          niche: f.niche,
          quality_score: f.qualityScore,
          issues: f.issues,
          has_mobile_viewport: f.hasMobileViewport,
          has_clear_cta: f.hasClearCta,
          has_testimonials: f.hasTestimonials,
          has_trust_badges: f.hasTrustBadges,
          page_load_time: f.pageLoadTime,
          owner_name: f.ownerName,
          owner_email: f.ownerEmail,
          owner_phone: f.ownerPhone,
          owner_instagram: f.ownerInstagram,
          owner_youtube: f.ownerYoutube,
          owner_x: f.ownerX,
          owner_linkedin: f.ownerLinkedin,
          owner_website: f.ownerWebsite,
          discovery_source: f.discoverySource,
          search_query: f.searchQuery,
          page_title: f.pageTitle,
          page_description: f.pageDescription,
          created_at: f.createdAt,
          updated_at: f.updatedAt,
        }));
        setFunnels(cachedAsFunnels);
        setFunnelSummary({
          total: cachedAsFunnels.length,
          withEmail: cachedAsFunnels.filter((f: Funnel) => f.owner_email).length,
          clickfunnels: cachedAsFunnels.filter((f: Funnel) => f.platform === 'clickfunnels').length,
          gohighlevel: cachedAsFunnels.filter((f: Funnel) => f.platform === 'gohighlevel').length,
          other: cachedAsFunnels.filter((f: Funnel) => f.platform === 'other').length,
          avgQuality: cachedAsFunnels.length > 0
            ? Math.round(cachedAsFunnels.reduce((acc: number, f: Funnel) => acc + f.quality_score, 0) / cachedAsFunnels.length)
            : 0,
        });
        setFunnelJob({
          id: data.jobId,
          niche: funnelNiche.trim(),
          status: 'processing',
          progress: 0,
          total: data.cachedCount || 0,
        });
      }

      pollFunnelJob(data.jobId);
    } catch (err) {
      console.error('Error starting funnel search:', err);
      setFunnelError('Failed to start search. Please try again.');
      setIsFunnelSearching(false);
    }
  };

  const handleNewFunnelSearch = () => {
    setFunnelJobId(null);
    setFunnelJob(null);
    setFunnels([]);
    setFunnelSummary({ total: 0, withEmail: 0, clickfunnels: 0, gohighlevel: 0, other: 0, avgQuality: 0 });
    setFunnelError(null);
    setFunnelNiche('');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div>
              <h1 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
                creatorpairing.com
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {appMode === 'creator-hunter'
                  ? 'Find qualified creators to partner with'
                  : 'Discover ClickFunnels & GoHighLevel pages'}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-[var(--bg-subtle)] rounded-lg">
              <button
                onClick={() => setAppMode('creator-hunter')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  appMode === 'creator-hunter'
                    ? 'bg-[var(--text-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Creators
              </button>
              <button
                onClick={() => setAppMode('funnel-finder')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  appMode === 'funnel-finder'
                    ? 'bg-[var(--text-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Funnels
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {appMode === 'creator-hunter' && job && (
                <button onClick={handleNewSearch} className="btn-secondary text-sm">
                  New Search
                </button>
              )}
              {appMode === 'funnel-finder' && funnelJob && (
                <button onClick={handleNewFunnelSearch} className="btn-secondary text-sm">
                  New Search
                </button>
              )}

              {/* Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-subtle)]">
                <div className={`w-2 h-2 rounded-full ${
                  (appMode === 'creator-hunter' && isSearching) || (appMode === 'funnel-finder' && isFunnelSearching)
                    ? 'bg-[var(--status-warning)] animate-pulse'
                    : 'bg-[var(--status-success)]'
                }`} />
                <span className="text-xs text-[var(--text-secondary)]">
                  {(appMode === 'creator-hunter' && isSearching) || (appMode === 'funnel-finder' && isFunnelSearching)
                    ? 'Scanning...'
                    : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* ===== FUNNEL FINDER MODE ===== */}
        {appMode === 'funnel-finder' && (
          <>
            {funnelError && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--status-error-light)] border border-[var(--status-error)]">
                <span className="text-[var(--status-error)] text-sm">{funnelError}</span>
              </div>
            )}

            {!funnelJob && (
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="font-fancy text-3xl font-semibold text-[var(--text-primary)] mb-3">
                    Find Funnel Pages
                  </h2>
                  <p className="text-[var(--text-secondary)]">
                    Discover ClickFunnels and GoHighLevel pages in any niche
                  </p>
                </div>

                <div className="card p-6">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Target Niche
                  </label>
                  <input
                    type="text"
                    value={funnelNiche}
                    onChange={(e) => setFunnelNiche(e.target.value)}
                    placeholder="e.g., fitness coach, real estate, trading"
                    className="w-full"
                    disabled={isFunnelSearching}
                    onKeyDown={(e) => e.key === 'Enter' && handleFunnelSearch()}
                  />

                  <button
                    onClick={handleFunnelSearch}
                    disabled={isFunnelSearching || !funnelNiche.trim()}
                    className="btn-primary w-full mt-4"
                  >
                    {isFunnelSearching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      'Find Funnels'
                    )}
                  </button>
                </div>
              </div>
            )}

            {funnelJob && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--text-secondary)]">Searching:</span>
                  <span className="badge badge-accent">{funnelJob.niche}</span>
                </div>

                <JobStatus
                  status={funnelJob.status}
                  progress={funnelJob.progress}
                  total={funnelJob.total}
                  keyword={funnelJob.niche}
                  error={funnelJob.error}
                />

                {funnels.length > 0 && funnelJobId && (
                  <FunnelResults
                    funnels={funnels}
                    summary={funnelSummary}
                    jobId={funnelJobId}
                    jobStatus={funnelJob.status}
                  />
                )}

                {funnelJob.status === 'processing' && funnels.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)]">
                      Scanning for funnel pages...
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== CREATOR HUNTER MODE ===== */}
        {appMode === 'creator-hunter' && (
          <>
            {error && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--status-error-light)] border border-[var(--status-error)]">
                <span className="text-[var(--status-error)] text-sm">{error}</span>
              </div>
            )}

            {!job && (
              <div className="space-y-10">
                {/* Platform Selector */}
                <div className="max-w-2xl mx-auto text-center">
                  <h2 className="font-fancy text-3xl font-semibold text-[var(--text-primary)] mb-3">
                    Find Creators
                  </h2>
                  <p className="text-[var(--text-secondary)] mb-6">
                    Select a platform and niche to discover qualified creators
                  </p>

                  <div className="flex justify-center gap-4">
                    {PLATFORMS.map((platform) => {
                      const PlatformIcon = () => {
                        switch (platform.id) {
                          case 'youtube':
                            return (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                            );
                          case 'instagram':
                            return (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            );
                          case 'x':
                            return (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                              </svg>
                            );
                          default:
                            return null;
                        }
                      };
                      return (
                        <button
                          key={platform.id}
                          onClick={() => platform.available && setSelectedPlatform(platform.id)}
                          disabled={!platform.available || isSearching}
                          className={`
                            group relative flex items-center gap-3 px-8 py-4 rounded-2xl border-2 font-medium transition-all duration-300
                            transform hover:-translate-y-1 hover:shadow-lg
                            ${selectedPlatform === platform.id
                              ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-white shadow-lg'
                              : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                            }
                            ${!platform.available ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <span className={`transition-transform group-hover:scale-110`}>
                            <PlatformIcon />
                          </span>
                          {platform.name}
                          {selectedPlatform === platform.id && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent)] rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scan Depth */}
                <div className="max-w-lg mx-auto">
                  <div className="bg-[var(--bg-primary)] border-2 border-[var(--border-default)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <label className="block text-base font-semibold text-[var(--text-primary)]">
                          How deep should we hunt?
                        </label>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                          More profiles = more opportunities
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-4xl font-bold text-[var(--accent)] tabular-nums">
                          {maxResults}
                        </span>
                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">profiles</div>
                      </div>
                    </div>

                    <div className="relative py-2">
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={10}
                        value={maxResults}
                        onChange={(e) => setMaxResults(parseInt(e.target.value))}
                        className="w-full h-3 appearance-none cursor-pointer rounded-full"
                        style={{
                          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${(maxResults - 10) / 90 * 100}%, var(--border-default) ${(maxResults - 10) / 90 * 100}%, var(--border-default) 100%)`,
                        }}
                        disabled={isSearching}
                      />
                    </div>

                    {/* Quick presets */}
                    <div className="flex gap-2 mt-6">
                      {[
                        { value: 20, label: 'Quick', desc: '~2 min' },
                        { value: 50, label: 'Standard', desc: '~5 min' },
                        { value: 100, label: 'Deep', desc: '~10 min' },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => setMaxResults(preset.value)}
                          disabled={isSearching}
                          className={`
                            flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
                            ${maxResults === preset.value
                              ? 'bg-[var(--accent)] text-white shadow-sm'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]'
                            }
                          `}
                        >
                          <div>{preset.label}</div>
                          <div className={`text-xs ${maxResults === preset.value ? 'text-emerald-100' : 'text-[var(--text-muted)]'}`}>
                            {preset.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Seed Accounts - Instagram Only */}
                {selectedPlatform === 'instagram' && (
                  <div className="max-w-md mx-auto">
                    <div className="card p-5 border-[var(--accent)]">
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Seed Accounts
                      </label>
                      <p className="text-xs text-[var(--text-muted)] mb-3">
                        Find creators similar to accounts you already know
                      </p>

                      <textarea
                        value={seedAccounts}
                        onChange={(e) => setSeedAccounts(e.target.value)}
                        placeholder="@username1&#10;@username2&#10;@username3"
                        className="w-full h-24 resize-none"
                        disabled={isSearching}
                      />

                      {seedAccounts.trim().length > 0 && (
                        <button
                          onClick={handleSeedSearch}
                          disabled={isSearching}
                          className="btn-accent w-full mt-3"
                        >
                          Find Similar Creators
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Niche Picker */}
                <div>
                  <div className="text-center mb-6">
                    <h3 className="font-fancy text-xl font-semibold text-[var(--text-primary)]">
                      Select a niche
                    </h3>
                  </div>
                  <NichePicker onSelectNiche={handleSearch} disabled={isSearching} />
                </div>
              </div>
            )}

            {/* Active Job View */}
            {job && (
              <div className="space-y-6">
                {selectedNiche && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">Target:</span>
                    <span className="badge badge-accent">{selectedNiche.name}</span>
                    <span className="text-sm text-[var(--text-muted)]">on {PLATFORMS.find(p => p.id === selectedPlatform)?.name}</span>
                  </div>
                )}

                <JobStatus
                  status={job.status}
                  progress={job.progress}
                  total={job.total}
                  keyword={selectedNiche?.name || job.keyword}
                  error={job.error}
                />

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

                {job.status === 'processing' && creators.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)]">
                      Searching for creators in <span className="font-medium text-[var(--text-primary)]">{selectedNiche?.name}</span>...
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-default)] mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
            <span>
              Powered by{' '}
              <a href="https://growthoperator.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                growthoperator.com
              </a>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" />
              Systems operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
