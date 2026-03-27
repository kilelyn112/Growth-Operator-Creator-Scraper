// Gmail OAuth integration — server-only
// Uses native fetch and Buffer, no additional npm packages needed.

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// ---------------------------------------------------------------------------
// 1. Build the Google OAuth consent URL
// ---------------------------------------------------------------------------
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',   // request refresh_token
    prompt: 'consent',        // always show consent so we get refresh_token
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// 2. Exchange the authorization code for access + refresh tokens
// ---------------------------------------------------------------------------
export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;       // seconds
  token_type: string;
  scope: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json() as Promise<GoogleTokens>;
}

// ---------------------------------------------------------------------------
// 3. Refresh an expired access token
// ---------------------------------------------------------------------------
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return res.json() as Promise<GoogleTokens>;
}

// ---------------------------------------------------------------------------
// 4. Get the authenticated user's email address from Gmail
// ---------------------------------------------------------------------------
export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export async function getGmailProfile(accessToken: string): Promise<GmailProfile> {
  const res = await fetch(`${GMAIL_API_BASE}/users/me/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail profile fetch failed: ${err}`);
  }

  return res.json() as Promise<GmailProfile>;
}

// ---------------------------------------------------------------------------
// 5. Send an email via the Gmail API (messages.send)
// ---------------------------------------------------------------------------
export async function sendGmailMessage(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<{ id: string; threadId: string }> {
  // Build a minimal MIME message
  const boundary = `boundary_${Date.now()}`;
  const mimeMessage = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    html.replace(/<[^>]*>/g, ''),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    html,
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  // Gmail API expects web-safe base64
  const raw = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch(`${GMAIL_API_BASE}/users/me/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail send failed: ${err}`);
  }

  return res.json() as Promise<{ id: string; threadId: string }>;
}

// ---------------------------------------------------------------------------
// 6. Ensure a valid (non-expired) access token for a stored account row
//    Returns the current access token or a refreshed one.
//    Caller is responsible for persisting updated tokens if refreshed.
// ---------------------------------------------------------------------------
import { decrypt, encrypt } from './email-crypto';
import { supabase } from './supabase';

export interface OAuthAccountRow {
  id: number;
  oauth_access_token_encrypted: string;
  oauth_refresh_token_encrypted: string;
  oauth_token_expires_at: string | null;
  oauth_scope: string | null;
}

export async function ensureValidToken(account: OAuthAccountRow): Promise<string> {
  const expiresAt = account.oauth_token_expires_at
    ? new Date(account.oauth_token_expires_at)
    : null;

  // If token is still valid (with 60s buffer), return it
  if (expiresAt && expiresAt.getTime() > Date.now() + 60_000) {
    return decrypt(account.oauth_access_token_encrypted);
  }

  // Otherwise refresh
  const refreshToken = decrypt(account.oauth_refresh_token_encrypted);
  const tokens = await refreshAccessToken(refreshToken);

  const newAccessEncrypted = encrypt(tokens.access_token);
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Persist refreshed token back to the database
  await supabase
    .from('email_accounts')
    .update({
      oauth_access_token_encrypted: newAccessEncrypted,
      oauth_token_expires_at: newExpiry,
    })
    .eq('id', account.id);

  return tokens.access_token;
}
