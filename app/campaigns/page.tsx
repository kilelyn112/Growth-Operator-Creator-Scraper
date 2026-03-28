'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWrapper from '@/components/DashboardWrapper';

interface Campaign {
  id: number;
  name: string;
  status: string;
  offer_description: string;
  target_market: string;
  platform: string;
  selected_niches: Array<{ id: string; name: string; searchKeyword: string }>;
  total_niches: number;
  completed_niches: number;
  total_creators_found: number;
  qualified_creators: number;
  creators_with_email: number;
  created_at: string;
}

interface NicheSuggestion {
  id: string;
  name: string;
  category: string;
  searchKeyword: string;
  relevance: 'high' | 'medium' | 'low';
  reason: string;
}

type Step = 'list' | 'create_offer' | 'select_niches' | 'review';

export default function CampaignsPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [campaignName, setCampaignName] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [maxPerNiche, setMaxPerNiche] = useState(30);

  // Niche mapping state
  const [suggestedNiches, setSuggestedNiches] = useState<NicheSuggestion[]>([]);
  const [selectedNicheIds, setSelectedNicheIds] = useState<Set<string>>(new Set());
  const [mappingLoading, setMappingLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleMapNiches() {
    if (!offerDescription || !targetMarket) return;
    setMappingLoading(true);
    try {
      const res = await fetch('/api/campaigns/map-niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_description: offerDescription, target_market: targetMarket }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to map niches. Please try again.');
        return;
      }
      const niches = data.niches || [];
      if (niches.length === 0) {
        alert('AI returned 0 niches. Try being more specific about your offer and target market.');
        return;
      }
      setSuggestedNiches(niches);
      // Auto-select high and medium relevance
      const autoSelect = new Set<string>(
        niches.filter((n: NicheSuggestion) => n.relevance !== 'low').map((n: NicheSuggestion) => n.id)
      );
      setSelectedNicheIds(autoSelect);
      setStep('select_niches');
    } catch (e) {
      console.error(e);
      alert('Network error — could not reach the server.');
    } finally {
      setMappingLoading(false);
    }
  }

  async function handleCreateCampaign() {
    const selected = suggestedNiches.filter(n => selectedNicheIds.has(n.id));
    if (selected.length === 0) return;

    setCreating(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName || `${targetMarket} Campaign`,
          offer_description: offerDescription,
          target_market: targetMarket,
          platform,
          max_results_per_niche: maxPerNiche,
          selected_niches: selected.map(n => ({
            id: n.id,
            name: n.name,
            searchKeyword: n.searchKeyword,
            category: n.category,
          })),
        }),
      });
      const data = await res.json();
      if (data.campaign) {
        router.push(`/campaigns/${data.campaign.id}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  function toggleNiche(id: string) {
    setSelectedNicheIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedNicheIds(new Set(suggestedNiches.map(n => n.id)));
  }

  function selectNone() {
    setSelectedNicheIds(new Set());
  }

  const renderContent = () => {
  // ============ LIST VIEW ============
  if (step === 'list') {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Campaigns</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              AI-powered multi-niche discovery engine
            </p>
          </div>
          <button
            onClick={() => setStep('create_offer')}
            className="px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + New Campaign
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-light)] flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No campaigns yet</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Create a campaign to discover creators across multiple niches simultaneously.
              Tell us your offer, and AI will map every relevant niche for you.
            </p>
            <button
              onClick={() => setStep('create_offer')}
              className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90"
            >
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map(c => (
              <a
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-5 hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--text-primary)]">{c.name}</h3>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {c.platform.charAt(0).toUpperCase() + c.platform.slice(1)} · {c.total_niches} niches
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{c.total_creators_found}</p>
                    <p className="text-xs text-[var(--text-muted)]">creators found</p>
                  </div>
                </div>

                {c.status === 'running' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                      <span>Progress</span>
                      <span>{c.completed_niches}/{c.total_niches} niches</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all"
                        style={{ width: `${c.total_niches > 0 ? (c.completed_niches / c.total_niches) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-6 mt-4 text-sm">
                  <span className="text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">{c.qualified_creators}</strong> qualified
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">{c.creators_with_email}</strong> with email
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============ CREATE: OFFER STEP ============
  if (step === 'create_offer') {
    return (
      <div>
        <button onClick={() => setStep('list')} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 flex items-center gap-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to campaigns
        </button>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">New Campaign</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-8">
          Describe your offer and AI will find every niche where your ideal prospects create content.
        </p>

        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6 max-w-2xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="e.g., Ecom Ad Scaling Q1"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">What service do you offer?</label>
              <textarea
                value={offerDescription}
                onChange={e => setOfferDescription(e.target.value)}
                placeholder="e.g., I run Meta ads for Shopify brands and help them scale from $10K to $100K/mo in ad spend profitably"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Who do you help? (Target market)</label>
              <textarea
                value={targetMarket}
                onChange={e => setTargetMarket(e.target.value)}
                placeholder="e.g., Online coaches, course creators, and info product sellers doing $5K-50K/mo who want to scale with paid ads"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-sm resize-none"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Platform</label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-sm"
                >
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="x">X (Twitter)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Results per niche</label>
                <select
                  value={maxPerNiche}
                  onChange={e => setMaxPerNiche(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-sm"
                >
                  <option value={15}>15 (Quick)</option>
                  <option value={30}>30 (Standard)</option>
                  <option value={50}>50 (Deep)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleMapNiches}
            disabled={!offerDescription || !targetMarket || mappingLoading}
            className="mt-6 w-full py-3 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mappingLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                AI is mapping niches...
              </>
            ) : (
              <>
                Map Niches with AI
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ============ CREATE: SELECT NICHES ============
  if (step === 'select_niches') {
    const highNiches = suggestedNiches.filter(n => n.relevance === 'high');
    const medNiches = suggestedNiches.filter(n => n.relevance === 'medium');
    const lowNiches = suggestedNiches.filter(n => n.relevance === 'low');

    return (
      <div>
        <button onClick={() => setStep('create_offer')} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 flex items-center gap-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to offer
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Select Niches</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              AI found <strong>{suggestedNiches.length}</strong> relevant niches · <strong>{selectedNicheIds.size}</strong> selected
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={selectAll} className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] border border-[var(--accent)] rounded-lg hover:bg-[var(--accent-light)]">
              Select All
            </button>
            <button onClick={selectNone} className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-subtle)]">
              Clear
            </button>
          </div>
        </div>

        <div className="space-y-6 max-w-3xl">
          {highNiches.length > 0 && (
            <NicheGroup
              title="High Relevance"
              badge="bg-green-100 text-green-700"
              niches={highNiches}
              selected={selectedNicheIds}
              onToggle={toggleNiche}
            />
          )}
          {medNiches.length > 0 && (
            <NicheGroup
              title="Medium Relevance"
              badge="bg-yellow-100 text-yellow-700"
              niches={medNiches}
              selected={selectedNicheIds}
              onToggle={toggleNiche}
            />
          )}
          {lowNiches.length > 0 && (
            <NicheGroup
              title="Low Relevance"
              badge="bg-gray-100 text-gray-600"
              niches={lowNiches}
              selected={selectedNicheIds}
              onToggle={toggleNiche}
            />
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={handleCreateCampaign}
            disabled={selectedNicheIds.size === 0 || creating}
            className="px-6 py-3 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              `Create Campaign with ${selectedNicheIds.size} Niches`
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
  };

  return <DashboardWrapper>{renderContent()}</DashboardWrapper>;
}

// ============ COMPONENTS ============

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

function NicheGroup({
  title,
  badge,
  niches,
  selected,
  onToggle,
}: {
  title: string;
  badge: string;
  niches: NicheSuggestion[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badge}`}>{title}</span>
        <span className="text-xs text-[var(--text-muted)]">{niches.length} niches</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {niches.map(niche => (
          <button
            key={niche.id}
            onClick={() => onToggle(niche.id)}
            className={`text-left p-3 rounded-lg border transition-all ${
              selected.has(niche.id)
                ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                : 'border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-subtle)]'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className={`w-4 h-4 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center ${
                selected.has(niche.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-default)]'
              }`}>
                {selected.has(niche.id) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{niche.name}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{niche.reason}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
