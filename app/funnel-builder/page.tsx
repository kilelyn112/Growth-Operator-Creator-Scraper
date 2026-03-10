'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CreatorAnalysis {
  platform: 'youtube' | 'instagram';
  source_url: string;
  name: string;
  username: string;
  bio: string;
  profile_url: string;
  followers: number;
  niche: string;
  sub_niche: string;
  target_audience: string;
  audience_pain_points: string[];
  audience_desires: string[];
  content_themes: string[];
  tone_of_voice: string;
  identified_offers: string[];
  unique_selling_proposition: string;
  credibility_markers: string[];
  content_style: string;
}

interface GeneratedFunnel {
  creator_name: string;
  niche: string;
  target_platform: string;
  headline: string;
  subheadline: string;
  hero_section: { hook_text: string; cta_text: string; cta_subtext: string };
  pain_points: { section_title: string; points: { title: string; description: string }[] };
  solution: { title: string; description: string; bullet_points: string[] };
  social_proof: { section_title: string; testimonials: { name: string; result: string; quote: string }[] };
  offer: { title: string; description: string; features: { name: string; description: string }[]; price_anchor: string; actual_price: string; cta_text: string; urgency_text: string };
  about_section: { title: string; bio: string; credentials: string[] };
  faq: { question: string; answer: string }[];
  final_cta: { headline: string; subheadline: string; cta_text: string; guarantee_text: string };
}

type Step = 'input' | 'analyzing' | 'review' | 'generating' | 'result';

export default function FunnelBuilderPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<Step>('input');

  // Input
  const [creatorUrl, setCreatorUrl] = useState('');
  const [targetPlatform, setTargetPlatform] = useState<'gohighlevel' | 'clickfunnels' | 'generic'>('generic');

  // Analysis
  const [analysis, setAnalysis] = useState<CreatorAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Funnel
  const [funnel, setFunnel] = useState<GeneratedFunnel | null>(null);
  const [funnelHtml, setFunnelHtml] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (!data.authenticated) { router.push('/login'); return; }
    } catch { router.push('/login'); } finally { setIsLoading(false); }
  };

  const handleAnalyze = async () => {
    if (!creatorUrl.trim()) return;
    setStep('analyzing');
    setAnalyzeError(null);

    try {
      const res = await fetch('/api/funnel-builder/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: creatorUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAnalysis(data.analysis);
      setStep('review');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed');
      setStep('input');
    }
  };

  const handleGenerate = async () => {
    if (!analysis) return;
    setStep('generating');
    setGenerateError(null);

    try {
      const res = await fetch('/api/funnel-builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, target_platform: targetPlatform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFunnel(data.funnel);
      setFunnelHtml(data.html);
      setStep('result');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed');
      setStep('review');
    }
  };

  const handleCopyHtml = () => {
    if (funnelHtml) {
      navigator.clipboard.writeText(funnelHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setCreatorUrl('');
    setAnalysis(null);
    setFunnel(null);
    setFunnelHtml(null);
    setAnalyzeError(null);
    setGenerateError(null);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <a href="/" className="font-fancy text-2xl font-semibold text-[var(--text-primary)] hover:opacity-80 transition-opacity">
                creatorpairing.com
              </a>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">AI Funnel Builder</p>
            </div>

            <nav className="flex items-center gap-1 p-1 bg-[var(--bg-subtle)] rounded-lg">
              <a href="/" className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">Creators</a>
              <a href="/outreach" className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">Outreach</a>
              <span className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--text-primary)] text-white">Funnel Builder</span>
            </nav>

            {step !== 'input' && (
              <button onClick={handleStartOver} className="btn-secondary text-sm">Start Over</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* ===== STEP 1: INPUT ===== */}
        {step === 'input' && (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-fancy text-3xl font-semibold text-[var(--text-primary)] mb-3">
                Build a Funnel for Any Creator
              </h2>
              <p className="text-[var(--text-secondary)]">
                Paste a YouTube or Instagram URL — we&apos;ll analyze their content and generate a complete sales funnel
              </p>
            </div>

            <div className="card p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Creator URL</label>
                <input
                  type="text"
                  value={creatorUrl}
                  onChange={(e) => setCreatorUrl(e.target.value)}
                  placeholder="https://youtube.com/@creator or https://instagram.com/creator"
                  className="w-full"
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Target Platform</label>
                <div className="flex gap-2">
                  {([
                    { id: 'generic' as const, label: 'Generic HTML' },
                    { id: 'gohighlevel' as const, label: 'GoHighLevel' },
                    { id: 'clickfunnels' as const, label: 'ClickFunnels' },
                  ]).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setTargetPlatform(p.id)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        targetPlatform === p.id
                          ? 'bg-[var(--text-primary)] text-white'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {analyzeError && (
                <div className="px-4 py-3 rounded-lg bg-[var(--status-error-light)] border border-[var(--status-error)]">
                  <p className="text-sm text-[var(--status-error)]">{analyzeError}</p>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!creatorUrl.trim()}
                className="btn-accent w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Analyze Creator
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 2: ANALYZING ===== */}
        {step === 'analyzing' && (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-16 h-16 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h3 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-2">
              Analyzing Creator...
            </h3>
            <p className="text-[var(--text-secondary)]">
              Scraping their content and running AI analysis. This may take 15-30 seconds.
            </p>
          </div>
        )}

        {/* ===== STEP 3: REVIEW ANALYSIS ===== */}
        {step === 'review' && analysis && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
                  Creator Analysis: {analysis.name}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Review the analysis, then generate the funnel
                </p>
              </div>
              <button onClick={handleGenerate} className="btn-accent">
                Generate Funnel
              </button>
            </div>

            {/* Creator Card */}
            <div className="card p-6 flex items-center gap-6">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl ${
                analysis.platform === 'youtube' ? 'bg-red-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
              }`}>
                {analysis.platform === 'youtube' ? '▶' : '📷'}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg text-[var(--text-primary)]">{analysis.name}</div>
                <div className="text-sm text-[var(--text-muted)]">@{analysis.username} · {formatNumber(analysis.followers)} followers</div>
              </div>
              <div className="text-right">
                <span className="badge badge-accent">{analysis.niche}</span>
              </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-5">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Sub-Niche</h4>
                <p className="text-[var(--text-primary)]">{analysis.sub_niche}</p>
              </div>
              <div className="card p-5">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Target Audience</h4>
                <p className="text-[var(--text-primary)]">{analysis.target_audience}</p>
              </div>
              <div className="card p-5">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Tone of Voice</h4>
                <p className="text-[var(--text-primary)]">{analysis.tone_of_voice}</p>
              </div>
              <div className="card p-5">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">USP</h4>
                <p className="text-[var(--text-primary)]">{analysis.unique_selling_proposition}</p>
              </div>
            </div>

            {/* Lists */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-5">
                <h4 className="text-xs font-semibold text-[var(--status-error)] uppercase tracking-wider mb-3">Audience Pain Points</h4>
                <ul className="space-y-2">
                  {analysis.audience_pain_points.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[var(--text-primary)]">
                      <span className="text-[var(--status-error)] mt-0.5">•</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-5">
                <h4 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">Audience Desires</h4>
                <ul className="space-y-2">
                  {analysis.audience_desires.map((d, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[var(--text-primary)]">
                      <span className="text-[var(--accent)] mt-0.5">•</span>{d}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-5">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Content Themes</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.content_themes.map((t, i) => (
                    <span key={i} className="badge bg-[var(--bg-subtle)] text-[var(--text-primary)]">{t}</span>
                  ))}
                </div>
              </div>
              <div className="card p-5">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Identified Offers</h4>
                <ul className="space-y-2">
                  {analysis.identified_offers.map((o, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[var(--text-primary)]">
                      <span className="text-[var(--status-warning)] mt-0.5">★</span>{o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="card p-5">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Credibility Markers</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.credibility_markers.map((c, i) => (
                  <span key={i} className="badge badge-success">{c}</span>
                ))}
              </div>
            </div>

            {generateError && (
              <div className="px-4 py-3 rounded-lg bg-[var(--status-error-light)] border border-[var(--status-error)]">
                <p className="text-sm text-[var(--status-error)]">{generateError}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={handleGenerate} className="btn-accent text-lg px-8 py-3">
                Generate Funnel from Analysis
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 4: GENERATING ===== */}
        {step === 'generating' && (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-16 h-16 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h3 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-2">
              Building Your Funnel...
            </h3>
            <p className="text-[var(--text-secondary)]">
              Writing copy for every section. This takes about 20-30 seconds.
            </p>
          </div>
        )}

        {/* ===== STEP 5: RESULT ===== */}
        {step === 'result' && funnel && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
                  Funnel for {funnel.creator_name}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Copy the HTML or use each section individually
                </p>
              </div>
              <button
                onClick={handleCopyHtml}
                className={`btn-primary ${copied ? 'bg-[var(--accent)]' : ''}`}
              >
                {copied ? 'Copied!' : 'Copy Full HTML'}
              </button>
            </div>

            {/* Funnel Preview */}
            <div className="space-y-4">
              {/* Hero */}
              <div className="card p-8 text-center bg-gradient-to-b from-[var(--bg-subtle)] to-[var(--bg-primary)]">
                <span className="badge badge-accent mb-4">HERO SECTION</span>
                <h1 className="font-fancy text-3xl font-bold text-[var(--text-primary)] mb-3">{funnel.headline}</h1>
                <h2 className="text-lg text-[var(--text-secondary)] mb-4">{funnel.subheadline}</h2>
                <p className="text-[var(--text-tertiary)] max-w-lg mx-auto mb-6">{funnel.hero_section.hook_text}</p>
                <div className="inline-block bg-[var(--accent)] text-white px-8 py-3 rounded-lg font-medium">
                  {funnel.hero_section.cta_text}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">{funnel.hero_section.cta_subtext}</p>
              </div>

              {/* Pain Points */}
              <div className="card p-6">
                <span className="badge badge-error mb-3">PAIN POINTS</span>
                <h3 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-4">{funnel.pain_points.section_title}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {funnel.pain_points.points.map((p, i) => (
                    <div key={i} className="p-4 bg-[var(--status-error-light)] rounded-lg">
                      <h4 className="font-medium text-[var(--text-primary)] mb-1">{p.title}</h4>
                      <p className="text-sm text-[var(--text-secondary)]">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Solution */}
              <div className="card p-6">
                <span className="badge badge-success mb-3">SOLUTION</span>
                <h3 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-2">{funnel.solution.title}</h3>
                <p className="text-[var(--text-secondary)] mb-4">{funnel.solution.description}</p>
                <ul className="space-y-2">
                  {funnel.solution.bullet_points.map((bp, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-[var(--accent)] font-bold">✓</span>
                      <span className="text-[var(--text-primary)]">{bp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Social Proof */}
              <div className="card p-6">
                <span className="badge badge-warning mb-3">SOCIAL PROOF</span>
                <h3 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-4">{funnel.social_proof.section_title}</h3>
                <div className="grid grid-cols-3 gap-4">
                  {funnel.social_proof.testimonials.map((t, i) => (
                    <div key={i} className="p-4 bg-[var(--bg-subtle)] rounded-lg">
                      <p className="text-sm text-[var(--text-primary)] italic mb-3">&ldquo;{t.quote}&rdquo;</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">— {t.name}</p>
                      <p className="text-xs text-[var(--accent)]">{t.result}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Offer */}
              <div className="card p-6 border-2 border-[var(--accent-border)]">
                <span className="badge badge-accent mb-3">OFFER</span>
                <h3 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-2">{funnel.offer.title}</h3>
                <p className="text-[var(--text-secondary)] mb-4">{funnel.offer.description}</p>
                <div className="space-y-3 mb-6">
                  {funnel.offer.features.map((f, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-[var(--accent)] font-bold mt-0.5">✓</span>
                      <div>
                        <span className="font-medium text-[var(--text-primary)]">{f.name}</span>
                        <span className="text-[var(--text-secondary)]"> — {f.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center py-4">
                  <p className="text-[var(--text-muted)] line-through">{funnel.offer.price_anchor}</p>
                  <p className="text-2xl font-bold text-[var(--accent)]">{funnel.offer.actual_price}</p>
                  <div className="inline-block bg-[var(--accent)] text-white px-8 py-3 rounded-lg font-medium mt-3">
                    {funnel.offer.cta_text}
                  </div>
                  <p className="text-sm text-[var(--status-warning)] mt-2 font-medium">{funnel.offer.urgency_text}</p>
                </div>
              </div>

              {/* About */}
              <div className="card p-6">
                <span className="badge bg-[var(--bg-subtle)] text-[var(--text-primary)] mb-3">ABOUT</span>
                <h3 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-2">{funnel.about_section.title}</h3>
                <p className="text-[var(--text-secondary)] mb-4">{funnel.about_section.bio}</p>
                <div className="flex flex-wrap gap-2">
                  {funnel.about_section.credentials.map((c, i) => (
                    <span key={i} className="badge badge-success">{c}</span>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div className="card p-6">
                <span className="badge bg-[var(--bg-subtle)] text-[var(--text-primary)] mb-3">FAQ</span>
                <div className="space-y-4">
                  {funnel.faq.map((f, i) => (
                    <div key={i} className="border-b border-[var(--border-subtle)] pb-4 last:border-b-0">
                      <h4 className="font-medium text-[var(--text-primary)] mb-1">{f.question}</h4>
                      <p className="text-sm text-[var(--text-secondary)]">{f.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final CTA */}
              <div className="card p-8 text-center bg-[var(--text-primary)] text-white">
                <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs uppercase tracking-wider mb-4">FINAL CTA</span>
                <h3 className="font-fancy text-2xl font-bold mb-2">{funnel.final_cta.headline}</h3>
                <p className="text-white/70 mb-6">{funnel.final_cta.subheadline}</p>
                <div className="inline-block bg-[var(--accent)] text-white px-8 py-3 rounded-lg font-medium">
                  {funnel.final_cta.cta_text}
                </div>
                <p className="text-white/50 text-sm mt-3">{funnel.final_cta.guarantee_text}</p>
              </div>
            </div>

            {/* Copy HTML */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-[var(--text-primary)]">HTML Export</h4>
                <button
                  onClick={handleCopyHtml}
                  className={`btn-secondary text-sm ${copied ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
                >
                  {copied ? 'Copied!' : 'Copy HTML'}
                </button>
              </div>
              <pre className="bg-[var(--bg-subtle)] p-4 rounded-lg text-xs text-[var(--text-secondary)] overflow-x-auto max-h-48 overflow-y-auto">
                {funnelHtml?.slice(0, 500)}...
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
