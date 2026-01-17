import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers, getUserStats } from '@/lib/users';

// Admin emails that can access admin routes
const ADMIN_EMAILS = ['kile@growthoperator.com', 'admin@creatorpairing.com', 'kilelyn8@gmail.com'];

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
