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
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
            ClickFunnels
          </span>
        );
      case 'gohighlevel':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600 border border-purple-200">
            GoHighLevel
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)]">
            Other
          </span>
        );
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 70) return 'text-[var(--status-success)]';
    if (score >= 50) return 'text-[var(--status-warning)]';
    return 'text-[var(--status-error)]';
  };

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-sm)]">
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-[var(--text-primary)]">
            {summary.total}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Total Found</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-[var(--status-success)]">
            {summary.withEmail}
          </div>
          <div className="text-xs text-[var(--text-muted)]">With Email</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-blue-600">
            {summary.clickfunnels}
          </div>
          <div className="text-xs text-[var(--text-muted)]">ClickFunnels</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-purple-600">
            {summary.gohighlevel}
          </div>
          <div className="text-xs text-[var(--text-muted)]">GoHighLevel</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-[var(--status-warning)]">
            {summary.avgQuality}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Avg Quality</div>
        </div>
        <div className="text-center">
          <a
            href={`/api/funnel/export/${jobId}`}
            className="btn-accent"
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
              ? 'bg-[var(--status-success-light)] text-[var(--status-success)] border border-[var(--status-success)]'
              : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--accent)]'
          }`}
        >
          With Email Only
        </button>
        <button
          onClick={() => setFilterPlatform(filterPlatform === 'clickfunnels' ? null : 'clickfunnels')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterPlatform === 'clickfunnels'
              ? 'bg-blue-50 text-blue-600 border border-blue-300'
              : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-blue-400'
          }`}
        >
          ClickFunnels
        </button>
        <button
          onClick={() => setFilterPlatform(filterPlatform === 'gohighlevel' ? null : 'gohighlevel')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterPlatform === 'gohighlevel'
              ? 'bg-purple-50 text-purple-600 border border-purple-300'
              : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-purple-400'
          }`}
        >
          GoHighLevel
        </button>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-sm)]">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
              <th
                onClick={() => handleSort('platform')}
                className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)]"
              >
                Platform {sortKey === 'platform' && (sortAsc ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('domain')}
                className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)]"
              >
                Domain {sortKey === 'domain' && (sortAsc ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('quality_score')}
                className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)]"
              >
                Quality {sortKey === 'quality_score' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Owner Info
              </th>
              <th
                onClick={() => handleSort('owner_email')}
                className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)]"
              >
                Email {sortKey === 'owner_email' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Issues
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {sorted.map((funnel, index) => (
              <tr
                key={funnel.id}
                className={`
                  transition-colors hover:bg-[var(--bg-subtle)]
                  ${funnel.owner_email ? 'bg-[var(--status-success-light)]' : 'bg-[var(--bg-primary)]'}
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
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline font-mono text-sm"
                  >
                    {funnel.domain}
                  </a>
                  {funnel.page_title && (
                    <div className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
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
                          className="text-pink-500 hover:text-pink-600 text-xs"
                        >
                          @{funnel.owner_instagram}
                        </a>
                      )}
                      {funnel.owner_youtube && (
                        <a
                          href={`https://youtube.com/@${funnel.owner_youtube}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:text-red-600 text-xs"
                        >
                          YT
                        </a>
                      )}
                      {funnel.owner_x && (
                        <a
                          href={`https://x.com/${funnel.owner_x}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
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
                      className="text-[var(--status-success)] hover:underline text-sm font-mono"
                    >
                      {funnel.owner_email}
                    </a>
                  ) : (
                    <span className="text-[var(--text-muted)] text-sm">—</span>
                  )}
                  {funnel.owner_phone && (
                    <div className="text-xs text-[var(--text-secondary)]">{funnel.owner_phone}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {funnel.issues && (
                    <div className="text-xs text-[var(--status-warning)]">
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
        <div className="text-center py-12 text-[var(--text-muted)]">
          {jobStatus === 'processing' ? 'Searching for funnels...' : 'No funnels found matching filters'}
        </div>
      )}
    </div>
  );
}
