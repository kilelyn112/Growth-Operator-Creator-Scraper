import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { encrypt } from '@/lib/email-crypto';
import { getGoogleAuthUrl } from '@/lib/gmail';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Encode the userId into the OAuth state param so we can verify on callback
    const state = encrypt(String(session.user.id));
    const url = getGoogleAuthUrl(state);

    return NextResponse.redirect(url);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Google OAuth start error:', msg);
    return NextResponse.json({ error: `Failed to start OAuth flow: ${msg}` }, { status: 500 });
  }
}
