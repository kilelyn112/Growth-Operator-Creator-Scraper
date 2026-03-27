-- Add Gmail OAuth support to email_accounts table
-- Allows users to connect Gmail via OAuth instead of SMTP app passwords

-- Add auth_type column to distinguish SMTP vs OAuth accounts
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'smtp';

-- OAuth token storage (encrypted at application layer)
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS oauth_access_token_encrypted TEXT;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS oauth_refresh_token_encrypted TEXT;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS oauth_token_expires_at TIMESTAMPTZ;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS oauth_scope TEXT;

-- Make SMTP fields nullable so OAuth-only accounts don't need them
ALTER TABLE email_accounts ALTER COLUMN smtp_host DROP NOT NULL;
ALTER TABLE email_accounts ALTER COLUMN smtp_username DROP NOT NULL;
ALTER TABLE email_accounts ALTER COLUMN smtp_password_encrypted DROP NOT NULL;
