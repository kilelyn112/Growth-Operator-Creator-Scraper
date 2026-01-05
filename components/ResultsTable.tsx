'use client';

import { useState } from 'react';

type Platform = 'youtube' | 'instagram' | 'x' | 'tiktok' | 'linkedin' | 'skool' | 'substack';

interface Creator {
  id: number;
  platform?: Platform;
  platformId?: string;
  username?: string | null;
  displayName?: string;
  profileUrl?: string;
  followers?: number;
  following?: number;
  postCount?: number;
  totalViews?: number;
  engagementRate?: number;
  bio?: string | null;
  externalUrl?: string | null;
  qualified: boolean;
  qualificationReason: string;
  email: string | null;
  firstName: string | null;
  channelId?: string;
  channelName?: string;
  channelUrl?: string;
  subscribers?: number;
  videoCount?: number;
}

interface Summary {
  total: number;
  qualified: number;
  withEmail: number;
}

interface ResultsTableProps {
  creators: Creator[];
  summary: Summary;
  jobId: string;
  showAll?: boolean;
  platform?: Platform;
  onFindMore?: () => void;
  isFindingMore?: boolean;
  jobStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

type SortField = 'displayName' | 'followers' | 'postCount' | 'qualified';
type SortDirection = 'asc' | 'desc';

const PLATFORM_CONFIG: Record<Platform, { icon: string; name: string; followersLabel: string; postsLabel: string }> = {
  youtube: { icon: '📺', name: 'YouTube', followersLabel: 'Subs', postsLabel: 'Videos' },
  instagram: { icon: '📸', name: 'Instagram', followersLabel: 'Followers', postsLabel: 'Posts' },
  x: { icon: '𝕏', name: 'X', followersLabel: 'Followers', postsLabel: 'Posts' },
  tiktok: { icon: '🎵', name: 'TikTok', followersLabel: 'Followers', postsLabel: 'Videos' },
  linkedin: { icon: '💼', name: 'LinkedIn', followersLabel: 'Connections', postsLabel: 'Posts' },
  skool: { icon: '🎓', name: 'Skool', followersLabel: 'Members', postsLabel: 'Posts' },
  substack: { icon: '📝', name: 'Substack', followersLabel: 'Subscribers', postsLabel: 'Posts' },
};

export default function ResultsTable({ creators, summary, jobId, platform = 'youtube', onFindMore, isFindingMore, jobStatus }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('followers');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterQualified, setFilterQualified] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const config = PLATFORM_CONFIG[platform];

  const getDisplayName = (c: Creator) => {
    if (c.username && (!c.displayName || c.displayName === 'Unknown')) {
      return `@${c.username}`;
    }
    return c.displayName || c.channelName || 'Unknown';
  };

  const getProfileUrl = (c: Creator) => {
    if (c.profileUrl) return c.profileUrl;
    if (c.channelUrl) return c.channelUrl;
    if (c.username) return `https://instagram.com/${c.username}`;
    return '#';
  };

  const getFollowers = (c: Creator) => c.followers || c.subscribers || 0;
  const getPostCount = (c: Creator) => c.postCount || c.videoCount || 0;
  const getUsername = (c: Creator) => c.username || null;

  const filteredCreators = filterQualified
    ? creators.filter((c) => c.qualified)
    : creators;

  const sortedCreators = [...filteredCreators].sort((a, b) => {
    let aVal: string | number | boolean;
    let bVal: string | number | boolean;

    switch (sortField) {
      case 'displayName':
        aVal = getDisplayName(a).toLowerCase();
        bVal = getDisplayName(b).toLowerCase();
        break;
      case 'followers':
        aVal = getFollowers(a);
        bVal = getFollowers(b);
        break;
      case 'postCount':
        aVal = getPostCount(a);
        bVal = getPostCount(b);
        break;
      case 'qualified':
        aVal = a.qualified;
        bVal = b.qualified;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-[var(--text-muted)] ml-1 opacity-50">⇅</span>;
    }
    return (
      <span className="ml-1 text-[var(--signal-action)]">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const isGoldMoment = (creator: Creator) => creator.qualified && creator.email;

  const getPlatformIcon = (c: Creator) => {
    const creatorPlatform = c.platform || platform;
    return PLATFORM_CONFIG[creatorPlatform]?.icon || '📺';
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-xl overflow-hidden">
      {/* Summary Bar */}
      <div className="px-6 py-4 border-b border-[var(--bg-border)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">Processed</span>
            <span className="text-2xl font-mono font-bold text-[var(--text-primary)]">{summary.total}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">Qualified</span>
            <span className="text-2xl font-mono font-bold text-[var(--signal-success)]">{summary.qualified}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">With Email</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-[var(--accent-gold)]">{summary.withEmail}</span>
              {summary.withEmail > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-[rgba(251,191,36,0.15)] text-[var(--accent-gold)] font-mono">TARGETS</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setFilterQualified(!filterQualified)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-150 text-sm font-medium ${
              filterQualified
                ? 'bg-[var(--signal-success-dim)] border-[var(--signal-success)] text-[var(--signal-success)]'
                : 'bg-[var(--bg-elevated)] border-[var(--bg-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
            }`}
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
              filterQualified ? 'bg-[var(--signal-success)] border-[var(--signal-success)]' : 'border-[var(--text-muted)]'
            }`}>
              {filterQualified && (
                <svg className="w-3 h-3 text-[var(--bg-deep)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            Qualified only
          </button>

          <a
            href={`/api/export/${jobId}`}
            download
            className="group flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--signal-action)] text-[var(--bg-deep)] font-semibold text-sm hover:brightness-110 transition-all duration-150"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[var(--bg-elevated)]">
              <th onClick={() => handleSort('displayName')} className="px-6 py-3 text-left text-xs font-mono font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
                {platform === 'youtube' ? 'Channel' : 'Creator'} <SortIcon field="displayName" />
              </th>
              <th onClick={() => handleSort('followers')} className="px-6 py-3 text-right text-xs font-mono font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
                {config.followersLabel} <SortIcon field="followers" />
              </th>
              <th onClick={() => handleSort('postCount')} className="px-6 py-3 text-right text-xs font-mono font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
                {config.postsLabel} <SortIcon field="postCount" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-mono font-medium text-[var(--text-muted)] uppercase tracking-wider">Email</th>
              <th onClick={() => handleSort('qualified')} className="px-6 py-3 text-center text-xs font-mono font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
                Status <SortIcon field="qualified" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-mono font-medium text-[var(--text-muted)] uppercase tracking-wider">Analysis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--bg-border)]">
            {sortedCreators.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="text-[var(--text-muted)]">
                    <div className="text-4xl mb-2">◇</div>
                    <div className="font-medium">No creators match current filters</div>
                    <div className="text-sm mt-1">Try toggling the "Qualified only" filter</div>
                  </div>
                </td>
              </tr>
            ) : (
              sortedCreators.map((creator, index) => {
                const gold = isGoldMoment(creator);
                return (
                  <tr
                    key={creator.id}
                    onMouseEnter={() => setHoveredRow(creator.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`transition-all duration-150 ${
                      gold ? 'bg-[rgba(251,191,36,0.05)] hover:bg-[rgba(251,191,36,0.1)]'
                        : creator.qualified ? 'bg-[rgba(34,197,94,0.03)] hover:bg-[var(--bg-elevated)]'
                        : 'hover:bg-[var(--bg-elevated)]'
                    } ${gold ? 'border-l-2 border-l-[var(--accent-gold)]' : creator.qualified ? 'border-l-2 border-l-[var(--signal-success)]' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getPlatformIcon(creator)}</span>
                        <div className="flex flex-col">
                          <a href={getProfileUrl(creator)} target="_blank" rel="noopener noreferrer"
                            className={`font-medium transition-colors ${gold ? 'text-[var(--accent-gold)] hover:text-[var(--text-primary)]' : 'text-[var(--text-primary)] hover:text-[var(--signal-action)]'}`}>
                            {getDisplayName(creator)}
                          </a>
                          {getUsername(creator) && <span className="text-xs text-[var(--text-muted)]">@{getUsername(creator)}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-mono text-[var(--text-secondary)]">{formatNumber(getFollowers(creator))}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-mono text-[var(--text-secondary)]">{getPostCount(creator)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {creator.email ? (
                        <a href={`mailto:${creator.email}`}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg transition-all duration-150 ${
                            gold ? 'bg-[var(--signal-action-dim)] text-[var(--signal-action)] hover:bg-[var(--signal-action)] hover:text-[var(--bg-deep)]'
                              : 'text-[var(--signal-action)] hover:text-[var(--text-primary)]'
                          }`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                          <span className="font-mono text-sm">{creator.email}</span>
                        </a>
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {creator.qualified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-[var(--signal-success-dim)] text-[var(--signal-success)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal-success)]"></span>QUALIFIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-[rgba(239,68,68,0.15)] text-[var(--signal-danger)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal-danger)]"></span>REJECTED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="text-sm text-[var(--text-muted)] line-clamp-2" title={creator.qualificationReason}>
                        {creator.qualificationReason}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[var(--bg-border)] bg-[var(--bg-base)] flex items-center justify-between">
        <span className="text-sm font-mono text-[var(--text-muted)]">
          Showing <span className="text-[var(--text-secondary)]">{sortedCreators.length}</span> of{' '}
          <span className="text-[var(--text-secondary)]">{creators.length}</span> creators
        </span>
        <div className="flex items-center gap-4">
          {summary.withEmail > 0 && (
            <span className="text-sm font-mono text-[var(--accent-gold)]">{summary.withEmail} ready for outreach</span>
          )}
          {onFindMore && jobStatus === 'completed' && (
            <button
              onClick={onFindMore}
              disabled={isFindingMore}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--signal-action)] hover:bg-[var(--signal-action-dim)] transition-all duration-150 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFindingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--signal-action)] border-t-transparent rounded-full animate-spin"></div>
                  Finding more...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Find More
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
