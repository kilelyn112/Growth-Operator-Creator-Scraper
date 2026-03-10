import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { analyzeCreator } from '@/lib/funnel-builder/analyzer';

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

// POST /api/funnel-builder/analyze — analyze a creator from their URL
export async function POST(request: NextRequest) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid URL' }, { status: 400 });
    }

    const analysis = await analyzeCreator(url);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error analyzing creator:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to analyze creator',
    }, { status: 500 });
  }
}
