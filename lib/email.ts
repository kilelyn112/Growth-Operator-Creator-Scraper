// Server-only — do NOT import from client components
import nodemailer from 'nodemailer';
import { decrypt } from './email-crypto';
export { interpolateTemplate } from './email-constants';

export interface EmailAccount {
  id: number;
  user_id: number;
  email_address: string;
  display_name: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password_encrypted: string;
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
  const password = decrypt(account.smtp_password_encrypted);

  return nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    auth: {
      user: account.smtp_username,
      pass: password,
    },
  });
}

export async function sendEmail(account: EmailAccount, options: SendEmailOptions) {
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
      auth: {
        user: account.smtp_username,
        pass: account.smtp_password,
      },
    });

    await transport.verify();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to connect',
    };
  }
}
