import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers, getUserStats, createUser, updateUserMemberStatus } from '@/lib/users';

// Admin emails that can access admin routes
const ADMIN_EMAILS = ['kile@growthoperator.com', 'admin@creatorpairing.com', 'kilelyn8@gmail.com'];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, firstName, password, isMember } = await request.json();

    if (!email || !firstName || !password) {
      return NextResponse.json({ error: 'Email, first name, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const user = await createUser({
      email,
      first_name: firstName,
      password,
    });

    if (isMember) {
      await updateUserMemberStatus(user.id, true);
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Admin create user error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [users, stats] = await Promise.all([
      getAllUsers(),
      getUserStats(),
    ]);

    return NextResponse.json({ users, stats });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
