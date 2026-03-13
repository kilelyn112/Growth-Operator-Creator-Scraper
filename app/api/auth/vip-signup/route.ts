import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/users';
import { updateUserMemberStatus } from '@/lib/users';
import { createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, password } = body;

    if (!email || !firstName || !password) {
      return NextResponse.json(
        { error: 'Email, first name, and password are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create the account
    const user = await createUser({
      email,
      first_name: firstName,
      password,
    });

    // Set as full VIP member (no trial)
    await updateUserMemberStatus(user.id, true);

    // Create session
    const token = createToken(user);
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
      },
    });
  } catch (error) {
    console.error('VIP signup error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create account';

    if (message === 'Email already registered') {
      return NextResponse.json({ error: 'An account with this email already exists. Please log in instead.' }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
