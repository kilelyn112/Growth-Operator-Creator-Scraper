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
  hero_cta_text: string;
  hero_cta_subtext: string;
  video_section: { pre_video_text: string; post_video_text: string };
  who_this_is_for: { section_title: string; qualifiers: string[]; disqualifiers: string[] };
  social_proof: { section_title: string; testimonials: { name: string; result: string; quote: string }[] };
  application: { section_title: string; section_description: string; fields: { label: string; type: string; placeholder: string; options?: string[] }[]; submit_text: string };
  about_section: { title: string; bio: string; credentials: string[] };
  final_cta: { headline: string; subheadline: string; cta_text: string };
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
                Paste a YouTube or Instagram URL — we&apos;ll analyze their content and generate a call booking funnel
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
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
                  {funnel.creator_name}&apos;s Call Funnel
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Preview below — copy the HTML to paste into GoHighLevel, ClickFunnels, or any page builder
                </p>
              </div>
              <button
                onClick={handleCopyHtml}
                className={`btn-primary ${copied ? 'bg-[var(--accent)]' : ''}`}
              >
                {copied ? 'Copied!' : 'Copy Full HTML'}
              </button>
            </div>

            {/* ====== FUNNEL PREVIEW ====== */}
            <div className="rounded-xl overflow-hidden border border-[var(--border-default)] shadow-lg bg-white">

              {/* Hero — headline + subheadline + CTA */}
              <div className="text-center px-6 pt-14 pb-10">
                <div className="max-w-2xl mx-auto">
                  <h1 className="text-3xl md:text-[2.7rem] font-black text-black leading-tight mb-4" style={{ fontFamily: "'Poppins', 'Montserrat', sans-serif" }}>
                    {funnel.headline}
                  </h1>
                  <p className="text-base md:text-lg text-gray-500 mb-2">{funnel.subheadline}</p>
                  <p className="text-sm text-gray-400 mb-8">{funnel.hero_cta_subtext}</p>
                  <a href="#funnel-application" className="inline-block bg-[#7ed956] hover:brightness-110 text-white text-xl font-bold px-10 py-4 rounded-lg transition-all" style={{ boxShadow: '0 8px 24px -8px rgba(126,217,86,0.5)' }}>
                    {funnel.hero_cta_text}
                  </a>
                </div>
              </div>

              {/* Step 1: Watch Video */}
              <div className="text-center px-6 py-10 bg-white">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-xl md:text-2xl font-bold text-black mb-2" style={{ fontFamily: "'Poppins', 'Montserrat', sans-serif" }}>
                    Step 1: Watch The Video
                  </h2>
                  <p className="text-gray-500 mb-6">{funnel.video_section.pre_video_text}</p>
                  <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center mx-auto" style={{ aspectRatio: '16/9', maxWidth: '600px' }}>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-all">
                      <span className="text-white text-2xl ml-1">&#9654;</span>
                    </div>
                  </div>
                  <p className="text-gray-500 mt-5">{funnel.video_section.post_video_text}</p>
                </div>
              </div>

              {/* Step 2: Apply Below */}
              <div id="funnel-application" className="text-center px-6 py-10 bg-white">
                <div className="max-w-md mx-auto">
                  <h2 className="text-xl md:text-2xl font-bold text-black mb-1" style={{ fontFamily: "'Poppins', 'Montserrat', sans-serif" }}>
                    Step 2: Apply Below
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">{funnel.application.section_description}</p>
                  <div className="space-y-4 text-left">
                    {funnel.application.fields.map((f, i) => (
                      <div key={i}>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">{f.label}</label>
                        {f.type === 'select' && f.options ? (
                          <select className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-500 text-sm">
                            <option>{f.placeholder}</option>
                            {f.options.map((o, j) => (
                              <option key={j}>{o}</option>
                            ))}
                          </select>
                        ) : f.type === 'textarea' ? (
                          <textarea
                            placeholder={f.placeholder}
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder:text-gray-400"
                            readOnly
                          />
                        ) : (
                          <input
                            type={f.type}
                            placeholder={f.placeholder}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder:text-gray-400"
                            readOnly
                          />
                        )}
                      </div>
                    ))}
                    <button className="w-full bg-[#7ed956] hover:brightness-110 text-white font-bold py-4 rounded-lg text-lg transition-all mt-2" style={{ boxShadow: '0 8px 24px -8px rgba(126,217,86,0.5)' }}>
                      {funnel.application.submit_text}
                    </button>
                  </div>
                </div>
              </div>

              {/* Testimonials */}
              <div className="px-6 py-10 bg-white border-t border-gray-100">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl md:text-2xl font-bold text-black text-center mb-8" style={{ fontFamily: "'Poppins', 'Montserrat', sans-serif" }}>
                    {funnel.social_proof.section_title}
                  </h2>
                  <div className="grid md:grid-cols-3 gap-5">
                    {funnel.social_proof.testimonials.map((t, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <p className="text-gray-700 text-sm mb-3">&ldquo;{t.quote}&rdquo;</p>
                        <p className="font-bold text-sm text-black">{t.name}</p>
                        <p className="text-xs text-[#7ed956] font-semibold">{t.result}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Copy HTML bar */}
            <div className="card p-5 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-[var(--text-primary)]">Ready to use?</h4>
                <p className="text-sm text-[var(--text-secondary)]">Copy the HTML and paste into GoHighLevel, ClickFunnels, or any builder.</p>
              </div>
              <button
                onClick={handleCopyHtml}
                className={`btn-primary whitespace-nowrap ${copied ? 'bg-[var(--accent)]' : ''}`}
              >
                {copied ? 'Copied!' : 'Copy HTML'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
