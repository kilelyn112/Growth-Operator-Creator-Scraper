import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { generateFunnel, exportFunnelAsHTML } from '@/lib/funnel-builder/generator';
import type { CreatorAnalysis } from '@/lib/funnel-builder/analyzer';

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

// POST /api/funnel-builder/generate — generate a funnel from an analysis
export async function POST(request: NextRequest) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { analysis, target_platform } = await request.json();

    if (!analysis) {
      return NextResponse.json({ error: 'Please provide a creator analysis' }, { status: 400 });
    }

    const funnel = await generateFunnel(
      analysis as CreatorAnalysis,
      target_platform || 'generic'
    );

    const html = exportFunnelAsHTML(funnel);

    return NextResponse.json({ funnel, html });
  } catch (error) {
    console.error('Error generating funnel:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate funnel',
    }, { status: 500 });
  }
}
