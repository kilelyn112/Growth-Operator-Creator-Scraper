'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
            creatorpairing.com
          </h1>
          <div className="flex items-center gap-4">
            <a href="#login" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Login
            </a>
            <Link href="/signup" className="btn-primary text-sm">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-fancy text-5xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
            Find creators in any niche<br />
            <span className="text-[var(--accent)]">in minutes</span>
          </h2>
          <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto">
            Stop scrolling through social media. We scan YouTube, Instagram, and X to find qualified creators with their contact info ready for outreach.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary text-lg px-8 py-4">
              Start 7-Day Free Trial
            </Link>
            <a href="#how-it-works" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg">
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="py-10 px-6 bg-[var(--bg-subtle)]">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border-2 border-[var(--border-default)] bg-[var(--bg-primary)] shadow-2xl overflow-hidden">
            {/* Fake browser bar */}
            <div className="bg-[var(--bg-subtle)] px-4 py-3 border-b border-[var(--border-default)] flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 ml-4">
                <div className="bg-[var(--bg-primary)] rounded-lg px-4 py-1.5 text-sm text-[var(--text-muted)] max-w-md">
                  creatorpairing.com
                </div>
              </div>
            </div>
            {/* App content preview */}
            <div className="p-8">
              {/* Radar Scanner */}
              <div className="flex justify-center mb-8">
                <div className="relative w-32 h-32">
                  {/* Radar circles */}
                  <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)] opacity-20"></div>
                  <div className="absolute inset-4 rounded-full border-2 border-[var(--accent)] opacity-30"></div>
                  <div className="absolute inset-8 rounded-full border-2 border-[var(--accent)] opacity-40"></div>
                  {/* Center dot */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[var(--accent)]"></div>
                  </div>
                  {/* Scanning line */}
                  <div className="absolute inset-0 origin-center animate-spin" style={{ animationDuration: '3s' }}>
                    <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-[var(--accent)] to-transparent origin-left"></div>
                  </div>
                  {/* Blips */}
                  <div className="absolute top-4 right-6 w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></div>
                  <div className="absolute bottom-8 left-4 w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute top-10 left-8 w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
              <p className="text-center text-sm text-[var(--text-muted)] mb-6">Scanning for creators...</p>

              <div className="grid grid-cols-3 gap-6">
                {/* Sample creator cards */}
                {[
                  { name: 'Alex Hormozi', platform: 'YouTube', followers: '2.4M' },
                  { name: 'Sarah Finance', platform: 'Instagram', followers: '890K' },
                  { name: 'TechBro Mike', platform: 'X', followers: '156K' },
                ].map((creator, i) => (
                  <div key={i} className="card p-4 border border-[var(--border-default)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] font-semibold">
                        {creator.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{creator.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{creator.platform}</div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{creator.followers} followers</span>
                      <span className="text-[var(--accent)] blur-[3px] select-none">email@hidden</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="badge badge-accent">47 creators found</span>
                  <span className="text-sm text-[var(--text-muted)]">32 with emails</span>
                </div>
                <button className="btn-secondary text-sm">Export CSV</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h3 className="font-fancy text-3xl font-semibold text-[var(--text-primary)] text-center mb-12">
            How it works
          </h3>
          <div className="grid grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Pick your niche',
                desc: 'Choose from 300+ niches or enter your own. Select YouTube, Instagram, or X.',
              },
              {
                step: '2',
                title: 'We scan for creators',
                desc: 'Our system finds creators in your niche and extracts their contact information.',
              },
              {
                step: '3',
                title: 'Export and reach out',
                desc: 'Download your list as a CSV with names, followers, emails, and profile links.',
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--accent)] text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">{item.title}</h4>
                <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-16 px-6 bg-[var(--bg-subtle)]">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-6">
            Supported Platforms
          </h3>
          <div className="flex items-center justify-center gap-12">
            {/* YouTube */}
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="font-medium">YouTube</span>
            </div>
            {/* Instagram */}
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span className="font-medium">Instagram</span>
            </div>
            {/* X */}
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="font-medium">X (Twitter)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section id="login" className="py-20 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h3 className="font-fancy text-2xl font-semibold text-[var(--text-primary)] mb-2">
              Already have an account?
            </h3>
            <p className="text-[var(--text-secondary)]">
              Sign in to continue
            </p>
          </div>

          <div className="card p-8">
            {error && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-[var(--status-error-light)] border border-[var(--status-error)]">
                <span className="text-[var(--status-error)] text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                New here?{' '}
                <Link href="/signup" className="text-[var(--accent)] hover:underline font-medium">
                  Start your free 7-day trial
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="text-center text-sm text-[var(--text-muted)]">
            Powered by{' '}
            <a href="https://growthoperator.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
              growthoperator.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
