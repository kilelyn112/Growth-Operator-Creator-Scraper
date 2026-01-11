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
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const totalNiches = useMemo(() => getAllNiches().length, []);

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return searchNiches(searchQuery).slice(0, 15);
  }, [searchQuery]);

  const handleNicheClick = (niche: Niche) => {
    if (disabled) return;
    onSelectNiche(niche);
  };

  // SVG icons for categories - cleaner than emojis
  const CategoryIcon = ({ category }: { category: string }) => {
    switch (category) {
      case 'wealth':
        return (
          <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'health':
        return (
          <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        );
      case 'relationships':
        return (
          <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        );
      case 'skills':
        return (
          <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        );
      case 'lifestyle':
        return (
          <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
          </svg>
        );
    }
  };

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search 300+ niches..."
            className={`w-full px-5 py-4 bg-[var(--bg-primary)] border-2 rounded-2xl text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-200 text-base shadow-sm ${
              isSearchFocused
                ? 'border-[var(--accent)] shadow-lg shadow-emerald-100'
                : 'border-[var(--border-default)] hover:border-[var(--border-emphasized)]'
            }`}
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
        <div className="mb-8 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-xl">
          {searchResults.length > 0 ? (
            <div className="p-3">
              <p className="text-xs text-[var(--text-muted)] px-3 py-2 font-medium uppercase tracking-wider">
                {searchResults.length} matches found
              </p>
              <div className="space-y-1">
                {searchResults.map((niche, index) => (
                  <button
                    key={niche.id}
                    onClick={() => handleNicheClick(niche)}
                    disabled={disabled}
                    style={{ animationDelay: `${index * 30}ms` }}
                    className="animate-fadeIn w-full text-left px-4 py-3 rounded-xl hover:bg-[var(--accent-light)] hover:shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[var(--text-primary)] font-medium group-hover:text-[var(--accent)] transition-colors">
                        {niche.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-3">
                        {niche.category} / {niche.subcategory}
                      </span>
                    </div>
                    <svg
                      className="w-5 h-5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="p-8 text-[var(--text-muted)] text-center">
              No niches found for "<span className="text-[var(--text-primary)] font-medium">{searchQuery}</span>"
            </p>
          )}
        </div>
      )}

      {/* Category Grid */}
      {searchQuery.length < 2 && (
        <>
          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{totalNiches}</span> niches available
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--status-success)]" />
              <span className="text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{NICHE_CATEGORIES.length}</span> categories
              </span>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            {NICHE_CATEGORIES.map((category, catIndex) => (
              <div
                key={category.id}
                className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md"
                style={{ animationDelay: `${catIndex * 50}ms` }}
              >
                {/* Category Header */}
                <button
                  onClick={() => {
                    setExpandedCategory(expandedCategory === category.id ? null : category.id);
                    setExpandedSubcategory(null);
                  }}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-subtle)] flex items-center justify-center group-hover:bg-[var(--accent-light)] transition-colors">
                      <CategoryIcon category={category.id} />
                    </div>
                    <div className="text-left">
                      <span className="font-semibold text-[var(--text-primary)] text-lg group-hover:text-[var(--accent)] transition-colors">
                        {category.name}
                      </span>
                      <span className="ml-3 text-sm text-[var(--text-muted)]">
                        {category.subcategories.reduce((acc, sub) => acc + sub.niches.length, 0)} niches
                      </span>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-300 ${
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
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    expandedCategory === category.id ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="border-t border-[var(--border-default)] bg-[var(--bg-subtle)]">
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.id}>
                        {/* Subcategory Header */}
                        <button
                          onClick={() =>
                            setExpandedSubcategory(
                              expandedSubcategory === subcategory.id ? null : subcategory.id
                            )
                          }
                          className="w-full px-8 py-4 flex items-center justify-between hover:bg-[var(--bg-primary)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                            <span className="text-[var(--text-secondary)] font-medium">
                              {subcategory.name}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full">
                              {subcategory.niches.length}
                            </span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-300 ${
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
                        <div
                          className={`overflow-hidden transition-all duration-300 ${
                            expandedSubcategory === subcategory.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="px-8 py-5 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {subcategory.niches.map((niche, index) => (
                                <button
                                  key={niche.id}
                                  onClick={() => handleNicheClick(niche)}
                                  onMouseEnter={() => setHoveredNiche(niche.id)}
                                  onMouseLeave={() => setHoveredNiche(null)}
                                  disabled={disabled}
                                  className={`
                                    text-left px-4 py-3 rounded-xl border-2 transition-all duration-200
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transform hover:-translate-y-1 hover:shadow-lg
                                    ${
                                      hoveredNiche === niche.id
                                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg shadow-emerald-200'
                                        : 'bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                                    }
                                  `}
                                  style={{ animationDelay: `${index * 30}ms` }}
                                >
                                  <span className="text-sm font-medium">{niche.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Access - Popular Niches */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
              <span className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider px-2">
                Popular Picks
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                'coaching-business',
                'smma',
                'amazon-fba',
                'day-trading',
                'weight-loss',
                'real-estate-investing',
                'youtube-growth',
                'dropshipping',
              ].map((nicheId, index) => {
                const niche = getAllNiches().find((n) => n.id === nicheId);
                if (!niche) return null;
                return (
                  <button
                    key={niche.id}
                    onClick={() => handleNicheClick(niche)}
                    disabled={disabled}
                    className="
                      px-5 py-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-default)] rounded-full
                      text-sm font-medium text-[var(--text-secondary)]
                      hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)]
                      hover:-translate-y-0.5 hover:shadow-md
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    style={{ animationDelay: `${index * 50}ms` }}
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
