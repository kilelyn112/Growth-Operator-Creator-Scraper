import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserByEmail, updateUserMemberStatus } from '@/lib/users';

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
    const name = firstName || first_name || null;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Store the verified purchase email
    const { error: insertError } = await supabase
      .from('vip_purchases')
      .upsert(
        { email: normalizedEmail, first_name: name, source: 'fanbasis' },
        { onConflict: 'email' }
      );

    if (insertError) {
      console.error('Error storing VIP purchase:', insertError);
      return NextResponse.json({ error: 'Failed to store purchase' }, { status: 500 });
    }

    // If user already has an account, auto-upgrade them to member
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser && !existingUser.is_member) {
      await updateUserMemberStatus(existingUser.id, true);
    }

    return NextResponse.json({
      success: true,
      message: existingUser
        ? 'Purchase verified — existing user upgraded to VIP'
        : 'Purchase verified — user can now sign up at /vip',
      email: normalizedEmail,
      signupUrl: 'https://creatorpairing.com/vip',
    });
  } catch (error) {
    console.error('Zapier webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
