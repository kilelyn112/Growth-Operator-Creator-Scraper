'use client';

import { useState, useMemo } from 'react';
import { NICHE_CATEGORIES, Niche, searchNiches, getAllNiches } from '@/lib/niches';

interface NichePickerProps {
  onSelectNiche: (niche: Niche) => void;
  disabled?: boolean;
}

export default function NichePicker({ onSelectNiche, disabled }: NichePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
  const [hoveredNiche, setHoveredNiche] = useState<string | null>(null);

  const totalNiches = useMemo(() => getAllNiches().length, []);

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return searchNiches(searchQuery).slice(0, 15);
  }, [searchQuery]);

  const handleNicheClick = (niche: Niche) => {
    if (disabled) return;
    onSelectNiche(niche);
  };

  const categoryIcons: Record<string, string> = {
    wealth: '◈',
    health: '◉',
    relationships: '◇',
    skills: '△',
    lifestyle: '□',
  };

  return (
    <div className="relative">
      {/* Search Bar - Floating */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 300+ niches..."
            className="w-full pl-12 pr-4 py-4 bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--signal-action)] transition-all duration-200 text-lg"
            disabled={disabled}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <div className="mb-6 bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-xl overflow-hidden">
          {searchResults.length > 0 ? (
            <div className="p-2">
              <p className="text-xs text-[var(--text-muted)] px-3 py-2 font-mono uppercase tracking-wider">
                {searchResults.length} matches
              </p>
              <div className="space-y-1">
                {searchResults.map((niche, index) => (
                  <button
                    key={niche.id}
                    onClick={() => handleNicheClick(niche)}
                    disabled={disabled}
                    style={{ animationDelay: `${index * 30}ms` }}
                    className="animate-row w-full text-left px-4 py-3 rounded-lg hover:bg-[var(--bg-elevated)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[var(--text-primary)] font-medium group-hover:text-[var(--signal-action)] transition-colors">
                        {niche.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-3 font-mono">
                        {niche.category}/{niche.subcategory}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="p-6 text-[var(--text-muted)] text-center">
              No niches found for "<span className="text-[var(--text-secondary)]">{searchQuery}</span>"
            </p>
          )}
        </div>
      )}

      {/* Category Grid */}
      {searchQuery.length < 2 && (
        <>
          {/* Quick Stats */}
          <div className="flex items-center gap-6 mb-6 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--signal-action)]"></div>
              <span className="text-sm text-[var(--text-muted)]">
                <span className="font-mono text-[var(--text-primary)]">{totalNiches}</span> niches
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--signal-success)]"></div>
              <span className="text-sm text-[var(--text-muted)]">
                <span className="font-mono text-[var(--text-primary)]">{NICHE_CATEGORIES.length}</span> categories
              </span>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            {NICHE_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-xl overflow-hidden transition-all duration-200 hover:border-[var(--bg-elevated)]"
              >
                {/* Category Header */}
                <button
                  onClick={() => {
                    setExpandedCategory(expandedCategory === category.id ? null : category.id);
                    setExpandedSubcategory(null);
                  }}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-elevated)] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl text-[var(--signal-action)] font-mono">
                      {categoryIcons[category.id] || '◈'}
                    </span>
                    <div className="text-left">
                      <span className="font-semibold text-[var(--text-primary)] text-lg group-hover:text-[var(--signal-action)] transition-colors">
                        {category.name}
                      </span>
                      <span className="ml-3 text-xs font-mono text-[var(--text-muted)]">
                        {category.subcategories.reduce((acc, sub) => acc + sub.niches.length, 0)}
                      </span>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-200 ${
                      expandedCategory === category.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Subcategories */}
                {expandedCategory === category.id && (
                  <div className="border-t border-[var(--bg-border)] bg-[var(--bg-base)]">
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.id}>
                        {/* Subcategory Header */}
                        <button
                          onClick={() =>
                            setExpandedSubcategory(
                              expandedSubcategory === subcategory.id ? null : subcategory.id
                            )
                          }
                          className="w-full px-6 py-3 flex items-center justify-between hover:bg-[var(--bg-surface)] transition-colors border-b border-[var(--bg-border)] last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></div>
                            <span className="text-[var(--text-secondary)] font-medium">
                              {subcategory.name}
                            </span>
                            <span className="text-xs font-mono text-[var(--text-muted)]">
                              {subcategory.niches.length}
                            </span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${
                              expandedSubcategory === subcategory.id ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Niches Grid */}
                        {expandedSubcategory === subcategory.id && (
                          <div className="px-6 py-4 bg-[var(--bg-deep)] border-b border-[var(--bg-border)]">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {subcategory.niches.map((niche, index) => (
                                <button
                                  key={niche.id}
                                  onClick={() => handleNicheClick(niche)}
                                  onMouseEnter={() => setHoveredNiche(niche.id)}
                                  onMouseLeave={() => setHoveredNiche(null)}
                                  disabled={disabled}
                                  style={{ animationDelay: `${index * 20}ms` }}
                                  className={`animate-row text-left px-4 py-3 rounded-lg border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    hoveredNiche === niche.id
                                      ? 'bg-[var(--signal-action-dim)] border-[var(--signal-action)] text-[var(--signal-action)]'
                                      : 'bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)] hover:border-[var(--signal-action)]'
                                  }`}
                                >
                                  <span className="text-sm font-medium">{niche.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Access - Popular Niches */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-[var(--bg-border)]"></div>
              <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider px-3">
                Quick Access
              </span>
              <div className="h-px flex-1 bg-[var(--bg-border)]"></div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'coaching-business',
                'smma',
                'amazon-fba',
                'day-trading',
                'weight-loss',
                'real-estate-investing',
                'youtube-growth',
                'dropshipping',
              ].map((nicheId) => {
                const niche = getAllNiches().find((n) => n.id === nicheId);
                if (!niche) return null;
                return (
                  <button
                    key={niche.id}
                    onClick={() => handleNicheClick(niche)}
                    disabled={disabled}
                    className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-[var(--signal-action)] hover:text-[var(--signal-action)] hover:bg-[var(--signal-action-dim)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {niche.name}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
