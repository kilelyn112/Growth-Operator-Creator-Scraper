'use client';

import { useState, useEffect } from 'react';
import DashboardWrapper from '@/components/DashboardWrapper';
import { useSession } from '@/components/SessionProvider';

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEP_NAMES = ['Who You Serve', 'What You Do', 'The Transformation', 'Proof & Credibility', 'The Offer Stack'];

const SERVICE_CATEGORIES = [
  'Social Media Management', 'Paid Ads (Meta/Google)', 'Email Marketing',
  'Funnel Building', 'Web Design/Development', 'SEO', 'Content Creation',
  'Video Editing', 'Copywriting', 'Sales/Closing', 'Business Consulting',
  'Branding', 'Lead Generation', 'Community Management', 'Other'
];

const DELIVERY_METHODS = [
  'Done-for-you', 'Done-with-you', '1-on-1 coaching', 'Group coaching',
  'Course / program', 'Retainer', 'Project-based'
];

interface OfferData {
  target_market: string;
  target_pain_points: string[];
  target_desires: string[];
  service_category: string;
  service_description: string;
  delivery_method: string;
  before_state: string;
  after_state: string;
  timeframe: string;
  case_studies: { client: string; before: string; after: string; timeframe: string }[];
  credentials: string[];
  unique_mechanism: string;
  offer_name: string;
  price_point: string;
  offer_stack: { item: string; value: string; description: string }[];
  guarantee: string;
  offer_score: number;
  ai_feedback: Record<string, unknown> | null;
  status: string;
}

const EMPTY_OFFER: OfferData = {
  target_market: '', target_pain_points: [], target_desires: [],
  service_category: '', service_description: '', delivery_method: '',
  before_state: '', after_state: '', timeframe: '',
  case_studies: [], credentials: [], unique_mechanism: '',
  offer_name: '', price_point: '', offer_stack: [], guarantee: '',
  offer_score: 0, ai_feedback: null, status: 'draft',
};

export default function OfferBuilderPage() {
  const { session } = useSession();
  const [step, setStep] = useState<WizardStep>(1);
  const [offer, setOffer] = useState<OfferData>(EMPTY_OFFER);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [newCredential, setNewCredential] = useState('');

  // Load existing offer on mount
  useEffect(() => {
    loadOffer();
  }, []);

  const loadOffer = async () => {
    try {
      const res = await fetch('/api/offer');
      const data = await res.json();
      if (data.offer) {
        setOffer({
          ...EMPTY_OFFER,
          ...data.offer,
          target_pain_points: data.offer.target_pain_points || [],
          target_desires: data.offer.target_desires || [],
          case_studies: data.offer.case_studies || [],
          credentials: data.offer.credentials || [],
          offer_stack: data.offer.offer_stack || [],
        });
      }
    } catch { /* first time */ }
    setLoading(false);
  };

  const saveOffer = async (updates?: Partial<OfferData>) => {
    setSaving(true);
    const payload = { ...offer, ...updates };
    try {
      await fetch('/api/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (updates) setOffer(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Save error:', err);
    }
    setSaving(false);
  };

  const aiAnalyze = async (action: string, payload: Record<string, unknown>) => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/offer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    } catch (err) {
      console.error('AI error:', err);
      return null;
    } finally {
      setAiLoading(false);
    }
  };

  const handleExtractICP = async () => {
    if (!freeText.trim()) return;
    const result = await aiAnalyze('extract_icp', { description: freeText });
    if (result) {
      const updates = {
        target_market: result.target_market,
        target_pain_points: result.pain_points,
        target_desires: result.desires,
      };
      setOffer(prev => ({ ...prev, ...updates }));
      await saveOffer(updates);
    }
  };

  const handleGenerateTransformation = async () => {
    const result = await aiAnalyze('generate_transformation', {
      input: {
        target_market: offer.target_market,
        service_description: offer.service_description,
        pain_points: offer.target_pain_points,
      }
    });
    if (result) {
      const updates = {
        before_state: result.before_state,
        after_state: result.after_state,
        timeframe: result.suggested_timeframe,
      };
      setOffer(prev => ({ ...prev, ...updates }));
      await saveOffer(updates);
    }
  };

  const handleScoreOffer = async () => {
    const result = await aiAnalyze('score_offer', { offer });
    if (result) {
      const totalScore = (result.specificity?.score || 0) + (result.transformation?.score || 0) +
        (result.proof?.score || 0) + (result.uniqueness?.score || 0) + (result.stack?.score || 0);
      const updates = { offer_score: totalScore, ai_feedback: result, status: 'complete' as const };
      setOffer(prev => ({ ...prev, ...updates }));
      await saveOffer(updates);
    }
  };

  const goNext = async () => {
    await saveOffer();
    if (step < 5) setStep((step + 1) as WizardStep);
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as WizardStep);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardWrapper>
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">Build Your Offer</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          A positioned offer is the foundation of everything. This is step 1 for a reason.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_NAMES.map((name, i) => {
          const stepNum = (i + 1) as WizardStep;
          const isActive = step === stepNum;
          const isComplete = step > stepNum;
          return (
            <button
              key={i}
              onClick={() => setStep(stepNum)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-[var(--accent-light)] text-[var(--accent)] font-medium'
                  : isComplete
                  ? 'text-[var(--accent)] hover:bg-[var(--bg-subtle)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isActive ? 'bg-[var(--accent)] text-white' : isComplete ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
              }`}>
                {isComplete ? '✓' : stepNum}
              </span>
              <span className="hidden md:inline">{name}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="card p-8 mb-6">
        {/* STEP 1: Who You Serve */}
        {step === 1 && (
          <div>
            <h2 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-1">Who do you serve?</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Describe your ideal client in your own words. Be as specific as you can — the AI will help refine it.
            </p>

            <textarea
              value={freeText || offer.target_market}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="e.g. I help ecommerce store owners who are doing $10K-50K/month but can't figure out how to scale their Meta ads profitably..."
              rows={4}
              className="w-full mb-4"
            />

            <button
              onClick={handleExtractICP}
              disabled={aiLoading || !(freeText || offer.target_market)}
              className="btn-accent mb-6 disabled:opacity-50"
            >
              {aiLoading ? 'Analyzing...' : 'Extract with AI'}
            </button>

            {offer.target_market && (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Target Market</label>
                  <input
                    value={offer.target_market}
                    onChange={(e) => setOffer(prev => ({ ...prev, target_market: e.target.value }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Pain Points</label>
                  <div className="space-y-2">
                    {offer.target_pain_points.map((p, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[var(--status-error)] mt-2">•</span>
                        <input
                          value={p}
                          onChange={(e) => {
                            const updated = [...offer.target_pain_points];
                            updated[i] = e.target.value;
                            setOffer(prev => ({ ...prev, target_pain_points: updated }));
                          }}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Desires</label>
                  <div className="space-y-2">
                    {offer.target_desires.map((d, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[var(--accent)] mt-2">•</span>
                        <input
                          value={d}
                          onChange={(e) => {
                            const updated = [...offer.target_desires];
                            updated[i] = e.target.value;
                            setOffer(prev => ({ ...prev, target_desires: updated }));
                          }}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: What You Do */}
        {step === 2 && (
          <div>
            <h2 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-1">What do you do?</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              What service do you provide and how do you deliver it?
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Service Category</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setOffer(prev => ({ ...prev, service_category: cat }))}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        offer.service_category === cat
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Describe Your Service</label>
                <textarea
                  value={offer.service_description}
                  onChange={(e) => setOffer(prev => ({ ...prev, service_description: e.target.value }))}
                  placeholder="What exactly do you deliver? Be specific about the outcomes..."
                  rows={3}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Delivery Method</label>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_METHODS.map((method) => (
                    <button
                      key={method}
                      onClick={() => setOffer(prev => ({ ...prev, delivery_method: method }))}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        offer.delivery_method === method
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: The Transformation */}
        {step === 3 && (
          <div>
            <h2 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-1">The Transformation</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              What does life look like BEFORE and AFTER working with you? This is what sells — not deliverables.
            </p>

            <button
              onClick={handleGenerateTransformation}
              disabled={aiLoading || !offer.target_market}
              className="btn-secondary mb-6 disabled:opacity-50"
            >
              {aiLoading ? 'Generating...' : 'Generate with AI'}
            </button>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--status-error)] mb-1">Before (the pain)</label>
                <textarea
                  value={offer.before_state}
                  onChange={(e) => setOffer(prev => ({ ...prev, before_state: e.target.value }))}
                  placeholder="Where is your client right now? What are they struggling with?"
                  rows={3}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--accent)] mb-1">After (the outcome)</label>
                <textarea
                  value={offer.after_state}
                  onChange={(e) => setOffer(prev => ({ ...prev, after_state: e.target.value }))}
                  placeholder="What specific results will they have? Be tangible."
                  rows={3}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Timeframe</label>
                <input
                  value={offer.timeframe}
                  onChange={(e) => setOffer(prev => ({ ...prev, timeframe: e.target.value }))}
                  placeholder="e.g. 90 days, 6 months"
                  className="w-full max-w-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Proof & Credibility */}
        {step === 4 && (
          <div>
            <h2 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-1">Proof & Credibility</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              What makes you credible? Even informal wins count. What do you do differently?
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Credentials & Wins</label>
                <div className="space-y-2 mb-3">
                  {offer.credentials.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-[var(--accent)]">★</span>
                      <input
                        value={c}
                        onChange={(e) => {
                          const updated = [...offer.credentials];
                          updated[i] = e.target.value;
                          setOffer(prev => ({ ...prev, credentials: updated }));
                        }}
                        className="flex-1"
                      />
                      <button
                        onClick={() => setOffer(prev => ({ ...prev, credentials: prev.credentials.filter((_, j) => j !== i) }))}
                        className="text-[var(--text-muted)] hover:text-[var(--status-error)]"
                      >×</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newCredential}
                    onChange={(e) => setNewCredential(e.target.value)}
                    placeholder="e.g. 5 years experience, worked with X brand, generated $Y for clients"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCredential.trim()) {
                        setOffer(prev => ({ ...prev, credentials: [...prev.credentials, newCredential.trim()] }));
                        setNewCredential('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newCredential.trim()) {
                        setOffer(prev => ({ ...prev, credentials: [...prev.credentials, newCredential.trim()] }));
                        setNewCredential('');
                      }
                    }}
                    className="btn-secondary text-sm"
                  >Add</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Unique Mechanism</label>
                <p className="text-xs text-[var(--text-muted)] mb-2">What do you do DIFFERENTLY than everyone else offering this? What&apos;s your method/approach?</p>
                <textarea
                  value={offer.unique_mechanism}
                  onChange={(e) => setOffer(prev => ({ ...prev, unique_mechanism: e.target.value }))}
                  placeholder="e.g. I use a proprietary 3-step system that... / Unlike other agencies, I focus on..."
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: The Offer Stack */}
        {step === 5 && (
          <div>
            <h2 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-1">The Offer Stack</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Name your offer, set your price, and build a stack so valuable that saying no feels stupid.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Offer Name</label>
                  <input
                    value={offer.offer_name}
                    onChange={(e) => setOffer(prev => ({ ...prev, offer_name: e.target.value }))}
                    placeholder="e.g. The Growth Accelerator, Client Machine"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Price Point</label>
                  <input
                    value={offer.price_point}
                    onChange={(e) => setOffer(prev => ({ ...prev, price_point: e.target.value }))}
                    placeholder="e.g. $3,000, $5,000/mo"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">What&apos;s Included</label>
                <div className="space-y-3 mb-3">
                  {offer.offer_stack.map((item, i) => (
                    <div key={i} className="card p-3 flex gap-3 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          value={item.item}
                          onChange={(e) => {
                            const updated = [...offer.offer_stack];
                            updated[i] = { ...updated[i], item: e.target.value };
                            setOffer(prev => ({ ...prev, offer_stack: updated }));
                          }}
                          placeholder="Item name"
                          className="col-span-1"
                        />
                        <input
                          value={item.value}
                          onChange={(e) => {
                            const updated = [...offer.offer_stack];
                            updated[i] = { ...updated[i], value: e.target.value };
                            setOffer(prev => ({ ...prev, offer_stack: updated }));
                          }}
                          placeholder="Value (e.g. $2,000)"
                          className="col-span-1"
                        />
                        <input
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...offer.offer_stack];
                            updated[i] = { ...updated[i], description: e.target.value };
                            setOffer(prev => ({ ...prev, offer_stack: updated }));
                          }}
                          placeholder="Short description"
                          className="col-span-1"
                        />
                      </div>
                      <button
                        onClick={() => setOffer(prev => ({ ...prev, offer_stack: prev.offer_stack.filter((_, j) => j !== i) }))}
                        className="text-[var(--text-muted)] hover:text-[var(--status-error)] mt-2"
                      >×</button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setOffer(prev => ({
                    ...prev,
                    offer_stack: [...prev.offer_stack, { item: '', value: '', description: '' }]
                  }))}
                  className="btn-secondary text-sm"
                >
                  + Add Item
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Guarantee</label>
                <textarea
                  value={offer.guarantee}
                  onChange={(e) => setOffer(prev => ({ ...prev, guarantee: e.target.value }))}
                  placeholder="e.g. Land your first client in 60 days or we work with you free until you do."
                  rows={2}
                  className="w-full"
                />
              </div>

              {/* Score Button */}
              <div className="border-t border-[var(--border-default)] pt-6 mt-6">
                <button
                  onClick={handleScoreOffer}
                  disabled={aiLoading}
                  className="btn-accent disabled:opacity-50"
                >
                  {aiLoading ? 'Scoring...' : 'Score My Offer with AI'}
                </button>

                {/* Score Display */}
                {offer.ai_feedback && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className={`text-4xl font-bold ${
                        offer.offer_score >= 80 ? 'text-[var(--accent)]' :
                        offer.offer_score >= 60 ? 'text-[var(--status-warning)]' :
                        'text-[var(--status-error)]'
                      }`}>
                        {offer.offer_score}/100
                      </div>
                      <p className="text-[var(--text-secondary)]">{(offer.ai_feedback as Record<string, string>).overall}</p>
                    </div>
                    {['specificity', 'transformation', 'proof', 'uniqueness', 'stack'].map((key) => {
                      const fb = (offer.ai_feedback as Record<string, { score: number; feedback: string }>)[key];
                      if (!fb) return null;
                      return (
                        <div key={key} className="flex gap-4 items-start">
                          <div className="w-16 text-right">
                            <span className={`text-sm font-bold ${fb.score >= 16 ? 'text-[var(--accent)]' : fb.score >= 12 ? 'text-[var(--status-warning)]' : 'text-[var(--status-error)]'}`}>
                              {fb.score}/20
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{key}</p>
                            <p className="text-sm text-[var(--text-secondary)]">{fb.feedback}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={step === 1}
          className="btn-secondary disabled:opacity-30"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-[var(--text-muted)]">Saving...</span>}
          {step < 5 ? (
            <button onClick={goNext} className="btn-accent">
              Save & Continue
            </button>
          ) : (
            <button onClick={() => saveOffer({ status: 'complete' })} className="btn-accent">
              Save Offer
            </button>
          )}
        </div>
      </div>
    </div>
    </DashboardWrapper>
  );
}
