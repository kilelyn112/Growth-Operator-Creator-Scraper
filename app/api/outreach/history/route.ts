import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSentEmailsByUserId } from '@/lib/db';

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

// GET /api/outreach/history — get sent email history
export async function GET(request: NextRequest) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const emails = await getSentEmailsByUserId(user.id);
    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error fetching email history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
