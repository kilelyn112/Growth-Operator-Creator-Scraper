import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { verifyConnection } from '@/lib/email';

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

// POST /api/email-accounts/verify — test SMTP connection
export async function POST(request: NextRequest) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { smtp_host, smtp_port, smtp_username, smtp_password } = await request.json();

    if (!smtp_host || !smtp_port || !smtp_username || !smtp_password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await verifyConnection({ smtp_host, smtp_port, smtp_username, smtp_password });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error verifying SMTP:', error);
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
