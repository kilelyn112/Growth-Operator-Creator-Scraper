'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          email: formData.email,
          phone: formData.phone || undefined,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Redirect to main app (full page reload to pick up cookie)
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="block">
            <h1 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
              creatorpairing.com
            </h1>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="font-fancy text-3xl font-semibold text-[var(--text-primary)] mb-3">
              Start Your Free Trial
            </h2>
            <p className="text-[var(--text-secondary)]">
              Get 7 days of full access to find qualified creators
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
                <label htmlFor="firstName" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter your first name"
                  className="w-full"
                  required
                  disabled={isLoading}
                />
              </div>

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
                <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Phone <span className="text-[var(--text-muted)]">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full"
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
                  placeholder="At least 6 characters"
                  className="w-full"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                  className="w-full"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full mt-6"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Already have an account?{' '}
                <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
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
