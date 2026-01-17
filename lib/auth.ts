import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getUserById, User, getTrialStatus } from './users';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COOKIE_NAME = 'auth_token';

interface JWTPayload {
  userId: number;
  email: string;
}

// ============ TOKEN MANAGEMENT ============

export function createToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ============ COOKIE MANAGEMENT ============

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ============ SESSION MANAGEMENT ============

export interface AuthSession {
  user: User;
  trialStatus: {
    isActive: boolean;
    daysRemaining: number;
    hasAccess: boolean;
  };
}

export async function getSession(): Promise<AuthSession | null> {
  const token = await getAuthCookie();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await getUserById(payload.userId);
  if (!user) return null;

  const trialStatus = getTrialStatus(user);

  return { user, trialStatus };
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireAccess(): Promise<AuthSession> {
  const session = await requireAuth();
  if (!session.trialStatus.hasAccess) {
    throw new Error('Trial expired');
  }
  return session;
}
