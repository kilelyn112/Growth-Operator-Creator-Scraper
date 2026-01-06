'use client';

import { useState } from 'react';
import { Funnel } from '@/lib/db';

interface FunnelResultsProps {
  funnels: Funnel[];
  summary: {
    total: number;
    withEmail: number;
    clickfunnels: number;
    gohighlevel: number;
    other: number;
    avgQuality: number;
  };
  jobId: string;
  jobStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

type SortKey = 'quality_score' | 'platform' | 'owner_email' | 'domain';

export default function FunnelResults({ funnels, summary, jobId, jobStatus }: FunnelResultsProps) {
  const [sortKey, setSortKey] = useState<SortKey>('quality_score');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterWithEmail, setFilterWithEmail] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);

  // Filter funnels
  let filtered = funnels;
  if (filterWithEmail) {
    filtered = filtered.filter(f => f.owner_email);
  }
  if (filterPlatform) {
    filtered = filtered.filter(f => f.platform === filterPlatform);
  }

  // Sort funnels
  const sorted = [...filtered].sort((a, b) => {
    let aVal: string | number = a[sortKey] ?? '';
    let bVal: string | number = b[sortKey] ?? '';

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'clickfunnels':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
            ClickFunnels
          </span>
        );
      case 'gohighlevel':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
            GoHighLevel
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
            Other
          </span>
        );
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 70) return 'text-[var(--signal-success)]';
    if (score >= 50) return 'text-[var(--signal-warning)]';
    return 'text-[var(--signal-danger)]';
  };

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--bg-border)]">
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-[var(--text-primary)]">
            {summary.total}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">Total Found</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-[var(--signal-success)]">
            {summary.withEmail}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">With Email</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-blue-400">
            {summary.clickfunnels}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">ClickFunnels</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-purple-400">
            {summary.gohighlevel}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">GoHighLevel</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-[var(--signal-warning)]">
            {summary.avgQuality}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">Avg Quality</div>
        </div>
        <div className="text-center">
          <a
            href={`/api/funnel/export/${jobId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--signal-action)] hover:bg-[var(--signal-action)]/80 text-black font-medium rounded-lg transition-colors"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterWithEmail(!filterWithEmail)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterWithEmail
              ? 'bg-[var(--signal-success)]/20 text-[var(--signal-success)] border border-[var(--signal-success)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--bg-border)] hover:border-[var(--signal-action)]'
          }`}
        >
          With Email Only
        </button>
        <button
          onClick={() => setFilterPlatform(filterPlatform === 'clickfunnels' ? null : 'clickfunnels')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterPlatform === 'clickfunnels'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--bg-border)] hover:border-blue-500'
          }`}
        >
          ClickFunnels
        </button>
        <button
          onClick={() => setFilterPlatform(filterPlatform === 'gohighlevel' ? null : 'gohighlevel')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterPlatform === 'gohighlevel'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--bg-border)] hover:border-purple-500'
          }`}
        >
          GoHighLevel
        </button>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--bg-border)]">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-surface)] border-b border-[var(--bg-border)]">
              <th
                onClick={() => handleSort('platform')}
                className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)]"
              >
                Platform {sortKey === 'platform' && (sortAsc ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('domain')}
                className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)]"
              >
                Domain {sortKey === 'domain' && (sortAsc ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('quality_score')}
                className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)]"
              >
                Quality {sortKey === 'quality_score' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Owner Info
              </th>
              <th
                onClick={() => handleSort('owner_email')}
                className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)]"
              >
                Email {sortKey === 'owner_email' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Issues
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--bg-border)]">
            {sorted.map((funnel, index) => (
              <tr
                key={funnel.id}
                className={`
                  transition-colors hover:bg-[var(--bg-elevated)]
                  ${funnel.owner_email ? 'bg-[var(--signal-success)]/5' : 'bg-[var(--bg-base)]'}
                `}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <td className="px-4 py-3">
                  {getPlatformBadge(funnel.platform)}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={funnel.funnel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--signal-action)] hover:underline font-mono text-sm"
                  >
                    {funnel.domain}
                  </a>
                  {funnel.page_title && (
                    <div className="text-xs text-[var(--text-tertiary)] truncate max-w-[200px]">
                      {funnel.page_title}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-mono font-bold ${getQualityColor(funnel.quality_score)}`}>
                    {funnel.quality_score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {funnel.owner_name && (
                      <div className="text-sm text-[var(--text-primary)]">{funnel.owner_name}</div>
                    )}
                    <div className="flex gap-2">
                      {funnel.owner_instagram && (
                        <a
                          href={`https://instagram.com/${funnel.owner_instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-400 hover:text-pink-300 text-xs"
                        >
                          @{funnel.owner_instagram}
                        </a>
                      )}
                      {funnel.owner_youtube && (
                        <a
                          href={`https://youtube.com/@${funnel.owner_youtube}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          YT
                        </a>
                      )}
                      {funnel.owner_x && (
                        <a
                          href={`https://x.com/${funnel.owner_x}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-300 text-xs"
                        >
                          @{funnel.owner_x}
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {funnel.owner_email ? (
                    <a
                      href={`mailto:${funnel.owner_email}`}
                      className="text-[var(--signal-success)] hover:underline text-sm font-mono"
                    >
                      {funnel.owner_email}
                    </a>
                  ) : (
                    <span className="text-[var(--text-tertiary)] text-sm">-</span>
                  )}
                  {funnel.owner_phone && (
                    <div className="text-xs text-[var(--text-secondary)]">{funnel.owner_phone}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {funnel.issues && (
                    <div className="text-xs text-[var(--signal-warning)]">
                      {JSON.parse(funnel.issues).slice(0, 2).join(', ')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          {jobStatus === 'processing' ? 'Searching for funnels...' : 'No funnels found matching filters'}
        </div>
      )}
    </div>
  );
}
