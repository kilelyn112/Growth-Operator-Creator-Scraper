'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type OnboardingStep = 'form' | 'booking';

const REVENUE_OPTIONS = [
  '$0 - $5K/mo',
  '$5K - $10K/mo',
  '$10K - $20K/mo',
  '$20K - $50K+/mo',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('form');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [service, setService] = useState('');
  const [target, setTarget] = useState('');
  const [revenue, setRevenue] = useState('');
  const [challenge, setChallenge] = useState('');
  const [triedSoFar, setTriedSoFar] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (!data.authenticated) {
        router.push('/login');
        return;
      }
      if (data.onboardingCompleted) {
        router.push('/');
        return;
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!service.trim() || !target.trim() || !revenue) return;
    setSubmitting(true);

    try {
      await fetch('/api/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_description: service,
          target_market: target,
          price_point: revenue,
          before_state: challenge,
          unique_mechanism: triedSoFar,
          credentials: [instagram, youtube].filter(Boolean),
          status: 'draft',
        }),
      });

      // Mark onboarding complete BEFORE going to booking
      await fetch('/api/onboarding/complete', { method: 'POST' });

      setStep('booking');
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">creatorpairing.com</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Client Acquisition Platform</p>
        </div>

        {/* STEP 1: INTAKE FORM */}
        {step === 'form' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="font-fancy text-3xl font-semibold text-[var(--text-primary)] mb-3">
                Let&apos;s get you set up
              </h2>
              <p className="text-[var(--text-secondary)]">
                Answer a few quick questions so we can tailor everything to your business.
              </p>
            </div>

            <div className="card p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  What service do you offer?
                </label>
                <textarea
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="e.g. I run Meta ads for ecommerce brands, I do email marketing for coaches, I build funnels for course creators..."
                  rows={3}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Who are you targeting?
                </label>
                <textarea
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. Fitness coaches with 10K+ followers, Shopify store owners doing $10K-50K/mo, SaaS founders..."
                  rows={2}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  How much are you currently making per month?
                </label>
                <div className="flex flex-wrap gap-2">
                  {REVENUE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setRevenue(opt)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        revenue === opt
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  What&apos;s your biggest challenge with getting clients?
                </label>
                <textarea
                  value={challenge}
                  onChange={(e) => setChallenge(e.target.value)}
                  placeholder="e.g. I can't find the right people to reach out to, my outreach gets no responses, I don't know how to position my offer..."
                  rows={3}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  What have you tried so far?
                </label>
                <textarea
                  value={triedSoFar}
                  onChange={(e) => setTriedSoFar(e.target.value)}
                  placeholder="e.g. Cold DMs on Instagram, cold email, Loom videos, content posting, nothing yet..."
                  rows={2}
                  className="w-full"
                />
              </div>

              {/* Social Profiles */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Your social profiles
                </label>
                <p className="text-xs text-[var(--text-muted)] mb-3">So we can audit your presence and help you optimize it.</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-secondary)] w-20">Instagram</span>
                    <input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="https://instagram.com/yourhandle"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-secondary)] w-20">YouTube</span>
                    <input
                      value={youtube}
                      onChange={(e) => setYoutube(e.target.value)}
                      placeholder="https://youtube.com/@yourchannel"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !service.trim() || !target.trim() || !revenue}
                className="btn-accent w-full text-lg py-3.5 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BOOK A CALL */}
        {step === 'booking' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="font-fancy text-3xl font-semibold text-[var(--text-primary)] mb-3">
                Book your strategy call
              </h2>
              <p className="text-[var(--text-secondary)]">
                Pick a time that works for you. We&apos;ll go through your offer and set up your acquisition system together.
              </p>
            </div>

            {/* Calendly Embed */}
            <div className="card overflow-hidden mb-6" style={{ minHeight: '700px' }}>
              <iframe
                src="https://calendly.com/kile-growthoperator/client-pairing-strategy-call"
                width="100%"
                height="700"
                frameBorder="0"
                style={{ border: 'none' }}
              />
            </div>

            <a
              href="/"
              className="btn-accent w-full text-lg py-3.5 block text-center"
            >
              Continue to Platform
            </a>
            <p className="text-center text-sm text-[var(--text-muted)] mt-3">
              You can always book later from your dashboard
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
