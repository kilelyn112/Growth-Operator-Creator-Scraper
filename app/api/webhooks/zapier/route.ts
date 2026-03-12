import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createUser, getUserByEmail, updateUserMemberStatus } from '@/lib/users';

function generatePassword(): string {
  // Generate a readable 12-char password: letters + digits
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization');
    const webhookSecret = process.env.ZAPIER_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('ZAPIER_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const providedSecret = authHeader?.replace('Bearer ', '');
    if (providedSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, firstName, first_name } = body;
    const name = firstName || first_name || 'VIP Member';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      // User already has an account — just upgrade to member
      if (!existingUser.is_member) {
        await updateUserMemberStatus(existingUser.id, true);
      }

      return NextResponse.json({
        success: true,
        action: 'upgraded',
        message: 'Existing user upgraded to VIP member',
        user: {
          email: existingUser.email,
          firstName: existingUser.first_name,
          isNew: false,
        },
      });
    }

    // New user — create account with generated password
    const password = generatePassword();

    const user = await createUser({
      email,
      first_name: name,
      password,
    });

    // Immediately upgrade to full member (they paid)
    await updateUserMemberStatus(user.id, true);

    return NextResponse.json({
      success: true,
      action: 'created',
      message: 'New VIP member account created',
      user: {
        email: user.email,
        firstName: user.first_name,
        isNew: true,
      },
      // Zapier uses these to send the welcome email
      credentials: {
        email: user.email,
        password,
        loginUrl: 'https://creatorpairing.com/login',
      },
    });
  } catch (error) {
    console.error('Zapier webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
