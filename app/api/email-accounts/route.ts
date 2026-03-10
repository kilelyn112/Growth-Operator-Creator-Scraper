import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getEmailAccountsByUserId, createEmailAccount } from '@/lib/db';
import { encrypt } from '@/lib/email-crypto';
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

// GET /api/email-accounts — list user's email accounts
export async function GET(request: NextRequest) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const accounts = await getEmailAccountsByUserId(user.id);
    // Strip encrypted passwords from response
    const safeAccounts = accounts.map(({ smtp_password_encrypted, ...rest }) => rest);
    return NextResponse.json({ accounts: safeAccounts });
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch email accounts' }, { status: 500 });
  }
}

// POST /api/email-accounts — add a new email account
export async function POST(request: NextRequest) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { email_address, display_name, smtp_host, smtp_port, smtp_username, smtp_password } = body;

    if (!email_address || !smtp_host || !smtp_port || !smtp_username || !smtp_password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify SMTP connection first
    const verification = await verifyConnection({
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
    });

    if (!verification.success) {
      return NextResponse.json({
        error: `SMTP connection failed: ${verification.error}`,
      }, { status: 400 });
    }

    // Encrypt password and save
    const encrypted = encrypt(smtp_password);
    const account = await createEmailAccount({
      user_id: user.id,
      email_address,
      display_name: display_name || null,
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password_encrypted: encrypted,
    });

    // Return without encrypted password
    const { smtp_password_encrypted, ...safeAccount } = account;
    return NextResponse.json({ account: safeAccount }, { status: 201 });
  } catch (error) {
    console.error('Error creating email account:', error);
    const message = error instanceof Error ? error.message : 'Failed to create email account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
