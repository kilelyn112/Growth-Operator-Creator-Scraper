'use client';

import { useState, useEffect } from 'react';

interface EmailAccount {
  id: number;
  email_address: string;
  display_name: string | null;
  sends_today: number;
  daily_send_limit: number;
}

interface SendEmailModalProps {
  creator: {
    id: number;
    displayName?: string;
    firstName?: string | null;
    email: string | null;
    channelName?: string;
    qualificationReason?: string;
  };
  onClose: () => void;
}

export default function SendEmailModal({ creator, onClose }: SendEmailModalProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchAccounts();
    // Pre-fill subject
    const name = creator.firstName || creator.displayName?.split(' ')[0] || '';
    setSubject(`Quick question for ${name}`);
    setBody(`Hey ${name},\n\nI came across your content and love what you're doing.\n\n`);
  }, [creator]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/email-accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
      if (data.accounts?.length > 0) {
        setSelectedAccountId(data.accounts[0].id);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !creator.email) return;

    setIsSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_account_id: selectedAccountId,
          to_email: creator.email,
          to_name: creator.displayName || creator.channelName || '',
          subject,
          body_html: body.replace(/\n/g, '<br>'),
          creator_id: creator.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult({ success: true, message: 'Email sent!' });
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-[var(--bg-primary)] rounded-2xl shadow-xl w-full max-w-lg border border-[var(--border-default)] animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <div>
            <h3 className="font-fancy text-lg font-semibold text-[var(--text-primary)]">
              Send to {creator.displayName || creator.channelName}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">{creator.email}</p>
          </div>
          <button onClick={onClose} className="icon-button">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Why They Fit Context */}
          {creator.qualificationReason && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--accent-light)] border border-[var(--accent-border)]">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[var(--accent)] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="text-xs font-medium text-[var(--accent)] uppercase tracking-wider">Why they&apos;re a fit</span>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{creator.qualificationReason}</p>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--text-secondary)] mb-4">No email accounts connected yet</p>
              <a href="/outreach" className="btn-primary text-sm">
                Connect Email Account
              </a>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">From</label>
                <select
                  value={selectedAccountId || ''}
                  onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.display_name ? `${acc.display_name} <${acc.email_address}>` : acc.email_address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  className="w-full h-36 resize-y text-sm"
                />
              </div>

              {result && (
                <div className={`px-4 py-2 rounded-lg border text-sm ${
                  result.success
                    ? 'bg-[var(--status-success-light)] border-[var(--status-success)] text-[var(--status-success)]'
                    : 'bg-[var(--status-error-light)] border-[var(--status-error)] text-[var(--status-error)]'
                }`}>
                  {result.message}
                </div>
              )}

              <button type="submit" disabled={isSending} className="btn-accent w-full">
                {isSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
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
      </div>
    </div>
  );
}
