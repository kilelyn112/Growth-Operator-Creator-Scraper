'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Platform = 'youtube' | 'instagram' | 'x' | 'tiktok' | 'linkedin' | 'skool' | 'substack';

interface Creator {
  id: number;
  platform?: Platform;
  platformId?: string;
  username?: string | null;
  displayName?: string;
  profileUrl?: string;
  followers?: number;
  following?: number;
  postCount?: number;
  totalViews?: number;
  engagementRate?: number;
  bio?: string | null;
  externalUrl?: string | null;
  qualified: boolean;
  qualificationReason: string;
  email: string | null;
  firstName: string | null;
  channelId?: string;
  channelName?: string;
  channelUrl?: string;
  subscribers?: number;
  videoCount?: number;
}

interface EmailAccount {
  id: number;
  email_address: string;
  display_name: string | null;
  sends_today: number;
  daily_send_limit: number;
}

type SendStatus = 'pending' | 'sending' | 'sent' | 'failed';

interface CreatorSendState {
  status: SendStatus;
  error?: string;
}

interface BulkOutreachPanelProps {
  creators: Creator[];
  onClose: () => void;
  onCreatorsChange?: (creators: Creator[]) => void;
}

const TEMPLATE_VARIABLES = [
  { key: '{{first_name}}', label: 'First Name' },
  { key: '{{creator_name}}', label: 'Creator Name' },
  { key: '{{niche}}', label: 'Niche' },
  { key: '{{platform}}', label: 'Platform' },
  { key: '{{followers}}', label: 'Followers' },
];

export default function BulkOutreachPanel({ creators: initialCreators, onClose, onCreatorsChange }: BulkOutreachPanelProps) {
  const [creators, setCreators] = useState<Creator[]>(initialCreators);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [subject, setSubject] = useState('Quick question for {{first_name}}');
  const [body, setBody] = useState('Hey {{first_name}},\n\nI came across your content and love what you\'re doing.\n\n');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendStates, setSendStates] = useState<Record<number, CreatorSendState>>({});
  const [isClosing, setIsClosing] = useState(false);
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body');
  const [hoveredCreatorId, setHoveredCreatorId] = useState<number | null>(null);
  const [sendComplete, setSendComplete] = useState(false);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

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

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  }, [onClose]);

  const removeCreator = (id: number) => {
    const updated = creators.filter(c => c.id !== id);
    setCreators(updated);
    if (onCreatorsChange) onCreatorsChange(updated);
    if (updated.length === 0) {
      handleClose();
    }
  };

  const insertVariable = (variable: string) => {
    if (activeField === 'subject' && subjectRef.current) {
      const input = subjectRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = subject.slice(0, start) + variable + subject.slice(end);
      setSubject(newValue);
      // Restore cursor position after React re-render
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else if (activeField === 'body' && bodyRef.current) {
      const textarea = bodyRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const newValue = body.slice(0, start) + variable + body.slice(end);
      setBody(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getDisplayName = (c: Creator) => {
    if (c.username && (!c.displayName || c.displayName === 'Unknown')) {
      return `@${c.username}`;
    }
    return c.displayName || c.channelName || 'Unknown';
  };

  const getFollowers = (c: Creator) => c.followers || c.subscribers || 0;

  const handleSendAll = async () => {
    if (!selectedAccountId || creators.length === 0) return;

    setIsSending(true);
    setSendComplete(false);

    // Initialize all states to pending
    const initial: Record<number, CreatorSendState> = {};
    creators.forEach(c => { initial[c.id] = { status: 'pending' }; });
    setSendStates(initial);

    // Send one by one
    for (const creator of creators) {
      if (!creator.email) {
        setSendStates(prev => ({
          ...prev,
          [creator.id]: { status: 'failed', error: 'No email address' },
        }));
        continue;
      }

      setSendStates(prev => ({
        ...prev,
        [creator.id]: { status: 'sending' },
      }));

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

        setSendStates(prev => ({
          ...prev,
          [creator.id]: { status: 'sent' },
        }));
      } catch (err) {
        setSendStates(prev => ({
          ...prev,
          [creator.id]: {
            status: 'failed',
            error: err instanceof Error ? err.message : 'Failed to send',
          },
        }));
      }

      // Small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsSending(false);
    setSendComplete(true);
  };

  const sentCount = Object.values(sendStates).filter(s => s.status === 'sent').length;
  const failedCount = Object.values(sendStates).filter(s => s.status === 'failed').length;
  const sendingIndex = Object.values(sendStates).filter(s => s.status === 'sent' || s.status === 'sending' || s.status === 'failed').length;
  const progressPercent = creators.length > 0 ? (sendingIndex / creators.length) * 100 : 0;

  const hoveredCreator = hoveredCreatorId ? creators.find(c => c.id === hoveredCreatorId) : null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={handleClose}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${isClosing ? 'opacity-0' : 'animate-backdropIn'}`}
        style={{ transition: 'opacity 0.25s ease' }}
      />

      {/* Panel */}
      <div
        className={`ml-auto relative w-full max-w-4xl h-full bg-[var(--bg-primary)] shadow-2xl flex flex-col ${
          isClosing ? 'animate-slideOutRight' : 'animate-slideInRight'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] flex-shrink-0">
          <div>
            <h2 className="font-fancy text-xl font-semibold text-[var(--text-primary)]">
              Bulk Outreach
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Send personalized emails to {creators.length} creator{creators.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={handleClose} className="icon-button">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Creator List */}
          <div className="w-80 border-r border-[var(--border-default)] flex flex-col flex-shrink-0">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Recipients ({creators.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {creators.map((creator, index) => {
                const state = sendStates[creator.id];
                return (
                  <div
                    key={creator.id}
                    className="px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-colors cursor-default animate-staggerFadeIn"
                    style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
                    onMouseEnter={() => setHoveredCreatorId(creator.id)}
                    onMouseLeave={() => setHoveredCreatorId(null)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-[var(--text-primary)] truncate">
                            {getDisplayName(creator)}
                          </span>
                          {/* Status indicator */}
                          {state && (
                            <span className="flex-shrink-0">
                              {state.status === 'sending' && (
                                <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                              )}
                              {state.status === 'sent' && (
                                <div className="animate-scalePop">
                                  <svg className="w-4 h-4 text-[var(--status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                              {state.status === 'failed' && (
                                <div className="animate-scalePop" title={state.error}>
                                  <svg className="w-4 h-4 text-[var(--status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                          {creator.email}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-[var(--text-secondary)]">
                            {formatNumber(getFollowers(creator))} followers
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                          {creator.qualificationReason}
                        </p>
                      </div>
                      {!isSending && !sendComplete && (
                        <button
                          onClick={() => removeCreator(creator.id)}
                          className="flex-shrink-0 p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          title="Remove"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Why They Fit detail for hovered creator */}
            {hoveredCreator && hoveredCreator.qualificationReason && (
              <div className="px-4 py-3 border-t border-[var(--border-default)] bg-[var(--accent-light)] flex-shrink-0">
                <span className="text-xs font-medium text-[var(--accent)] uppercase tracking-wider">
                  Why {getDisplayName(hoveredCreator)} fits
                </span>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {hoveredCreator.qualificationReason}
                </p>
              </div>
            )}
          </div>

          {/* Right: Compose Form */}
          <div className="flex-1 flex flex-col min-w-0">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">Loading email accounts...</p>
                </div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <p className="text-[var(--text-secondary)] mb-4">No email accounts connected yet</p>
                  <a href="/outreach" className="btn-primary text-sm">
                    Connect Email Account
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                {/* Progress Bar (shown during/after sending) */}
                {(isSending || sendComplete) && (
                  <div className="mb-6 animate-fadeIn">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {isSending
                          ? `Sending ${sendingIndex}/${creators.length}...`
                          : `${sentCount} sent, ${failedCount} failed`
                        }
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                    <div className="progress-bar h-2 rounded-full">
                      <div
                        className="progress-bar-fill progress-bar-animated h-full rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    {sendComplete && (
                      <div className="mt-3 flex items-center gap-4 animate-fadeIn">
                        {sentCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-sm text-[var(--status-success)]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {sentCount} sent successfully
                          </span>
                        )}
                        {failedCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-sm text-[var(--status-error)]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {failedCount} failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* From Account */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">From</label>
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
                    disabled={isSending || sendComplete}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)]"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.display_name ? `${acc.display_name} <${acc.email_address}>` : acc.email_address}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Variables */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Template Variables
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        disabled={isSending || sendComplete}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent-border)] hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Subject</label>
                  <input
                    ref={subjectRef}
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onFocus={() => setActiveField('subject')}
                    disabled={isSending || sendComplete}
                    className="w-full"
                    placeholder="Email subject line..."
                  />
                </div>

                {/* Body */}
                <div className="mb-6 flex-1 flex flex-col">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Message</label>
                  <textarea
                    ref={bodyRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onFocus={() => setActiveField('body')}
                    disabled={isSending || sendComplete}
                    className="w-full flex-1 min-h-[200px] resize-y text-sm"
                    placeholder="Write your email template..."
                  />
                </div>

                {/* Send Button */}
                <div className="flex-shrink-0">
                  {sendComplete ? (
                    <button
                      onClick={handleClose}
                      className="btn-secondary w-full"
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      onClick={handleSendAll}
                      disabled={isSending || !selectedAccountId || creators.length === 0}
                      className="btn-accent w-full"
                    >
                      {isSending ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending {sendingIndex}/{creators.length}...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send to {creators.length} creator{creators.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
