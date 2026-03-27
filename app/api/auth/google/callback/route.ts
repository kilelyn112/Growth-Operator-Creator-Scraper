import { NextRequest, NextResponse } from 'next/server';
import { decrypt, encrypt } from '@/lib/email-crypto';
import { exchangeCodeForTokens, getGmailProfile } from '@/lib/gmail';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // User denied consent
    if (error) {
      console.error('Google OAuth error:', error);
      const url = new URL('/outreach?gmail_error=denied', request.url);
      return NextResponse.redirect(url);
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    // Decrypt state to get the userId
    let userId: number;
    try {
      userId = parseInt(decrypt(state), 10);
      if (isNaN(userId)) throw new Error('Invalid userId');
    } catch {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      console.warn('No refresh_token received — user may have already authorized this app');
    }

    // Get the user's Gmail address
    const profile = await getGmailProfile(tokens.access_token);

    // Encrypt tokens before storing
    const accessTokenEncrypted = encrypt(tokens.access_token);
    const refreshTokenEncrypted = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Check if this Gmail is already connected for this user
    const { data: existing } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('email_address', profile.emailAddress)
      .eq('auth_type', 'oauth_gmail')
      .single();

    if (existing) {
      // Update tokens on existing account
      await supabase
        .from('email_accounts')
        .update({
          oauth_access_token_encrypted: accessTokenEncrypted,
          oauth_refresh_token_encrypted: refreshTokenEncrypted || undefined,
          oauth_token_expires_at: tokenExpiresAt,
          oauth_scope: tokens.scope,
          is_active: true,
        })
        .eq('id', existing.id);
    } else {
      // Insert new OAuth email account
      const { error: insertError } = await supabase
        .from('email_accounts')
        .insert({
          user_id: userId,
          email_address: profile.emailAddress,
          display_name: null,
          auth_type: 'oauth_gmail',
          smtp_host: null,
          smtp_port: 587,
          smtp_username: null,
          smtp_password_encrypted: null,
          oauth_access_token_encrypted: accessTokenEncrypted,
          oauth_refresh_token_encrypted: refreshTokenEncrypted,
          oauth_token_expires_at: tokenExpiresAt,
          oauth_scope: tokens.scope,
          is_active: true,
          daily_send_limit: 100,
          sends_today: 0,
        });

      if (insertError) {
        console.error('Error inserting OAuth account:', insertError);
        throw new Error('Failed to save Gmail account');
      }
    }

    // Redirect back to outreach with success flag
    const redirectUrl = new URL('/outreach?gmail_connected=true', request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const redirectUrl = new URL('/outreach?gmail_error=callback_failed', request.url);
    return NextResponse.redirect(redirectUrl);
  }
}
