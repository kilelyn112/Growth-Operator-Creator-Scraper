import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { deleteEmailAccount, getEmailAccountById } from '@/lib/db';

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

// GET /api/email-accounts/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const account = await getEmailAccountById(parseInt(id), user.id);
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { smtp_password_encrypted, ...safeAccount } = account;
  return NextResponse.json({ account: safeAccount });
}

// DELETE /api/email-accounts/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    await deleteEmailAccount(parseInt(id), user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
