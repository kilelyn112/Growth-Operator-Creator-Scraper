import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getEmailAccountById, incrementSendCount, logSentEmail, getCreatorById } from '@/lib/db';
import { sendEmail, interpolateTemplate } from '@/lib/email';
import type { EmailAccount } from '@/lib/email';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function getUserFromToken(request: NextRequest): { id: number; email: string } | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    return { id: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

// POST /api/outreach/send — send a single email
export async function POST(request: NextRequest) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { email_account_id, to_email, to_name, subject, body_html, creator_id } = await request.json();

    if (!email_account_id || !to_email || !subject || !body_html) {
      return NextResponse.json({ error: 'Missing required fields: email_account_id, to_email, subject, body_html' }, { status: 400 });
    }

    // Get the email account
    const account = await getEmailAccountById(email_account_id, user.id);
    if (!account) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    if (!account.is_active) {
      return NextResponse.json({ error: 'Email account is deactivated' }, { status: 400 });
    }

    // Check daily send limit — treat counter as 0 if the reset window has already passed
    // (the actual reset happens in incrementSendCount on the next successful send)
    const resetAt = account.sends_reset_at ? new Date(account.sends_reset_at) : null;
    const effectiveSendsToday = !resetAt || new Date() > resetAt ? 0 : account.sends_today;
    if (effectiveSendsToday >= account.daily_send_limit) {
      return NextResponse.json({
        error: `Daily send limit reached (${account.daily_send_limit}). Try again tomorrow.`,
      }, { status: 429 });
    }

    // If creator_id provided, get creator data for template interpolation
    let finalSubject = subject;
    let finalBody = body_html;

    if (creator_id) {
      const creator = await getCreatorById(creator_id);
      if (creator) {
        const vars: Record<string, string> = {
          creator_name: creator.display_name || '',
          first_name: creator.first_name || creator.display_name?.split(' ')[0] || '',
          channel_name: creator.display_name || '',
          niche: creator.niche || '',
          profile_url: creator.profile_url || '',
          platform: creator.platform || '',
          followers: String(creator.followers || 0),
          email: creator.email || '',
        };
        finalSubject = interpolateTemplate(subject, vars);
        finalBody = interpolateTemplate(body_html, vars);
      }
    }

    // Send the email
    const result = await sendEmail(account as unknown as EmailAccount, {
      to: to_email,
      subject: finalSubject,
      html: finalBody,
    });

    // Log it
    await logSentEmail({
      user_id: user.id,
      email_account_id: account.id,
      creator_id: creator_id || null,
      to_email,
      to_name: to_name || null,
      subject: finalSubject,
      body_html: finalBody,
      message_id: result.messageId,
      status: 'sent',
    });

    // Increment send counter
    await incrementSendCount(account.id);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', error);

    // Try to log the failure
    try {
      const body = await request.clone().json().catch(() => ({}));
      if (body.email_account_id) {
        await logSentEmail({
          user_id: user.id,
          email_account_id: body.email_account_id,
          to_email: body.to_email || 'unknown',
          subject: body.subject || 'unknown',
          body_html: body.body_html || '',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to send email',
    }, { status: 500 });
  }
}
