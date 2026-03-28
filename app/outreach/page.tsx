'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SMTP_PRESETS } from '@/lib/email-constants';

interface EmailAccount {
  id: number;
  email_address: string;
  display_name: string | null;
  smtp_host: string | null;
  smtp_port: number;
  smtp_username: string | null;
  auth_type: 'smtp' | 'oauth_gmail';
  is_active: boolean;
  daily_send_limit: number;
  sends_today: number;
  last_verified_at: string | null;
  created_at: string;
}

interface SentEmail {
  id: number;
  to_email: string;
  to_name: string | null;
  subject: string;
  status: string;
  sent_at: string;
}

interface UserSession {
  authenticated: boolean;
  user?: { id: number; email: string; firstName: string; isMember: boolean };
  trial?: { isActive: boolean; daysRemaining: number; hasAccess: boolean };
}

type View = 'accounts' | 'compose' | 'history';

export default function OutreachPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <OutreachContent />
    </Suspense>
  );
}

function OutreachContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('accounts');
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  // Email accounts
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // Add account form
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('gmail');
  const [formData, setFormData] = useState({
    email_address: '',
    display_name: '',
    smtp_host: SMTP_PRESETS.gmail.host,
    smtp_port: SMTP_PRESETS.gmail.port,
    smtp_username: '',
    smtp_password: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // Compose
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [composeData, setComposeData] = useState({
    to_email: '',
    to_name: '',
    subject: '',
    body_html: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // History
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    checkSession();
    // Check for Gmail OAuth callback params
    if (searchParams.get('gmail_connected') === 'true') {
      setGmailConnected(true);
      // Clear the URL param without reloading
      window.history.replaceState({}, '', '/outreach');
    }
    if (searchParams.get('gmail_error')) {
      setGmailError(
        searchParams.get('gmail_error') === 'denied'
          ? 'Gmail connection was cancelled.'
          : 'Failed to connect Gmail. Please try again.'
      );
      window.history.replaceState({}, '', '/outreach');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session?.authenticated) {
      fetchAccounts();
    }
  }, [session]);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (!data.authenticated) {
        router.push('/login');
        return;
      }
      setSession(data);
    } catch {
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await fetch('/api/email-accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
      if (data.accounts?.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data.accounts[0].id);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/outreach/history');
      const data = await res.json();
      setSentEmails(data.emails || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const config = SMTP_PRESETS[preset];
    if (config) {
      setFormData(prev => ({
        ...prev,
        smtp_host: config.host,
        smtp_port: config.port,
      }));
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError(null);
    setAddSuccess(false);

    try {
      const res = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAddSuccess(true);
      setShowAddForm(false);
      setFormData({
        email_address: '',
        display_name: '',
        smtp_host: SMTP_PRESETS.gmail.host,
        smtp_port: SMTP_PRESETS.gmail.port,
        smtp_username: '',
        smtp_password: '',
      });
      fetchAccounts();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add account');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Remove this email account?')) return;
    try {
      await fetch(`/api/email-accounts/${id}`, { method: 'DELETE' });
      fetchAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_account_id: selectedAccountId,
          ...composeData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSendResult({ success: true, message: 'Email sent successfully!' });
      setComposeData({ to_email: '', to_name: '', subject: '', body_html: '' });
    } catch (err) {
      setSendResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send email',
      });
    } finally {
      setIsSending(false);
    }
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
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Email Outreach
              </p>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-1 p-1 bg-[var(--bg-subtle)] rounded-lg">
              <a href="/" className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
                Creators
              </a>
              <span className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--text-primary)] text-white">
                Outreach
              </span>
            </nav>

            <div className="flex items-center gap-3">
              {session?.user && (
                <span className="text-sm text-[var(--text-secondary)]">
                  {session.user.firstName}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* View Tabs */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { id: 'accounts' as View, label: 'Email Accounts', icon: '🔗' },
            { id: 'compose' as View, label: 'Compose', icon: '✉️' },
            { id: 'history' as View, label: 'Sent History', icon: '📋' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setView(tab.id);
                if (tab.id === 'history') fetchHistory();
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                view === tab.id
                  ? 'bg-[var(--text-primary)] text-white shadow-sm'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== EMAIL ACCOUNTS VIEW ===== */}
        {view === 'accounts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
                  Connected Accounts
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Connect your email to send outreach directly from CreatorPairing
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/api/auth/google/start"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Connect Gmail
                </a>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="btn-primary text-sm"
                >
                  {showAddForm ? 'Cancel' : '+ Connect SMTP'}
                </button>
              </div>
            </div>

            {addSuccess && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--status-success-light)] border border-[var(--status-success)]">
                <span className="text-[var(--status-success)] text-sm">Email account connected successfully!</span>
              </div>
            )}

            {gmailConnected && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[var(--status-success-light)] border border-[var(--status-success)]">
                <span className="text-[var(--status-success)] text-sm">Gmail account connected via OAuth!</span>
                <button onClick={() => setGmailConnected(false)} className="text-[var(--status-success)] hover:opacity-70 text-sm font-medium">Dismiss</button>
              </div>
            )}

            {gmailError && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[var(--status-error-light)] border border-[var(--status-error)]">
                <span className="text-[var(--status-error)] text-sm">{gmailError}</span>
                <button onClick={() => setGmailError(null)} className="text-[var(--status-error)] hover:opacity-70 text-sm font-medium">Dismiss</button>
              </div>
            )}

            {/* Add Account Form */}
            {showAddForm && (
              <div className="card p-6 border-2 border-[var(--accent-border)]">
                <h3 className="font-fancy text-lg font-semibold text-[var(--text-primary)] mb-4">
                  Connect Email Account
                </h3>

                {/* Provider Presets */}
                <div className="flex gap-2 mb-6">
                  {Object.entries(SMTP_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handlePresetChange(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedPreset === key
                          ? 'bg-[var(--text-primary)] text-white'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                  ))}
                </div>

                {SMTP_PRESETS[selectedPreset] && (
                  <div className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-700">{SMTP_PRESETS[selectedPreset].note}</p>
                  </div>
                )}

                <form onSubmit={handleAddAccount} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email_address}
                        onChange={(e) => setFormData({ ...formData, email_address: e.target.value, smtp_username: e.target.value })}
                        placeholder="you@example.com"
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        placeholder="Your Name"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {selectedPreset === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          value={formData.smtp_host}
                          onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                          placeholder="smtp.example.com"
                          required
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          SMTP Port
                        </label>
                        <input
                          type="text"
                          value={formData.smtp_port}
                          onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                          placeholder="587"
                          required
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      {selectedPreset === 'gmail' ? 'App Password' : 'Password'}
                    </label>
                    <input
                      type="password"
                      value={formData.smtp_password}
                      onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                      placeholder={selectedPreset === 'gmail' ? 'xxxx xxxx xxxx xxxx' : 'Your email password'}
                      required
                      className="w-full"
                      autoComplete="new-password"
                    />
                  </div>

                  {addError && (
                    <div className="px-4 py-3 rounded-lg bg-[var(--status-error-light)] border border-[var(--status-error)]">
                      <p className="text-sm text-[var(--status-error)]">{addError}</p>
                    </div>
                  )}

                  <button type="submit" disabled={isAdding} className="btn-accent w-full">
                    {isAdding ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifying & Connecting...
                      </span>
                    ) : (
                      'Verify & Connect'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Account List */}
            {isLoadingAccounts ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-[var(--text-muted)]">Loading accounts...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-16 card">
                <svg className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="font-fancy text-xl font-semibold text-[var(--text-primary)] mb-2">
                  No email accounts connected
                </h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  Connect your Gmail, Outlook, or custom SMTP to start sending outreach
                </p>
                <button onClick={() => setShowAddForm(true)} className="btn-primary">
                  Connect Your First Email
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="card p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        account.is_active ? 'bg-[var(--status-success-light)] text-[var(--status-success)]' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                      }`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                          {account.display_name || account.email_address}
                          {account.auth_type === 'oauth_gmail' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <svg className="w-3 h-3" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                              </svg>
                              Gmail OAuth
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[var(--text-muted)]">
                          {account.email_address}{account.smtp_host ? ` · ${account.smtp_host}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {account.sends_today}/{account.daily_send_limit}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">sent today</div>
                      </div>
                      <span className={`badge ${account.is_active ? 'badge-success' : 'badge-error'}`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="icon-button text-[var(--text-muted)] hover:text-[var(--status-error)]"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== COMPOSE VIEW ===== */}
        {view === 'compose' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
                Compose Email
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Send outreach emails to creators. Use {'{{creator_name}}'}, {'{{first_name}}'}, {'{{niche}}'}, {'{{profile_url}}'} for personalization.
              </p>
            </div>

            {accounts.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-[var(--text-secondary)] mb-4">
                  Connect an email account first before sending
                </p>
                <button onClick={() => setView('accounts')} className="btn-primary">
                  Go to Accounts
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4">
                {/* From Account */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">From</label>
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-[var(--text-primary)]"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.display_name ? `${acc.display_name} <${acc.email_address}>` : acc.email_address}
                      </option>
                    ))}
                  </select>
                </div>

                {/* To */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">To Email</label>
                    <input
                      type="email"
                      value={composeData.to_email}
                      onChange={(e) => setComposeData({ ...composeData, to_email: e.target.value })}
                      placeholder="creator@example.com"
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Name (optional)</label>
                    <input
                      type="text"
                      value={composeData.to_name}
                      onChange={(e) => setComposeData({ ...composeData, to_name: e.target.value })}
                      placeholder="Creator's name"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Subject</label>
                  <input
                    type="text"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Quick question about your content..."
                    required
                    className="w-full"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Message</label>
                  <textarea
                    value={composeData.body_html}
                    onChange={(e) => setComposeData({ ...composeData, body_html: e.target.value })}
                    placeholder="Hey {{first_name}},&#10;&#10;I noticed your content in the {{niche}} space..."
                    required
                    className="w-full h-48 resize-y"
                  />
                </div>

                {sendResult && (
                  <div className={`px-4 py-3 rounded-lg border ${
                    sendResult.success
                      ? 'bg-[var(--status-success-light)] border-[var(--status-success)]'
                      : 'bg-[var(--status-error-light)] border-[var(--status-error)]'
                  }`}>
                    <p className={`text-sm ${sendResult.success ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                      {sendResult.message}
                    </p>
                  </div>
                )}

                <button type="submit" disabled={isSending} className="btn-accent w-full">
                  {isSending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Email
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ===== HISTORY VIEW ===== */}
        {view === 'history' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-fancy text-2xl font-semibold text-[var(--text-primary)]">
                Sent Emails
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Track all outreach emails you&apos;ve sent
              </p>
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : sentEmails.length === 0 ? (
              <div className="card p-12 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-[var(--text-secondary)]">No emails sent yet</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">To</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentEmails.map((email) => (
                      <tr key={email.id}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-[var(--text-primary)]">{email.to_name || email.to_email}</div>
                          {email.to_name && <div className="text-xs text-[var(--text-muted)]">{email.to_email}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{email.subject}</td>
                        <td className="px-6 py-4">
                          <span className={`badge ${email.status === 'sent' ? 'badge-success' : 'badge-error'}`}>
                            {email.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                          {new Date(email.sent_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
