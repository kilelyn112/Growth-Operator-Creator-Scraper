-- ============================================
-- Phase 1A: Email Outreach Infrastructure
-- ============================================

-- Email accounts connected by users
CREATE TABLE IF NOT EXISTS email_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  display_name TEXT,
  -- SMTP config
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_username TEXT NOT NULL,
  smtp_password_encrypted TEXT NOT NULL,
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  daily_send_limit INTEGER DEFAULT 50,
  sends_today INTEGER DEFAULT 0,
  sends_reset_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email_address)
);

-- Sent emails log for tracking
CREATE TABLE IF NOT EXISTS sent_emails (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id BIGINT NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  creator_id BIGINT REFERENCES creators(id),
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  -- Tracking
  message_id TEXT,
  status TEXT DEFAULT 'sent',
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for now, same pattern as existing tables)
CREATE POLICY "Allow all on email_accounts" ON email_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sent_emails" ON sent_emails FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX idx_sent_emails_user_id ON sent_emails(user_id);
CREATE INDEX idx_sent_emails_email_account_id ON sent_emails(email_account_id);
