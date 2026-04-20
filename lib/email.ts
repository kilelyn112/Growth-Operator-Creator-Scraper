// Server-only — do NOT import from client components
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { decrypt } from './email-crypto';
import { ensureValidToken, sendGmailMessage } from './gmail';
export { interpolateTemplate } from './email-constants';

export interface EmailAccount {
  id: number;
  user_id: number;
  email_address: string;
  display_name: string | null;
  smtp_host: string | null;
  smtp_port: number;
  smtp_username: string | null;
  smtp_password_encrypted: string | null;
  auth_type: 'smtp' | 'oauth_gmail';
  oauth_access_token_encrypted: string | null;
  oauth_refresh_token_encrypted: string | null;
  oauth_token_expires_at: string | null;
  oauth_scope: string | null;
  is_active: boolean;
  daily_send_limit: number;
  sends_today: number;
  sends_reset_at: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

function createTransport(account: EmailAccount) {
  if (!account.smtp_host || !account.smtp_username || !account.smtp_password_encrypted) {
    throw new Error('SMTP credentials are missing for this account');
  }
  const password = decrypt(account.smtp_password_encrypted);

  return nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    family: 4,
    auth: {
      user: account.smtp_username,
      pass: password,
    },
  } as SMTPTransport.Options);
}

// Send email via SMTP (existing path)
async function sendViaSmtp(account: EmailAccount, options: SendEmailOptions) {
  const transport = createTransport(account);
  const fromName = account.display_name || account.email_address;

  const result = await transport.sendMail({
    from: `"${fromName}" <${account.email_address}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ''),
    replyTo: options.replyTo || account.email_address,
  });

  return {
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
  };
}

// Send email via Gmail API (OAuth path)
async function sendViaGmailApi(account: EmailAccount, options: SendEmailOptions) {
  if (!account.oauth_access_token_encrypted || !account.oauth_refresh_token_encrypted) {
    throw new Error('OAuth tokens are missing for this Gmail account');
  }

  const accessToken = await ensureValidToken({
    id: account.id,
    oauth_access_token_encrypted: account.oauth_access_token_encrypted,
    oauth_refresh_token_encrypted: account.oauth_refresh_token_encrypted,
    oauth_token_expires_at: account.oauth_token_expires_at,
    oauth_scope: account.oauth_scope,
  });

  const fromName = account.display_name || account.email_address;
  const from = `"${fromName}" <${account.email_address}>`;

  const result = await sendGmailMessage(
    accessToken,
    from,
    options.to,
    options.subject,
    options.html,
  );

  return {
    messageId: result.id,
    accepted: [options.to],
    rejected: [] as string[],
  };
}

// Unified send — routes to Gmail API or SMTP based on auth_type
export async function sendEmail(account: EmailAccount, options: SendEmailOptions) {
  if (account.auth_type === 'oauth_gmail') {
    return sendViaGmailApi(account, options);
  }
  return sendViaSmtp(account, options);
}

export async function verifyConnection(account: {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_port === 465,
      family: 4,
      connectionTimeout: 10000,
      auth: {
        user: account.smtp_username,
        pass: account.smtp_password,
      },
    } as SMTPTransport.Options);

    await transport.verify();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to connect';
    // Detect Railway SMTP blocking
    if (msg.includes('ENETUNREACH') || msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      return {
        success: false,
        error: 'SMTP connection blocked by server. Use the "Connect Gmail" button above instead — it connects via Google OAuth and works everywhere.',
      };
    }
    return {
      success: false,
      error: msg,
    };
  }
}
