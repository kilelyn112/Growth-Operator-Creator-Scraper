'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Campaign {
  id: number;
  name: string;
  status: string;
  offer_description: string;
  target_market: string;
  platform: string;
  max_results_per_niche: number;
  selected_niches: Array<{ id: string; name: string; searchKeyword: string; category?: string }>;
  total_niches: number;
  completed_niches: number;
  total_creators_found: number;
  qualified_creators: number;
  creators_with_email: number;
  active_jobs: Array<{ niche_id: string; job_id: string; status: string }>;
  created_at: string;
}

interface Creator {
  id: number;
  platform: string;
  display_name: string;
  username: string | null;
  profile_url: string;
  followers: number;
  post_count: number;
  total_views: number;
  engagement_rate: number;
  bio: string | null;
  external_url: string | null;
  qualified: boolean;
  qualification_reason: string;
  email: string | null;
  first_name: string | null;
  niche_id: string;
  niche_name: string;
}

interface NicheStats {
  total: number;
  qualified: number;
  withEmail: number;
}

export default function CampaignDashboard() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [byNiche, setByNiche] = useState<Record<string, NicheStats>>({});
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [filter, setFilter] = useState<'all' | 'qualified' | 'email'>('all');
  const [nicheFilter, setNicheFilter] = useState<string>('all');

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${params.id}`);
      const data = await res.json();
      if (data.campaign) {
        setCampaign(data.campaign);
        setCreators(data.results?.creators || []);
        setByNiche(data.results?.byNiche || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Poll when running
  useEffect(() => {
    if (campaign?.status !== 'running') return;
    const interval = setInterval(fetchCampaign, 5000);
    return () => clearInterval(interval);
  }, [campaign?.status, fetchCampaign]);

  async function handleLaunch() {
    setLaunching(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}/launch`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchCampaign();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLaunching(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    await fetch(`/api/campaigns/${params.id}`, { method: 'DELETE' });
    router.push('/campaigns');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return <p className="text-[var(--text-secondary)]">Campaign not found.</p>;
  }

  const progress = campaign.total_niches > 0
    ? Math.round((campaign.completed_niches / campaign.total_niches) * 100)
    : 0;

  // Filter creators
  let filteredCreators = creators;
  if (filter === 'qualified') filteredCreators = filteredCreators.filter(c => c.qualified);
  if (filter === 'email') filteredCreators = filteredCreators.filter(c => c.email);
  if (nicheFilter !== 'all') filteredCreators = filteredCreators.filter(c => c.niche_id === nicheFilter);

  // Unique niches from results for filter dropdown
  const nicheOptions = [...new Set(creators.map(c => c.niche_id))].filter(Boolean);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <a href="/campaigns" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Campaigns
        </a>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-sm text-[var(--text-primary)] font-medium">{campaign.name}</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)} · {campaign.total_niches} niches · {campaign.max_results_per_niche} per niche
          </p>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {launching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  Launch Campaign
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </>
              )}
            </button>
          )}
          {campaign.status === 'completed' && (
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="px-4 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg text-sm hover:bg-[var(--bg-subtle)]"
            >
              Re-run Campaign
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-red-500 border border-red-200 rounded-lg text-sm hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Found" value={campaign.total_creators_found} />
        <StatCard label="Qualified" value={campaign.qualified_creators} accent />
        <StatCard label="With Email" value={campaign.creators_with_email} />
        <StatCard label="Niches Done" value={`${campaign.completed_niches}/${campaign.total_niches}`} />
      </div>

      {/* Progress bar when running */}
      {campaign.status === 'running' && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Campaign Running</span>
            </div>
            <span className="text-sm text-[var(--text-secondary)]">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Per-niche job status */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(campaign.active_jobs || []).map(job => {
              const niche = campaign.selected_niches.find(n => n.id === job.niche_id);
              return (
                <span
                  key={job.niche_id}
                  className={`px-2 py-1 rounded text-[11px] font-medium ${
                    job.status === 'completed' ? 'bg-green-100 text-green-700' :
                    job.status === 'failed' ? 'bg-red-100 text-red-700' :
                    job.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  {niche?.name || job.niche_id}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Niche Breakdown */}
      {Object.keys(byNiche).length > 0 && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-5 mb-8">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Niche Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(byNiche).map(([nicheId, stats]) => {
              const niche = campaign.selected_niches.find(n => n.id === nicheId);
              return (
                <button
                  key={nicheId}
                  onClick={() => setNicheFilter(nicheFilter === nicheId ? 'all' : nicheId)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    nicheFilter === nicheId
                      ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                      : 'border-[var(--border-default)] hover:border-[var(--border-subtle)]'
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{niche?.name || nicheId}</p>
                  <div className="flex gap-3 mt-1 text-xs text-[var(--text-muted)]">
                    <span>{stats.total} found</span>
                    <span>{stats.qualified} qual</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Table */}
      {creators.length > 0 && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Creators ({filteredCreators.length})
            </h3>
            <div className="flex gap-2">
              {(['all', 'qualified', 'email'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'qualified' ? 'Qualified' : 'With Email'}
                </button>
              ))}
              {nicheFilter !== 'all' && (
                <button
                  onClick={() => setNicheFilter('all')}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--accent-light)] text-[var(--accent)]"
                >
                  Clear niche filter
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-subtle)] text-left">
                  <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Creator</th>
                  <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Niche</th>
                  <th className="px-4 py-3 font-medium text-[var(--text-secondary)] text-right">Followers</th>
                  <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Email</th>
                  <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Status</th>
                  <th className="px-4 py-3 font-medium text-[var(--text-secondary)]"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCreators.slice(0, 100).map(creator => (
                  <tr key={creator.id} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{creator.display_name}</p>
                        {creator.username && (
                          <p className="text-xs text-[var(--text-muted)]">@{creator.username}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                        {creator.niche_name || creator.niche_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                      {formatNumber(creator.followers)}
                    </td>
                    <td className="px-4 py-3">
                      {creator.email ? (
                        <span className="text-xs text-[var(--accent)]">{creator.email}</span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {creator.qualified ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Qualified</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Unqualified</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={creator.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] text-xs hover:underline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCreators.length > 100 && (
            <div className="p-4 text-center text-sm text-[var(--text-muted)]">
              Showing first 100 of {filteredCreators.length} creators
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {campaign.status === 'draft' && creators.length === 0 && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-12 text-center">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Ready to launch</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            This campaign will search {campaign.total_niches} niches on {campaign.platform} for creators matching your offer.
          </p>
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="px-6 py-3 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {launching ? 'Launching...' : 'Launch Campaign'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============ HELPERS ============

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    running: 'bg-blue-100 text-blue-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-4">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
        {value}
      </p>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}
